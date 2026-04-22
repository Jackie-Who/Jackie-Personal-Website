import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  AUTHORS,
  CHANNELS,
  type Attachment,
  type Author,
  type Button as ScriptButton,
  type ChannelScript,
  type CostModel,
  type DynamicChannel,
  type FeatureHighlight,
  type MessageBody,
  type PersonalityEra,
  type ReplyRef,
  type Step,
} from './discord-scripts';
import './DiscordDemo.css';

// ------------------------------------------------------------
// Chat-state model — built up by the script runner. Each entry
// is either a rendered message, a typing indicator, a command
// card, a system message, or an error embed.
// ------------------------------------------------------------

interface MessageEntry {
  kind: 'message';
  id: string;
  author: Author;
  body: MessageBody[];
  attachment?: Attachment;
  replyRef?: ReplyRef;
  highlight?: FeatureHighlight;
  buttons?: ScriptButton[];
  buttonState?: 'pending' | 'confirmed' | 'cancelled' | 'undone';
  undoTarget?: 'sidebar-channels' | 'emoji-party';
  timestamp: string;
}

interface TypingEntry {
  kind: 'typing';
  id: string;
  author: Author;
  webSearch?: boolean;
}

interface CommandCardEntry {
  kind: 'command-card';
  id: string;
  title: string;
  body: MessageBody[];
  highlight?: FeatureHighlight;
  timestamp: string;
}

interface SystemMessageEntry {
  kind: 'system';
  id: string;
  title: string;
  body?: MessageBody[];
  icon?: string;
}

interface ErrorEmbedEntry {
  kind: 'error-embed';
  id: string;
  title: string;
  fields: { label: string; value: string }[];
  trace?: string;
  highlight?: FeatureHighlight;
}

type ChatEntry =
  | MessageEntry
  | TypingEntry
  | CommandCardEntry
  | SystemMessageEntry
  | ErrorEmbedEntry;

// ------------------------------------------------------------
// Utility: timestamp for rendered messages (for flavor)
// ------------------------------------------------------------
function nowHM(): string {
  const d = new Date();
  const h = d.getHours() % 12 || 12;
  const m = d.getMinutes().toString().padStart(2, '0');
  const ap = d.getHours() >= 12 ? 'PM' : 'AM';
  return `Today at ${h}:${m} ${ap}`;
}

// ------------------------------------------------------------
// Script runner
//
// Schedules steps via setTimeout. On `await-button`, scheduling
// pauses until the visitor clicks a button or the timeout fires.
// Resume restarts scheduling from the next step with t rebased
// to the resume moment (so post-await t values are treated as
// "ms from button-press").
// ------------------------------------------------------------

interface RunnerHandles {
  teardown: () => void;
  confirm: () => void;
  cancel: () => void;
}

interface RunnerCallbacks {
  setEntries: (fn: (prev: ChatEntry[]) => ChatEntry[]) => void;
  addSidebar: (chs: DynamicChannel[]) => void;
  removeSidebar: (names: string[]) => void;
  addCost: (amount: number, model: CostModel) => void;
  setAwaiting: (label: string | null) => void;
  onComplete: () => void;
}

function runScript(
  script: ChannelScript,
  cbs: RunnerCallbacks,
): RunnerHandles {
  const timers: number[] = [];
  let idx = 0;
  let cancelled = false;

  // Local helpers to stash the current await resolvers so outer
  // clicks/timeouts can call them.
  let onConfirm: (() => void) | null = null;
  let onCancel: (() => void) | null = null;

  const runBatch = (baseT: number) => {
    while (idx < script.steps.length) {
      const step = script.steps[idx];

      if (step.kind === 'await-button') {
        cbs.setAwaiting(step.label);
        const thisIdx = idx;

        onConfirm = () => {
          if (cancelled) return;
          onConfirm = null;
          onCancel = null;
          cbs.setAwaiting(null);
          // Resolve only the message whose button row has a Confirm in it —
          // leave Undo-only rows intact so the visitor can click them later.
          // Take the *last* matching row so we don't steal state from an
          // earlier (already-confirmed-but-buttons-still-showing) row.
          cbs.setEntries((prev) => {
            let lastMatch = -1;
            for (let k = prev.length - 1; k >= 0; k -= 1) {
              const e = prev[k];
              if (
                e.kind === 'message' &&
                e.buttonState === 'pending' &&
                e.buttons?.some((b) => b.style === 'confirm')
              ) {
                lastMatch = k;
                break;
              }
            }
            if (lastMatch === -1) return prev;
            return prev.map((e, k) =>
              k === lastMatch
                ? { ...e, buttonState: 'confirmed' as const, buttons: undefined }
                : e,
            );
          });
          idx = thisIdx + 1;
          runBatch(0);
        };

        onCancel = () => {
          if (cancelled) return;
          onConfirm = null;
          onCancel = null;
          cbs.setAwaiting(null);
          // Same scoping as confirm — only flip the latest Confirm/Cancel row.
          cbs.setEntries((prev) => {
            let lastMatch = -1;
            for (let k = prev.length - 1; k >= 0; k -= 1) {
              const e = prev[k];
              if (
                e.kind === 'message' &&
                e.buttonState === 'pending' &&
                e.buttons?.some((b) => b.style === 'cancel')
              ) {
                lastMatch = k;
                break;
              }
            }
            if (lastMatch === -1) return prev;
            return prev.map((e, k) =>
              k === lastMatch
                ? { ...e, buttonState: 'cancelled' as const, buttons: undefined }
                : e,
            );
          });
          // Inject a cancellation bot-msg.
          cbs.setEntries((prev) => [
            ...prev,
            {
              kind: 'message', id: `cancel-${thisIdx}`, author: 'bot',
              body: [{ kind: 'text', value: 'Cancelled — no changes made.' }],
              timestamp: nowHM(),
            },
          ]);
          // End the script early; visitor can replay.
          cbs.onComplete();
        };

        // Auto-resolve as confirm after timeoutMs so the demo doesn't stall.
        // IMPORTANT: capture *this* await's onConfirm. If the visitor
        // clicks Confirm before the timeout fires, the script advances
        // to the NEXT await-button, replacing `onConfirm` with a new
        // resolver. A stale timer from a prior await that fires after
        // that point would otherwise trigger the wrong resolver and
        // advance the script a step too far — skipping past the user's
        // next Confirm click. Gating on reference identity prevents it.
        const timeoutMs = step.timeoutMs ?? 15000;
        const capturedConfirm = onConfirm;
        timers.push(window.setTimeout(() => {
          if (cancelled) return;
          if (onConfirm === capturedConfirm && capturedConfirm) capturedConfirm();
        }, timeoutMs));

        return;
      }

      const delay = Math.max(0, step.t - baseT);
      const capturedStep = step;
      const thisIdx = idx;
      timers.push(window.setTimeout(() => {
        if (cancelled) return;
        applyStepEffect(capturedStep, thisIdx, cbs);
      }, delay));
      idx += 1;
    }

    // End of script — fire onComplete after the last step's t.
    timers.push(window.setTimeout(() => {
      if (cancelled) return;
      cbs.onComplete();
    }, 400));
  };

  runBatch(0);

  return {
    teardown: () => {
      cancelled = true;
      for (const id of timers) window.clearTimeout(id);
      onConfirm = null;
      onCancel = null;
    },
    confirm: () => { if (onConfirm) onConfirm(); },
    cancel: () => { if (onCancel) onCancel(); },
  };
}

function applyStepEffect(step: Step, idx: number, cbs: RunnerCallbacks) {
  const ts = nowHM();

  switch (step.kind) {
    case 'user-msg': {
      cbs.setEntries((prev) => [
        ...stripTyping(prev, step.author),
        {
          kind: 'message', id: `m-${idx}`, author: step.author,
          body: step.body, attachment: step.attachment,
          replyRef: step.replyRef, highlight: step.highlight,
          timestamp: ts,
        },
      ]);
      return;
    }
    case 'typing-start': {
      cbs.setEntries((prev) => [
        ...stripTyping(prev, step.author),
        { kind: 'typing', id: `t-${idx}`, author: step.author, webSearch: step.webSearch },
      ]);
      return;
    }
    case 'typing-stop': {
      cbs.setEntries((prev) => stripTyping(prev, step.author));
      return;
    }
    case 'bot-msg': {
      cbs.setEntries((prev) => [
        ...stripTyping(prev, step.author),
        {
          kind: 'message', id: `m-${idx}`, author: step.author,
          body: step.body, replyRef: step.replyRef, highlight: step.highlight,
          buttons: step.buttons,
          buttonState: step.buttons ? 'pending' : undefined,
          undoTarget: step.buttons?.some((b) => b.style === 'undo')
            ? (idx < 20 ? 'sidebar-channels' : 'emoji-party')
            : undefined,
          timestamp: ts,
        },
      ]);
      return;
    }
    case 'command-card': {
      cbs.setEntries((prev) => [
        ...prev,
        { kind: 'command-card', id: `c-${idx}`, title: step.title, body: step.body, highlight: step.highlight, timestamp: ts },
      ]);
      return;
    }
    case 'system-msg': {
      cbs.setEntries((prev) => [
        ...prev,
        { kind: 'system', id: `s-${idx}`, title: step.title, body: step.body, icon: step.icon },
      ]);
      return;
    }
    case 'error-embed': {
      cbs.setEntries((prev) => [
        ...prev,
        { kind: 'error-embed', id: `e-${idx}`, title: step.title, fields: step.fields, trace: step.trace, highlight: step.highlight },
      ]);
      return;
    }
    case 'sidebar-add': {
      cbs.addSidebar(step.channels);
      return;
    }
    case 'sidebar-remove': {
      cbs.removeSidebar(step.channels);
      return;
    }
    case 'cost-tick': {
      cbs.addCost(step.amount, step.model);
      return;
    }
    case 'button-resolve': {
      // Handled by onConfirm/onCancel directly; no-op here.
      return;
    }
  }
}

function stripTyping(prev: ChatEntry[], author: Author): ChatEntry[] {
  return prev.filter((e) => !(e.kind === 'typing' && e.author === author));
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function DiscordDemo() {
  const [activeId, setActiveId] = useState<string>(CHANNELS[0].id);
  const [activeEraId, setActiveEraId] = useState<string | null>(null);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [awaiting, setAwaiting] = useState<string | null>(null);
  const [dynamicChannels, setDynamicChannels] = useState<DynamicChannel[]>([]);
  const [expandedHighlight, setExpandedHighlight] = useState<string | null>(null);
  const [cost, setCost] = useState<{ total: number; haiku: number; sonnet: number }>(
    { total: 0, haiku: 0, sonnet: 0 },
  );
  const [replayTick, setReplayTick] = useState(0);

  const runnerRef = useRef<RunnerHandles | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const active = useMemo(
    () => CHANNELS.find((c) => c.id === activeId) ?? CHANNELS[0],
    [activeId],
  );

  // Resolve which script to play — personality supports eras.
  const activeScript: ChannelScript = useMemo(() => {
    if (active.eras && active.eras.length > 0) {
      const eraId = activeEraId ?? active.eras[active.eras.length - 1].id;
      const era = active.eras.find((e) => e.id === eraId) ?? active.eras[active.eras.length - 1];
      return { ...active, steps: era.steps, duration: era.duration };
    }
    return active;
  }, [active, activeEraId]);

  // Default-select the last era when entering a channel that has eras.
  useEffect(() => {
    if (active.eras && active.eras.length > 0 && activeEraId === null) {
      setActiveEraId(active.eras[active.eras.length - 1].id);
    }
    if (!active.eras) {
      setActiveEraId(null);
    }
  }, [active, activeEraId]);

  // Run script on channel / era change / replay
  useEffect(() => {
    if (runnerRef.current) {
      runnerRef.current.teardown();
      runnerRef.current = null;
    }
    setEntries([]);
    setAwaiting(null);
    setDynamicChannels([]);
    setExpandedHighlight(null);
    setCost({ total: 0, haiku: 0, sonnet: 0 });
    setRunning(true);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      // Collapse the script into final entries synchronously, skipping typing + awaits.
      const synthEntries: ChatEntry[] = [];
      const synthDynamic: DynamicChannel[] = [];
      let synthCost = { total: 0, haiku: 0, sonnet: 0 };
      for (let i = 0; i < activeScript.steps.length; i += 1) {
        const step = activeScript.steps[i];
        if (step.kind === 'typing-start' || step.kind === 'typing-stop') continue;
        if (step.kind === 'await-button' || step.kind === 'button-resolve') continue;
        if (step.kind === 'sidebar-add') { synthDynamic.push(...step.channels); continue; }
        if (step.kind === 'sidebar-remove') continue;
        if (step.kind === 'cost-tick') {
          synthCost = {
            total: synthCost.total + step.amount,
            haiku: synthCost.haiku + (step.model === 'haiku' ? 1 : 0),
            sonnet: synthCost.sonnet + (step.model === 'sonnet' ? 1 : 0),
          };
          continue;
        }
        // Apply via a minimal version of applyStepEffect
        applyStepEffect(step, i, {
          setEntries: (fn) => {
            const next = fn(synthEntries);
            synthEntries.length = 0;
            for (const e of next) synthEntries.push(e);
          },
          addSidebar: (chs) => { synthDynamic.push(...chs); },
          removeSidebar: () => {},
          addCost: () => {},
          setAwaiting: () => {},
          onComplete: () => {},
        });
      }
      setEntries(synthEntries.filter((e) => e.kind !== 'typing'));
      setDynamicChannels(synthDynamic);
      setCost(synthCost);
      setRunning(false);
      return;
    }

    runnerRef.current = runScript(activeScript, {
      setEntries,
      addSidebar: (chs) => setDynamicChannels((prev) => [...prev, ...chs]),
      removeSidebar: (names) => setDynamicChannels((prev) => prev.filter((c) => !names.includes(c.name))),
      addCost: (amount, model) => setCost((prev) => ({
        total: prev.total + amount,
        haiku: prev.haiku + (model === 'haiku' ? 1 : 0),
        sonnet: prev.sonnet + (model === 'sonnet' ? 1 : 0),
      })),
      setAwaiting,
      onComplete: () => setRunning(false),
    });

    return () => {
      if (runnerRef.current) {
        runnerRef.current.teardown();
        runnerRef.current = null;
      }
    };
  }, [activeScript, replayTick]);

  // Auto-scroll chat on new entries
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [entries]);

  const handleReplay = useCallback(() => {
    setReplayTick((t) => t + 1);
  }, []);

  const handleConfirm = useCallback(() => {
    runnerRef.current?.confirm();
  }, []);

  const handleCancel = useCallback(() => {
    runnerRef.current?.cancel();
  }, []);

  // Undo clicks: trigger the appropriate undo action based on undoTarget.
  const handleUndo = useCallback((entryId: string, target?: 'sidebar-channels' | 'emoji-party') => {
    if (target === 'sidebar-channels') {
      setDynamicChannels([]);
      setEntries((prev) => {
        const next = prev.map((e) =>
          e.kind === 'message' && e.id === entryId
            ? { ...e, buttons: undefined, buttonState: 'undone' as const }
            : e,
        );
        return [
          ...next,
          {
            kind: 'message', id: `undo-${entryId}`, author: 'bot',
            body: [{ kind: 'text', value: '↩ Undone — removed category `Events` and 3 channels.' }],
            timestamp: nowHM(),
          } as MessageEntry,
        ];
      });
    } else if (target === 'emoji-party') {
      setEntries((prev) => {
        const next = prev.map((e) =>
          e.kind === 'message' && e.id === entryId
            ? { ...e, buttons: undefined, buttonState: 'undone' as const }
            : e,
        );
        return [
          ...next,
          {
            kind: 'message', id: `undo-${entryId}`, author: 'bot',
            body: [{ kind: 'text', value: '↩ Undone — removed emoji :party:.' }],
            timestamp: nowHM(),
          } as MessageEntry,
        ];
      });
    }
  }, []);

  const handleToggleHighlight = useCallback((id: string) => {
    setExpandedHighlight((cur) => (cur === id ? null : id));
  }, []);

  return (
    <div
      className="disc-demo"
      role="region"
      aria-label="Discord app preview — interactive bot demo"
    >
      <div className="disc-window">
        <DiscordTitleBar />

        <div className="disc-body">
          <DiscordServerSidebar />
          <DiscordChannelList
            channels={CHANNELS}
            activeId={activeId}
            onSelect={setActiveId}
            dynamicChannels={dynamicChannels}
          />
          <DiscordChatArea
            script={activeScript}
            channel={active}
            entries={entries}
            scrollRef={scrollRef}
            running={running}
            awaiting={awaiting}
            expandedHighlight={expandedHighlight}
            onReplay={handleReplay}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            onUndo={handleUndo}
            onToggleHighlight={handleToggleHighlight}
            eras={active.eras}
            activeEraId={activeEraId}
            onSelectEra={setActiveEraId}
            cost={cost}
          />
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Window chrome
// ------------------------------------------------------------
function DiscordTitleBar() {
  return (
    <div className="disc-titlebar" aria-hidden="true">
      <div className="disc-traffic">
        <span className="disc-traffic-dot" style={{ background: '#ed4245' }} />
        <span className="disc-traffic-dot" style={{ background: '#fee75c' }} />
        <span className="disc-traffic-dot" style={{ background: '#57f287' }} />
      </div>
      <div className="disc-titlebar-name">DiVA&apos;s Server — Discord</div>
      <div className="disc-titlebar-spacer" />
    </div>
  );
}

function DiscordServerSidebar() {
  return (
    <nav className="disc-servers" aria-label="Servers">
      <div className="disc-server-home">
        <div className="disc-server-home-glyph">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path fill="#fff" d="M19.73 4.87A18.2 18.2 0 0 0 15.3 3.5l-.21.39a16.96 16.96 0 0 0-5.18 0l-.21-.39a18.2 18.2 0 0 0-4.43 1.37A19.13 19.13 0 0 0 2 14.1l.04.17a18.36 18.36 0 0 0 5.48 2.76l.44-.61a13.23 13.23 0 0 1-2.04-.98l.18-.14a13.2 13.2 0 0 0 11.8 0l.18.14c-.62.37-1.3.7-2.04.98l.44.61A18.35 18.35 0 0 0 22 14.27l.04-.17a19.14 19.14 0 0 0-2.31-9.23ZM8.68 12.91c-.93 0-1.68-.89-1.68-1.98 0-1.1.74-1.98 1.68-1.98.95 0 1.7.89 1.68 1.98 0 1.09-.74 1.98-1.68 1.98Zm6.64 0c-.94 0-1.68-.89-1.68-1.98 0-1.1.73-1.98 1.68-1.98.94 0 1.69.89 1.68 1.98 0 1.09-.73 1.98-1.68 1.98Z" />
          </svg>
        </div>
      </div>
      <div className="disc-server-divider" />
      <button className="disc-server is-active" type="button" aria-label="DiVA's Server (active)">
        <span className="disc-server-pill" aria-hidden="true" />
        <span className="disc-server-icon">D</span>
      </button>
    </nav>
  );
}

// ------------------------------------------------------------
// Bot avatar — cat-mark face instead of a monogram, matching
// the rest of the site's cat-mark branding.
// ------------------------------------------------------------
function BotCatAvatar() {
  return (
    <span className="disc-avatar disc-avatar-bot" aria-hidden="true">
      <span className="disc-bot-ears">
        <span>^</span>
        <span>^</span>
      </span>
      <span className="disc-bot-face">
        <span className="disc-bot-eye">•</span>
        <span className="disc-bot-nose">ㅅ</span>
        <span className="disc-bot-eye">•</span>
      </span>
    </span>
  );
}

// ------------------------------------------------------------
// Channel list (with dynamic channels + private channels)
// ------------------------------------------------------------
interface ChannelListProps {
  channels: ChannelScript[];
  activeId: string;
  onSelect: (id: string) => void;
  dynamicChannels: DynamicChannel[];
}

function DiscordChannelList({ channels, activeId, onSelect, dynamicChannels }: ChannelListProps) {
  const publicChannels = channels.filter((c) => !c.isPrivate);
  const privateChannels = channels.filter((c) => c.isPrivate);

  // Group dynamic channels by category
  const dynamicByCategory = useMemo(() => {
    const map = new Map<string, DynamicChannel[]>();
    for (const c of dynamicChannels) {
      const arr = map.get(c.category) ?? [];
      arr.push(c);
      map.set(c.category, arr);
    }
    return Array.from(map.entries());
  }, [dynamicChannels]);

  return (
    <aside className="disc-channels" aria-label="Channel list">
      <header className="disc-channels-head">
        <span className="disc-channels-head-name">DiVA&apos;s Server</span>
        <svg className="disc-channels-head-chevron" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path fill="currentColor" d="M12 15.5 5.5 9l1.4-1.4 5.1 5.1 5.1-5.1L18.5 9Z" />
        </svg>
      </header>

      <div className="disc-channels-scroll">
        <div className="disc-category">
          <button type="button" className="disc-category-head" aria-expanded="true">
            <CategoryChevron />
            <span>TEXT CHANNELS</span>
          </button>

          <ul className="disc-channel-list">
            {publicChannels.map((c) => (
              <ChannelRow key={c.id} channel={c} isActive={c.id === activeId} onSelect={onSelect} />
            ))}
          </ul>
        </div>

        {/* Dynamic categories added during the admin demo */}
        {dynamicByCategory.map(([category, chs]) => (
          <div key={category} className="disc-category disc-category-dynamic">
            <button type="button" className="disc-category-head" aria-expanded="true">
              <CategoryChevron />
              <span>{category}</span>
            </button>
            <ul className="disc-channel-list">
              {chs.map((ch, i) => (
                <li key={ch.name} className="disc-channel-dynamic" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="disc-channel is-dynamic" aria-disabled="true">
                    <span className="disc-channel-hash" aria-hidden="true">#</span>
                    <span className="disc-channel-name">{ch.name}</span>
                    <span className="disc-channel-new-badge" aria-hidden="true">NEW</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Private channels — shown with lock icon + dimmed */}
        {privateChannels.length > 0 && (
          <div className="disc-category">
            <button type="button" className="disc-category-head" aria-expanded="true">
              <CategoryChevron />
              <span>PRIVATE</span>
            </button>
            <ul className="disc-channel-list">
              {privateChannels.map((c) => (
                <ChannelRow key={c.id} channel={c} isActive={c.id === activeId} onSelect={onSelect} />
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="disc-userbar">
        <span className="disc-userbar-avatar" aria-hidden="true">J</span>
        <div className="disc-userbar-labels">
          <span className="disc-userbar-name">jackie</span>
          <span className="disc-userbar-status">#0001 · online</span>
        </div>
      </div>
    </aside>
  );
}

function CategoryChevron() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" className="disc-category-chevron">
      <path fill="currentColor" d="m8 5 8 7-8 7Z" />
    </svg>
  );
}

interface ChannelRowProps {
  channel: ChannelScript;
  isActive: boolean;
  onSelect: (id: string) => void;
}

function ChannelRow({ channel, isActive, onSelect }: ChannelRowProps) {
  const isPrivate = channel.isPrivate;
  return (
    <li>
      <button
        type="button"
        className={
          'disc-channel' +
          (isActive ? ' is-active' : '') +
          (isPrivate ? ' is-private' : '')
        }
        onClick={() => onSelect(channel.id)}
        aria-current={isActive || undefined}
        aria-label={isPrivate ? `Private channel ${channel.name}` : channel.name}
      >
        {isPrivate ? (
          <span className="disc-channel-lock" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="13" height="13"><path fill="currentColor" d="M8 1a3 3 0 0 0-3 3v3H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-1V4a3 3 0 0 0-3-3Zm2 6H6V4a2 2 0 1 1 4 0v3Z" /></svg>
          </span>
        ) : (
          <span className="disc-channel-hash" aria-hidden="true">#</span>
        )}
        <span className="disc-channel-name">{channel.name}</span>
      </button>
    </li>
  );
}

// ------------------------------------------------------------
// Chat area
// ------------------------------------------------------------
interface ChatAreaProps {
  script: ChannelScript;
  channel: ChannelScript;
  entries: ChatEntry[];
  scrollRef: RefObject<HTMLDivElement | null>;
  running: boolean;
  awaiting: string | null;
  expandedHighlight: string | null;
  onReplay: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onUndo: (entryId: string, target?: 'sidebar-channels' | 'emoji-party') => void;
  onToggleHighlight: (id: string) => void;
  eras?: PersonalityEra[];
  activeEraId: string | null;
  onSelectEra: (id: string) => void;
  cost: { total: number; haiku: number; sonnet: number };
}

function DiscordChatArea(props: ChatAreaProps) {
  const {
    channel, entries, scrollRef, running, awaiting, expandedHighlight,
    onReplay, onConfirm, onCancel, onUndo, onToggleHighlight,
    eras, activeEraId, onSelectEra, cost,
  } = props;

  const isPrivate = channel.isPrivate;

  return (
    <section
      className={'disc-chat' + (isPrivate ? ' is-private' : '')}
      aria-label={`${isPrivate ? 'Private ' : ''}# ${channel.name}`}
    >
      <header className="disc-chat-head">
        {isPrivate ? (
          <span className="disc-chat-hash" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="18" height="18"><path fill="currentColor" d="M10 1a4 4 0 0 0-4 4v3H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-1V5a4 4 0 0 0-4-4Zm3 7H7V5a3 3 0 1 1 6 0v3Z" /></svg>
          </span>
        ) : (
          <span className="disc-chat-hash" aria-hidden="true">#</span>
        )}
        <h3 className="disc-chat-name">{channel.name}</h3>
        <span className="disc-chat-divider" aria-hidden="true" />
        <p className="disc-chat-topic">{channel.topic}</p>
        <button
          type="button"
          className="disc-replay"
          onClick={onReplay}
          aria-label="Replay conversation"
          disabled={running}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path fill="currentColor" d="M12 5V2L7 7l5 5V8c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6H4c0 4.4 3.6 8 8 8s8-3.6 8-8-3.6-8-8-8Z" />
          </svg>
        </button>
      </header>

      {eras && eras.length > 0 ? (
        <PersonalityTimeline
          eras={eras}
          activeId={activeEraId}
          onSelect={onSelectEra}
          disabled={running && awaiting === null}
        />
      ) : null}

      <div ref={scrollRef} className="disc-chat-scroll" role="log" aria-live="polite">
        <div className="disc-chat-spacer" />
        {entries.map((e, i) => (
          <ChatEntryRenderer
            key={e.id + '-' + i}
            entry={e}
            prev={entries[i - 1]}
            expandedHighlight={expandedHighlight}
            onToggleHighlight={onToggleHighlight}
            onConfirm={onConfirm}
            onCancel={onCancel}
            onUndo={onUndo}
            awaitingLabel={awaiting}
          />
        ))}
      </div>

      <CostTicker total={cost.total} haiku={cost.haiku} sonnet={cost.sonnet} prominent={isPrivate && channel.id === 'metrics'} />

      <DiscordInput channel={channel.name} isPrivate={isPrivate} />
    </section>
  );
}

// ------------------------------------------------------------
// Chat entry render dispatch
// ------------------------------------------------------------
interface EntryRendererProps {
  entry: ChatEntry;
  prev?: ChatEntry;
  expandedHighlight: string | null;
  onToggleHighlight: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onUndo: (entryId: string, target?: 'sidebar-channels' | 'emoji-party') => void;
  awaitingLabel: string | null;
}

function ChatEntryRenderer(props: EntryRendererProps) {
  const { entry, prev, expandedHighlight, onToggleHighlight, onConfirm, onCancel, onUndo, awaitingLabel } = props;

  if (entry.kind === 'typing') {
    const author = AUTHORS[entry.author];
    return (
      <div className="disc-typing" aria-label={`${author.name} is typing`}>
        <span className="disc-typing-dots" aria-hidden="true">
          <span /><span /><span />
        </span>
        <span className="disc-typing-label">
          <strong>{author.name}</strong> is {entry.webSearch ? 'searching the web' : 'typing'}…
        </span>
      </div>
    );
  }

  if (entry.kind === 'command-card') {
    return (
      <HighlightWrapper highlight={entry.highlight} expandedHighlight={expandedHighlight} onToggle={onToggleHighlight}>
        <div className="disc-cmd">
          <div className="disc-cmd-head">
            <span className="disc-cmd-icon" aria-hidden="true">⚡</span>
            <span className="disc-cmd-title">{entry.title}</span>
          </div>
          <div className="disc-cmd-body">
            <MessageBodyRenderer body={entry.body} />
          </div>
        </div>
      </HighlightWrapper>
    );
  }

  if (entry.kind === 'system') {
    return (
      <div className="disc-sys">
        {entry.icon ? <span className="disc-sys-icon" aria-hidden="true">{entry.icon}</span> : null}
        <div className="disc-sys-content">
          <span className="disc-sys-title">{entry.title}</span>
          {entry.body ? (
            <div className="disc-sys-body"><MessageBodyRenderer body={entry.body} /></div>
          ) : null}
        </div>
      </div>
    );
  }

  if (entry.kind === 'error-embed') {
    return (
      <HighlightWrapper highlight={entry.highlight} expandedHighlight={expandedHighlight} onToggle={onToggleHighlight}>
        <div className="disc-err">
          <div className="disc-err-head">
            <span className="disc-err-dot" aria-hidden="true" />
            <span className="disc-err-title">{entry.title}</span>
          </div>
          <dl className="disc-err-fields">
            {entry.fields.map((f) => (
              <div key={f.label} className="disc-err-field">
                <dt>{f.label}</dt>
                <dd>{renderInline(f.value)}</dd>
              </div>
            ))}
          </dl>
          {entry.trace ? (
            <pre className="disc-err-trace"><code>{entry.trace}</code></pre>
          ) : null}
        </div>
      </HighlightWrapper>
    );
  }

  // message
  const author = AUTHORS[entry.author];
  const prevAuthor =
    prev && prev.kind === 'message' ? AUTHORS[prev.author].id : null;
  const groupedWithPrev = prevAuthor === author.id && !entry.replyRef;
  const isReaction = entry.body.length === 1 && entry.body[0].kind === 'text' && entry.body[0].value.length <= 2;

  const messageContent = (
    <article className={'disc-msg' + (groupedWithPrev ? ' is-grouped' : '') + (isReaction ? ' is-reaction' : '')}>
      <div className="disc-msg-gutter" aria-hidden="true">
        {!groupedWithPrev ? (
          author.id === 'bot'
            ? <BotCatAvatar />
            : <span className="disc-avatar" style={{ background: author.avatarBg }}>
                {author.avatarGlyph}
              </span>
        ) : null}
      </div>
      <div className="disc-msg-main">
        {entry.replyRef ? <ReplyRefBar ref_={entry.replyRef} /> : null}
        {!groupedWithPrev ? (
          <header className="disc-msg-head">
            <span className="disc-msg-name" style={{ color: author.color }}>
              {author.name}
            </span>
            {author.isBot ? <span className="disc-msg-badge">BOT</span> : null}
            <span className="disc-msg-ts">{entry.timestamp}</span>
          </header>
        ) : null}

        <div className="disc-msg-body">
          <MessageBodyRenderer body={entry.body} />
          {entry.attachment ? <AttachmentRenderer attachment={entry.attachment} /> : null}
          {entry.buttons && entry.buttonState === 'pending' ? (
            <ButtonsRow
              buttons={entry.buttons}
              onConfirm={onConfirm}
              onCancel={onCancel}
              onUndo={() => onUndo(entry.id, entry.undoTarget)}
              interactive={awaitingLabel !== null || entry.buttons.some((b) => b.style === 'undo')}
            />
          ) : null}
          {entry.buttonState === 'confirmed' ? (
            <div className="disc-btn-resolved is-confirm">✓ Confirmed</div>
          ) : null}
          {entry.buttonState === 'cancelled' ? (
            <div className="disc-btn-resolved is-cancel">✕ Cancelled</div>
          ) : null}
          {entry.buttonState === 'undone' ? (
            <div className="disc-btn-resolved is-undone">↩ Undone</div>
          ) : null}
        </div>
      </div>
    </article>
  );

  return (
    <HighlightWrapper highlight={entry.highlight} expandedHighlight={expandedHighlight} onToggle={onToggleHighlight}>
      {messageContent}
    </HighlightWrapper>
  );
}

// ------------------------------------------------------------
// Reply reference bar (Discord-style reply)
// ------------------------------------------------------------
function ReplyRefBar({ ref_ }: { ref_: ReplyRef }) {
  const author = AUTHORS[ref_.authorId];
  return (
    <div className="disc-reply-ref">
      <span className="disc-reply-ref-elbow" aria-hidden="true" />
      <span className="disc-reply-ref-avatar" style={{ background: author.avatarBg }}>
        {author.avatarGlyph}
      </span>
      <span className="disc-reply-ref-name" style={{ color: author.color }}>
        @{author.name}
      </span>
      <span className="disc-reply-ref-preview">{ref_.preview}</span>
    </div>
  );
}

// ------------------------------------------------------------
// Feature highlight — dashed border + badge + expand panel
// ------------------------------------------------------------
interface HighlightWrapperProps {
  highlight?: FeatureHighlight;
  expandedHighlight: string | null;
  onToggle: (id: string) => void;
  children: ReactNode;
}

function HighlightWrapper({ highlight, expandedHighlight, onToggle, children }: HighlightWrapperProps) {
  if (!highlight) return <>{children}</>;

  const expanded = expandedHighlight === highlight.id;
  const accent = highlight.accentColor ?? '#5865f2';

  return (
    <div
      className={'disc-hl' + (expanded ? ' is-expanded' : '')}
      style={{ '--hl-accent': accent } as React.CSSProperties}
    >
      <div className="disc-hl-inner">
        {children}
        <button
          type="button"
          className="disc-hl-badge"
          onClick={() => onToggle(highlight.id)}
          aria-expanded={expanded}
          aria-label={highlight.label}
        >
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            <path fill="currentColor" d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm.8 10.5H7.2V7.2h1.6v4.3Zm0-5.5H7.2V4.5h1.6V6Z" />
          </svg>
          <span className="disc-hl-badge-label">{highlight.label}</span>
        </button>
      </div>
      {expanded ? (
        <div className="disc-hl-panel" role="region">
          <p>{highlight.detail}</p>
        </div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------
// Personality timeline scrubber
// ------------------------------------------------------------
interface TimelineProps {
  eras: PersonalityEra[];
  activeId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

function PersonalityTimeline({ eras, activeId, onSelect, disabled }: TimelineProps) {
  const active = eras.find((e) => e.id === activeId);
  return (
    <div className="disc-timeline" role="tablist" aria-label="Personality evolution timeline">
      <div className="disc-timeline-label">Personality evolution</div>
      <div className="disc-timeline-track">
        {eras.map((era) => {
          const isActive = era.id === activeId;
          return (
            <button
              key={era.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={'disc-timeline-pill' + (isActive ? ' is-active' : '')}
              onClick={() => onSelect(era.id)}
              disabled={disabled}
            >
              {era.label}
            </button>
          );
        })}
      </div>
      {active ? (
        <p className="disc-timeline-desc">{active.description}</p>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------
// Cost ticker
// ------------------------------------------------------------
interface CostTickerProps {
  total: number;
  haiku: number;
  sonnet: number;
  prominent?: boolean;
}

function CostTicker({ total, haiku, sonnet, prominent }: CostTickerProps) {
  if (total === 0) return null;
  const formatted = '$' + total.toFixed(4);
  return (
    <div
      className={'disc-cost-ticker' + (prominent ? ' is-prominent' : '')}
      role="status"
      aria-live="polite"
      title="Running API cost for this demo conversation. Haiku handles simple queries (~$0.001), Sonnet handles complex ones (~$0.008)."
    >
      <span className="disc-cost-bolt" aria-hidden="true">⚡</span>
      <span className="disc-cost-total">{formatted}</span>
      <span className="disc-cost-sep">·</span>
      <span className="disc-cost-breakdown">
        Haiku: {haiku} <span className="disc-cost-dot">·</span> Sonnet: {sonnet}
      </span>
    </div>
  );
}

// ------------------------------------------------------------
// Message body + attachment renderers
// ------------------------------------------------------------
function MessageBodyRenderer({ body }: { body: MessageBody[] }) {
  return (
    <>
      {body.map((b, i) => {
        if (b.kind === 'text') return <p key={i} className="disc-text">{renderInline(b.value)}</p>;
        if (b.kind === 'quote') return <blockquote key={i} className="disc-quote">{b.value}</blockquote>;
        if (b.kind === 'list') {
          return (
            <ul key={i} className="disc-ul">
              {b.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
            </ul>
          );
        }
        if (b.kind === 'code') {
          return (
            <pre key={i} className="disc-code" data-lang={b.lang ?? ''}>
              <code>{b.value}</code>
            </pre>
          );
        }
        return null;
      })}
    </>
  );
}

// Tiny inline-markdown-ish renderer. Handles **bold**, *italic*, `code`,
// and [text](url). No HTML escaping is needed — the input is our own.
function renderInline(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const [, bold, italic, code, link] = match;
    if (bold) nodes.push(<strong key={key++}>{bold.slice(2, -2)}</strong>);
    else if (italic) nodes.push(<em key={key++}>{italic.slice(1, -1)}</em>);
    else if (code) nodes.push(<code key={key++} className="disc-inline-code">{code.slice(1, -1)}</code>);
    else if (link) {
      const inner = /\[([^\]]+)\]\(([^)]+)\)/.exec(link);
      if (inner) nodes.push(<span key={key++} className="disc-link">{inner[1]}</span>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function AttachmentRenderer({ attachment }: { attachment: Attachment }) {
  return (
    <div className="disc-attach" aria-label={`Attachment: ${attachment.caption}`}>
      <div className="disc-attach-head">
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <path fill="currentColor" d="M4 5h16v14H4zm2 2v7l3.5-4 2.5 3 3.5-4L20 14V7Z" />
        </svg>
        <span>{attachment.caption}</span>
      </div>
      <pre className="disc-attach-code">
        {attachment.lines.map((l, i) => (
          <div key={i} className="disc-attach-line">
            <span className="disc-attach-gutter">{i + 1}</span>
            <span>{l || ' '}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

// ------------------------------------------------------------
// Button row (interactive)
// ------------------------------------------------------------
interface ButtonsRowProps {
  buttons: ScriptButton[];
  onConfirm: () => void;
  onCancel: () => void;
  onUndo: () => void;
  interactive: boolean;
}

function ButtonsRow({ buttons, onConfirm, onCancel, onUndo, interactive }: ButtonsRowProps) {
  return (
    <div className="disc-btn-row">
      {buttons.map((b) => {
        const clickable = interactive && b.interactive;
        const handler =
          b.style === 'confirm' ? onConfirm :
          b.style === 'cancel'  ? onCancel  :
          b.style === 'undo'    ? onUndo    : undefined;

        return (
          <button
            key={b.label}
            type="button"
            tabIndex={clickable ? 0 : -1}
            className={'disc-btn disc-btn-' + b.style + (clickable ? ' is-clickable' : '')}
            onClick={clickable ? handler : undefined}
            aria-hidden={clickable ? undefined : 'true'}
          >
            {b.style === 'confirm' ? '✓ ' : ''}
            {b.style === 'cancel' ? '✕ ' : ''}
            {b.style === 'undo' ? '↩ ' : ''}
            {b.label}
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------
// Input bar
// ------------------------------------------------------------
function DiscordInput({ channel, isPrivate }: { channel: string; isPrivate?: boolean }) {
  return (
    <div className="disc-input" aria-hidden="true">
      <button type="button" className="disc-input-plus" tabIndex={-1}>+</button>
      <span className="disc-input-ph">Message {isPrivate ? '🔒' : '#'}{channel}</span>
      <div className="disc-input-right">
        <span className="disc-input-icon" aria-hidden="true">🎁</span>
        <span className="disc-input-icon" aria-hidden="true">GIF</span>
        <span className="disc-input-icon" aria-hidden="true">😊</span>
      </div>
    </div>
  );
}
