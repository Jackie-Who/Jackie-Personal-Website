/**
 * Scripted conversations for the Discord bot demo.
 *
 * Each channel has an array of Step descriptors that the DiscordDemo
 * component replays on channel-open. `t` is the absolute ms offset from
 * channel-open; the runner schedules each step with setTimeout.
 *
 * Some steps are *interactive* — `await-button` pauses the runner until
 * the visitor clicks a specific button. On click, the runner resumes
 * from the next step with the clock rebased to `now`.
 *
 * Numbers (token counts, cost, timestamps) are representative — the
 * weekly-metrics format mirrors /src/utils/weeklyMetrics.js in the
 * Sonnet-Discord-Agent repo.
 */

export type Author = 'user' | 'bot' | 'mark' | 'priya' | 'system';

export interface MessageAuthor {
  id: Author;
  name: string;
  color: string;       // Discord role color
  avatarBg: string;    // avatar gradient background
  avatarGlyph: string; // single-char monogram
  isBot?: boolean;
}

export const AUTHORS: Record<Author, MessageAuthor> = {
  user: {
    id: 'user',
    name: 'jackie',
    color: '#f2f3f5',
    avatarBg: 'linear-gradient(135deg, #8a8d93 0%, #5c5f66 100%)',
    avatarGlyph: 'J',
  },
  bot: {
    id: 'bot',
    name: 'DiVA',
    color: '#a5adff',
    avatarBg: 'linear-gradient(135deg, #7289da 0%, #5865f2 55%, #4752c4 100%)',
    avatarGlyph: 'D',
    isBot: true,
  },
  mark: {
    id: 'mark',
    name: 'mark',
    color: '#f4a261',
    avatarBg: 'linear-gradient(135deg, #f4a261 0%, #e76f51 100%)',
    avatarGlyph: 'M',
  },
  priya: {
    id: 'priya',
    name: 'priya',
    color: '#57f287',
    avatarBg: 'linear-gradient(135deg, #57f287 0%, #23a55a 100%)',
    avatarGlyph: 'P',
  },
  system: {
    id: 'system',
    name: 'System',
    color: '#949ba4',
    avatarBg: 'linear-gradient(135deg, #4e5058 0%, #2b2d31 100%)',
    avatarGlyph: '•',
    isBot: true,
  },
};

/** A single button attached to a bot message. */
export interface Button {
  label: string;
  style: 'confirm' | 'cancel' | 'undo';
  /** If interactive, clicking resumes the script from the await-button step. */
  interactive?: boolean;
}

/** One line within a message body — renders with inline markdown. */
export type MessageBody =
  | { kind: 'text'; value: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'code'; lang?: string; value: string }
  | { kind: 'quote'; value: string };

/** Points at another message the current one is a reply to. */
export interface ReplyRef {
  authorId: Author;
  preview: string; // truncated text of the message being replied to
}

/** Annotation that appears as a dashed border + badge + tooltip/expand. */
export interface FeatureHighlight {
  id: string;       // unique feature id, e.g. 'model-routing-haiku'
  label: string;    // short tooltip text
  detail: string;   // long explanation (2-3 sentences)
  accentColor?: string; // CSS color for the border/glow
}

/** A dynamic channel that appears in the sidebar during a script. */
export interface DynamicChannel {
  name: string;
  category: string;
}

/** Attachment variants for user messages. */
export type Attachment = {
  kind: 'image-code';
  caption: string;
  lines: string[];
};

/** The cost model for cost-tick events — used by CostTicker. */
export type CostModel = 'haiku' | 'sonnet';

export type Step =
  | { t: number; kind: 'user-msg'; author: Author; body: MessageBody[]; attachment?: Attachment; replyRef?: ReplyRef; highlight?: FeatureHighlight }
  | { t: number; kind: 'typing-start'; author: Author; webSearch?: boolean }
  | { t: number; kind: 'typing-stop'; author: Author }
  | { t: number; kind: 'bot-msg'; author: Author; body: MessageBody[]; buttons?: Button[]; reaction?: string; replyRef?: ReplyRef; highlight?: FeatureHighlight }
  | { t: number; kind: 'command-card'; title: string; body: MessageBody[]; highlight?: FeatureHighlight }
  | { t: number; kind: 'system-msg'; title: string; body?: MessageBody[]; icon?: string }
  | { t: number; kind: 'error-embed'; title: string; fields: { label: string; value: string }[]; trace?: string; highlight?: FeatureHighlight }
  | { t: number; kind: 'sidebar-add'; channels: DynamicChannel[] }
  | { t: number; kind: 'sidebar-remove'; channels: string[] }
  | { t: number; kind: 'await-button'; label: string; timeoutMs?: number }
  | { t: number; kind: 'cost-tick'; amount: number; model: CostModel }
  | { t: number; kind: 'button-resolve'; keep?: 'confirmed' | 'cancelled' };

export interface PersonalityEra {
  id: string;               // 'day-1', 'week-1', 'month-1'
  label: string;            // display label
  description: string;      // 1-liner shown below active pill
  personalityText: string;  // the /personality view output for this era
  steps: Step[];
  duration: number;
}

export interface ChannelScript {
  id: string;          // 'chat', 'personality', 'admin', ...
  name: string;        // display name
  topic: string;       // shown in channel header
  duration: number;    // total script length in ms
  steps: Step[];
  isPrivate?: boolean; // render lock icon + dimmed styling
  eras?: PersonalityEra[]; // if present, channel shows a timeline scrubber
}

// ================================================================
// Highlights — reused references keep per-channel scripts tidy
// ================================================================

const HL_HAIKU_ROUTE: FeatureHighlight = {
  id: 'model-routing-haiku',
  label: 'Routed to Haiku — simple factual query',
  detail:
    'The router detected a short, factual question (<200 chars, no "explain/analyze/debug" keywords) and dispatched to Claude Haiku 4.5. Costs ~$0.001 per exchange — the bot uses Haiku for ~70% of queries to stretch the monthly budget.',
  accentColor: '#57f287',
};

const HL_SONNET_ROUTE: FeatureHighlight = {
  id: 'model-routing-sonnet',
  label: 'Routed to Sonnet — complex analysis',
  detail:
    'Code review and debugging trigger the router\'s "complex query" path via regex on "explain|analyze|debug|review". Claude Sonnet 4.6 handles these — stronger reasoning, ~8× the cost of Haiku. Router chose Sonnet because the message contained an image attachment too.',
  accentColor: '#5865f2',
};

const HL_WEB_SEARCH: FeatureHighlight = {
  id: 'web-search',
  label: 'Web search triggered — current events query',
  detail:
    "Claude decided this question needed real-time info (keywords: 'latest', 'current'). It invokes Anthropic's native web_search tool (2 uses max per response). Search is disabled in saving mode to conserve budget.",
  accentColor: '#00a8fc',
};

const HL_REPLY_CHAIN: FeatureHighlight = {
  id: 'reply-chain',
  label: 'Walked 3 messages up the reply chain',
  detail:
    'The bot walks reply references up to 3 levels deep, collecting text and image context from every author in the thread — not just the one who pinged it. It then synthesizes a response grounded in the full conversation.',
  accentColor: '#c084fc',
};

const HL_UNDO: FeatureHighlight = {
  id: 'undo-window',
  label: '5-minute undo window',
  detail:
    'Every write action (channel creates, role assignments, emoji creates, etc.) is recorded to the undo_actions table with a 5-minute TTL. Undo survives bot restarts — the state is fully persistent in SQLite.',
  accentColor: '#fee75c',
};

const HL_CHANNEL_MEMORY: FeatureHighlight = {
  id: 'channel-memory',
  label: 'Per-channel memory — last 5 conversations',
  detail:
    'Each channel has its own rolling memory of the 5 most recent user↔bot exchanges (14-day retention). On every new message, these are injected into the system prompt so the bot can reference earlier context organically.',
  accentColor: '#c084fc',
};

const HL_RATE_LIMIT: FeatureHighlight = {
  id: 'rate-limit',
  label: 'Rate limit — 5s per-user cooldown',
  detail:
    'Per-user and per-channel rate limits prevent abuse and runaway cost. When a user hits the cooldown, the bot reacts with ⏳ (no text reply, to avoid wasting tokens). 5 messages per channel in a sliding window is the hard cap.',
  accentColor: '#fee75c',
};

const HL_SAVING_MODE_IMG: FeatureHighlight = {
  id: 'saving-mode-image',
  label: 'Saving mode active — image analysis disabled',
  detail:
    'At ≥85% of the monthly budget, saving mode kicks in: image analysis and web search are disabled to preserve remaining tokens. The bot still chats via Haiku/Sonnet text-only. Full capabilities return on the 1st of the month.',
  accentColor: '#f0b232',
};

const HL_SAVING_MODE_WEB: FeatureHighlight = {
  id: 'saving-mode-web',
  label: 'Saving mode — web search disabled',
  detail:
    "With web search off, the bot falls back to its training-data knowledge and recommends the user check the source directly. It won't hallucinate live info — a small but important trust move.",
  accentColor: '#f0b232',
};

const HL_ERROR_NOTIF: FeatureHighlight = {
  id: 'error-notif',
  label: 'Error notifications — private channel + full context',
  detail:
    'Tool execution errors are posted to a private errors channel with command, user, guild, input, and stack trace. Lets the operator diagnose from Discord without SSHing into the server.',
  accentColor: '#ed4245',
};

const HL_RETRY: FeatureHighlight = {
  id: 'retry-backoff',
  label: 'Automatic retry with exponential backoff',
  detail:
    'Anthropic API rate limits (429) are caught and auto-retried with exponential backoff, honoring the Retry-After header when present. The user sees no interruption.',
  accentColor: '#00a8fc',
};

// ================================================================
// #chat — Q&A + image analysis + web search + reply chain
// ================================================================
const chat: ChannelScript = {
  id: 'chat',
  name: 'chat',
  topic: 'general chat — mention @DiVA to talk',
  duration: 26000,
  steps: [
    { t: 400, kind: 'user-msg', author: 'user', body: [{ kind: 'text', value: '@DiVA hey what\'s a merkle tree?' }] },
    { t: 900, kind: 'typing-start', author: 'bot' },
    { t: 2200, kind: 'typing-stop', author: 'bot' },
    {
      t: 2200, kind: 'bot-msg', author: 'bot',
      body: [
        { kind: 'text', value: 'A Merkle tree is a binary hash tree — each leaf is a hash of data, each internal node is a hash of its children. You can verify huge datasets by checking just the root hash. Used heavily in git, bitcoin, and distributed DBs.' },
      ],
      highlight: HL_HAIKU_ROUTE,
    },
    { t: 2300, kind: 'cost-tick', amount: 0.0012, model: 'haiku' },

    {
      t: 5400, kind: 'user-msg', author: 'user',
      body: [{ kind: 'text', value: 'what\'s wrong with this?' }],
      attachment: {
        kind: 'image-code',
        caption: 'bug.png',
        lines: [
          'const [state, setState] = useState({ count: 0 });',
          '',
          'function increment() {',
          '  state.count = state.count + 1;',
          '  setState(state);',
          '}',
        ],
      },
    },
    { t: 6100, kind: 'typing-start', author: 'bot' },
    { t: 7900, kind: 'typing-stop', author: 'bot' },
    {
      t: 7900, kind: 'bot-msg', author: 'bot',
      body: [
        { kind: 'text', value: 'Line 4 — you\'re mutating `state` directly, then passing the same reference to `setState`. React bails out because the reference didn\'t change. Spread it:' },
        { kind: 'code', lang: 'js', value: 'setState({ ...state, count: state.count + 1 })' },
      ],
      highlight: HL_SONNET_ROUTE,
    },
    { t: 8000, kind: 'cost-tick', amount: 0.0082, model: 'sonnet' },

    { t: 10500, kind: 'user-msg', author: 'user', body: [{ kind: 'text', value: '@DiVA what\'s the latest claude opus model?' }] },
    { t: 11200, kind: 'typing-start', author: 'bot', webSearch: true },
    { t: 13500, kind: 'typing-stop', author: 'bot' },
    {
      t: 13500, kind: 'bot-msg', author: 'bot',
      body: [
        { kind: 'text', value: 'Claude Opus 4.7 — released Feb 2026. Anthropic\'s current flagship for long-context reasoning and coding.' },
        { kind: 'text', value: '[anthropic.com/claude](https://anthropic.com/claude)' },
      ],
      highlight: HL_WEB_SEARCH,
    },
    { t: 13600, kind: 'cost-tick', amount: 0.0096, model: 'sonnet' },

    // ---- Reply chain demo ----
    { t: 16500, kind: 'user-msg', author: 'mark', body: [{ kind: 'text', value: 'anyone know a good react state lib?' }] },
    {
      t: 18000, kind: 'user-msg', author: 'priya',
      body: [{ kind: 'text', value: 'zustand is solid, way simpler than redux imo' }],
      replyRef: { authorId: 'mark', preview: 'anyone know a good react state lib?' },
    },
    {
      t: 19800, kind: 'user-msg', author: 'user',
      body: [{ kind: 'text', value: '@DiVA what do you think? we need something for a medium-sized app' }],
      replyRef: { authorId: 'priya', preview: 'zustand is solid, way simpler than redux imo' },
    },
    { t: 20500, kind: 'typing-start', author: 'bot' },
    { t: 22800, kind: 'typing-stop', author: 'bot' },
    {
      t: 22800, kind: 'bot-msg', author: 'bot',
      body: [
        { kind: 'text', value: 'seconding priya — zustand hits the sweet spot for medium apps. answering mark\'s original: it\'s ~1kb, no boilerplate, works with or without context. redux is overkill unless you need time-travel debugging or middleware heavy.' },
        { kind: 'text', value: 'jotai is another good pick if you prefer atomic state over stores.' },
      ],
      highlight: HL_REPLY_CHAIN,
    },
    { t: 22900, kind: 'cost-tick', amount: 0.0068, model: 'sonnet' },
  ],
};

// ================================================================
// #personality — eras (Day 1 / Week 1 / Month 1) via scrubber
// ================================================================

const personalityDay1: PersonalityEra = {
  id: 'day-1',
  label: 'Day 1',
  description: 'Fresh install — polite, verbose, generic tone.',
  personalityText:
    'Default persona. Helpful, conversational, full-sentence replies. No server-specific adaptations yet — needs ~15 interactions to begin evolving.',
  duration: 10000,
  steps: [
    { t: 400, kind: 'user-msg', author: 'mark', body: [{ kind: 'text', value: '@DiVA you awake?' }] },
    { t: 900, kind: 'typing-start', author: 'bot' },
    { t: 2400, kind: 'typing-stop', author: 'bot' },
    {
      t: 2400, kind: 'bot-msg', author: 'bot',
      body: [{ kind: 'text', value: 'Hello! Yes, I\'m here and ready to help. What can I do for you today?' }],
    },

    { t: 5000, kind: 'user-msg', author: 'priya', body: [{ kind: 'text', value: '@DiVA explain bfs vs dfs like i\'m 5' }] },
    { t: 5500, kind: 'typing-start', author: 'bot' },
    { t: 7200, kind: 'typing-stop', author: 'bot' },
    {
      t: 7200, kind: 'bot-msg', author: 'bot',
      body: [
        { kind: 'text', value: 'Great question! Breadth-First Search (BFS) explores all neighboring nodes before moving deeper, while Depth-First Search (DFS) follows a single path as far as it can before backtracking. BFS is typically used for finding the shortest path, while DFS is used for exploring every possibility.' },
      ],
    },

    { t: 8600, kind: 'user-msg', author: 'user', body: [{ kind: 'text', value: '/personality view' }] },
    {
      t: 9000, kind: 'command-card',
      title: 'Current personality for Sonnet\'s Server',
      body: [
        { kind: 'quote', value: 'Default persona. Helpful, conversational, full-sentence replies. No server-specific adaptations yet — needs ~15 interactions to begin evolving.' },
        { kind: 'text', value: 'Interactions since reset: **3** / 15' },
      ],
    },
  ],
};

const personalityWeek1: PersonalityEra = {
  id: 'week-1',
  label: 'Week 1',
  description: 'Bot picks up casual tone — shorter replies, lowercase drift.',
  personalityText:
    'Casual and direct. Prefers short replies unless asked for detail. Leans toward lowercase. Comfortable with the server\'s relaxed, technical vibe.',
  duration: 9000,
  steps: [
    { t: 400, kind: 'user-msg', author: 'mark', body: [{ kind: 'text', value: '@DiVA you up' }] },
    { t: 900, kind: 'typing-start', author: 'bot' },
    { t: 1800, kind: 'typing-stop', author: 'bot' },
    { t: 1800, kind: 'bot-msg', author: 'bot', body: [{ kind: 'text', value: 'yeah, what\'s up' }] },

    { t: 3800, kind: 'user-msg', author: 'priya', body: [{ kind: 'text', value: '@DiVA explain bfs vs dfs like i\'m 5' }] },
    { t: 4300, kind: 'typing-start', author: 'bot' },
    { t: 5900, kind: 'typing-stop', author: 'bot' },
    {
      t: 5900, kind: 'bot-msg', author: 'bot',
      body: [
        { kind: 'text', value: 'bfs = check all your neighbors first, then their neighbors. dfs = pick a path, commit till it dead-ends.' },
        { kind: 'text', value: 'bfs = shortest path. dfs = "is there a path at all"' },
      ],
    },

    { t: 7400, kind: 'user-msg', author: 'user', body: [{ kind: 'text', value: '/personality view' }] },
    {
      t: 7800, kind: 'command-card',
      title: 'Current personality for Sonnet\'s Server',
      body: [
        { kind: 'quote', value: 'Casual and direct. Prefers short replies unless asked for detail. Leans toward lowercase. Comfortable with the server\'s relaxed, technical vibe.' },
        { kind: 'text', value: 'Evolves every 15 interactions. Next digest in ~4 messages.' },
      ],
    },
  ],
};

const personalityMonth1: PersonalityEra = {
  id: 'month-1',
  label: 'Month 1',
  description: 'Full server vibe — inside jokes, memory, dry humor.',
  personalityText:
    'Dry, casual, lightly profane. Leans into inside jokes about late-night debugging and the server\'s running "semicolon incident" meme. Short replies unless someone explicitly asks for depth. Doesn\'t over-explain.',
  duration: 13500,
  steps: [
    { t: 400, kind: 'user-msg', author: 'mark', body: [{ kind: 'text', value: '@DiVA u up' }] },
    { t: 900, kind: 'typing-start', author: 'bot' },
    { t: 1800, kind: 'typing-stop', author: 'bot' },
    { t: 1800, kind: 'bot-msg', author: 'bot', body: [{ kind: 'text', value: 'yeah what\'s good' }] },

    { t: 3800, kind: 'user-msg', author: 'priya', body: [{ kind: 'text', value: '@DiVA explain bfs vs dfs like i\'m 5' }] },
    { t: 4400, kind: 'typing-start', author: 'bot' },
    { t: 6000, kind: 'typing-stop', author: 'bot' },
    {
      t: 6000, kind: 'bot-msg', author: 'bot',
      body: [
        { kind: 'text', value: 'bfs = check all your neighbors first, then their neighbors. dfs = pick a path and commit until it dead-ends.' },
        { kind: 'text', value: 'bfs for shortest paths, dfs for "is there any path at all"' },
      ],
    },

    { t: 8200, kind: 'user-msg', author: 'mark', body: [{ kind: 'text', value: 'lmao remember when we spent 3 hours debugging that semicolon' }] },
    { t: 8800, kind: 'typing-start', author: 'bot' },
    { t: 10000, kind: 'typing-stop', author: 'bot' },
    { t: 10000, kind: 'bot-msg', author: 'bot', body: [{ kind: 'text', value: 'yeah you were VERY upset' }] },

    { t: 12200, kind: 'user-msg', author: 'user', body: [{ kind: 'text', value: '/personality view' }] },
    {
      t: 12600, kind: 'command-card',
      title: 'Current personality for Sonnet\'s Server',
      body: [
        { kind: 'quote', value: 'Dry, casual, lightly profane. Leans into inside jokes about late-night debugging and the server\'s running "semicolon incident" meme. Short replies unless someone explicitly asks for depth. Doesn\'t over-explain.' },
        { kind: 'text', value: 'Evolves every 15 interactions. Last digest: 2 hours ago.' },
      ],
    },
  ],
};

const personality: ChannelScript = {
  id: 'personality',
  name: 'personality',
  topic: 'how @DiVA picks up the server\'s vibe over time',
  duration: personalityMonth1.duration,
  steps: personalityMonth1.steps,
  eras: [personalityDay1, personalityWeek1, personalityMonth1],
};

// ================================================================
// #admin — interactive confirm/undo + live sidebar updates
// ================================================================
const admin: ChannelScript = {
  id: 'admin',
  name: 'admin',
  topic: 'server management via natural language',
  duration: 32000,
  steps: [
    {
      t: 400, kind: 'user-msg', author: 'user',
      body: [{ kind: 'text', value: '@DiVA hey set up an events section — create a category called Events with #announcements, #music-night, and #game-tournament' }],
    },
    { t: 1200, kind: 'typing-start', author: 'bot' },
    { t: 3200, kind: 'typing-stop', author: 'bot' },
    {
      t: 3200, kind: 'bot-msg', author: 'bot',
      body: [
        { kind: 'text', value: 'I\'ll perform the following actions:' },
        {
          kind: 'list',
          items: [
            '`create_category`: Events',
            '`create_text_channel`: #announcements (in Events)',
            '`create_text_channel`: #music-night (in Events)',
            '`create_text_channel`: #game-tournament (in Events)',
          ],
        },
        { kind: 'text', value: '*Waiting for confirmation — expires in 60s*' },
      ],
      buttons: [
        { label: 'Confirm', style: 'confirm', interactive: true },
        { label: 'Cancel', style: 'cancel', interactive: true },
      ],
    },
    { t: 3200, kind: 'cost-tick', amount: 0.0054, model: 'sonnet' },
    // -- pause: wait for Confirm (or Cancel → different branch; we auto-advance after 15s) --
    { t: 3400, kind: 'await-button', label: 'Confirm', timeoutMs: 15000 },
    // -- after Confirm --
    { t: 100, kind: 'button-resolve', keep: 'confirmed' },
    {
      t: 200, kind: 'bot-msg', author: 'bot',
      body: [{ kind: 'text', value: '**Confirmed** — executing now…' }],
    },
    { t: 700, kind: 'typing-start', author: 'bot' },
    {
      t: 1600, kind: 'sidebar-add',
      channels: [
        { name: 'announcements', category: 'EVENTS' },
        { name: 'music-night', category: 'EVENTS' },
        { name: 'game-tournament', category: 'EVENTS' },
      ],
    },
    { t: 2600, kind: 'typing-stop', author: 'bot' },
    {
      t: 2600, kind: 'bot-msg', author: 'bot',
      body: [
        { kind: 'text', value: '✅ Done — created category `Events` with 3 channels.' },
      ],
      buttons: [{ label: 'Undo', style: 'undo', interactive: true }],
      highlight: HL_UNDO,
    },

    // ---- Emoji creation ----
    {
      t: 6500, kind: 'user-msg', author: 'user',
      body: [{ kind: 'text', value: '@DiVA can you also make an emoji called :party: from https://i.imgur.com/party.png' }],
    },
    { t: 7200, kind: 'typing-start', author: 'bot' },
    { t: 8800, kind: 'typing-stop', author: 'bot' },
    {
      t: 8800, kind: 'bot-msg', author: 'bot',
      body: [
        { kind: 'text', value: 'I\'ll perform the following action:' },
        { kind: 'list', items: ['`create_emoji`: name=`:party:`, source=https://i.imgur.com/party.png'] },
        { kind: 'text', value: '*Waiting for confirmation — expires in 60s*' },
      ],
      buttons: [
        { label: 'Confirm', style: 'confirm', interactive: true },
        { label: 'Cancel', style: 'cancel', interactive: true },
      ],
    },
    { t: 9000, kind: 'cost-tick', amount: 0.0034, model: 'sonnet' },
    { t: 9200, kind: 'await-button', label: 'Confirm', timeoutMs: 15000 },
    { t: 100, kind: 'button-resolve', keep: 'confirmed' },
    { t: 400, kind: 'typing-start', author: 'bot' },
    { t: 1800, kind: 'typing-stop', author: 'bot' },
    {
      t: 1800, kind: 'bot-msg', author: 'bot',
      body: [
        { kind: 'text', value: '✅ Created emoji :party: — usable server-wide.' },
      ],
      buttons: [{ label: 'Undo', style: 'undo', interactive: true }],
    },
  ],
};

// ================================================================
// #community — per-channel memory + rate limiting + saving mode
// ================================================================
const community: ChannelScript = {
  id: 'community',
  name: 'community',
  topic: 'memory, rate limits, and graceful degradation',
  duration: 30000,
  steps: [
    { t: 400, kind: 'user-msg', author: 'mark', body: [{ kind: 'text', value: '@DiVA what were we talking about yesterday?' }] },
    { t: 1100, kind: 'typing-start', author: 'bot' },
    { t: 3000, kind: 'typing-stop', author: 'bot' },
    {
      t: 3000, kind: 'bot-msg', author: 'bot',
      body: [
        { kind: 'text', value: 'you and priya were debating websocket impls — specifically socket.io vs raw ws. you leaned toward ws for the lower overhead. want me to dig up that thread?' },
      ],
      highlight: HL_CHANNEL_MEMORY,
    },
    { t: 3100, kind: 'cost-tick', amount: 0.0014, model: 'haiku' },

    // Rate limit burst
    { t: 6200, kind: 'user-msg', author: 'priya', body: [{ kind: 'text', value: '@DiVA what\'s the time complexity of quicksort' }] },
    { t: 6800, kind: 'typing-start', author: 'bot' },
    { t: 8000, kind: 'typing-stop', author: 'bot' },
    {
      t: 8000, kind: 'bot-msg', author: 'bot',
      body: [{ kind: 'text', value: 'O(n log n) avg, O(n²) worst case (pathological input — already-sorted, bad pivot)' }],
    },
    { t: 8100, kind: 'cost-tick', amount: 0.0009, model: 'haiku' },

    { t: 9300, kind: 'user-msg', author: 'priya', body: [{ kind: 'text', value: '@DiVA and merge sort' }] },
    {
      t: 10000, kind: 'system-msg',
      icon: '⏳',
      title: 'Cooldown active',
      body: [{ kind: 'text', value: '@priya — you\'re hitting the per-user rate limit. Try again in 4s.' }],
    },
    { t: 10200, kind: 'bot-msg', author: 'bot', body: [{ kind: 'text', value: '⏳' }], reaction: '⏳', highlight: HL_RATE_LIMIT },

    // Saving mode — image
    {
      t: 14000, kind: 'user-msg', author: 'user',
      body: [{ kind: 'text', value: '@DiVA what\'s in this image?' }],
      attachment: {
        kind: 'image-code',
        caption: 'screenshot.png',
        lines: ['[ binary image data — 240 KB ]'],
      },
    },
    { t: 14700, kind: 'typing-start', author: 'bot' },
    { t: 16400, kind: 'typing-stop', author: 'bot' },
    {
      t: 16400, kind: 'bot-msg', author: 'bot',
      body: [
        { kind: 'text', value: 'I can see you shared an image, but I\'m in **saving mode** right now to conserve the monthly budget — image analysis is temporarily off. Feel free to describe it and I can help; full caps return on the 1st.' },
      ],
      highlight: HL_SAVING_MODE_IMG,
    },
    { t: 16500, kind: 'cost-tick', amount: 0.0011, model: 'haiku' },

    // Saving mode — web search
    { t: 20500, kind: 'user-msg', author: 'mark', body: [{ kind: 'text', value: '@DiVA search for the latest node.js lts release' }] },
    { t: 21200, kind: 'typing-start', author: 'bot' },
    { t: 23000, kind: 'typing-stop', author: 'bot' },
    {
      t: 23000, kind: 'bot-msg', author: 'bot',
      body: [
        { kind: 'text', value: 'web search is off in saving mode too. based on my training: **Node 22** is the current LTS. for the truly-latest, check nodejs.org directly — i\'d rather give you a verified answer than guess.' },
      ],
      highlight: HL_SAVING_MODE_WEB,
    },
    { t: 23100, kind: 'cost-tick', amount: 0.0013, model: 'haiku' },
  ],
};

// ================================================================
// 🔒 metrics — private channel with budget + weekly auto-post
// ================================================================
const metrics: ChannelScript = {
  id: 'metrics',
  name: 'metrics',
  topic: 'budget + weekly usage reports',
  isPrivate: true,
  duration: 17000,
  steps: [
    // Auto-posted by the bot (no user trigger)
    {
      t: 400, kind: 'system-msg',
      icon: '📊',
      title: 'Weekly Metrics Report — Sunday, 9:00 PM Pacific',
      body: [{ kind: 'text', value: '*Auto-posted by DiVA — every Sunday*' }],
    },
    {
      t: 800, kind: 'bot-msg', author: 'bot',
      body: [
        { kind: 'code', lang: 'md', value:
`# 📊 Weekly Bot Metrics

## This Week (Last 7 Days)
- API Calls: 287
- Conversations: 114
- Active Guilds: 3
- Active Users: 22
- Week Cost: $1.84
- Avg Cost/Call: $0.0064

## Daily Breakdown
Date        │ Calls │ Cost
────────────┼───────┼─────────
2026-04-14  │   42  │ $0.3214
2026-04-15  │   31  │ $0.2108
2026-04-16  │   48  │ $0.3687
2026-04-17  │   39  │ $0.2491
2026-04-18  │   52  │ $0.3842
2026-04-19  │   36  │ $0.2178
2026-04-20  │   39  │ $0.2512

## Budget Progress
Used:  $4.12 / $20.00  (20.6%)
[████░░░░░░░░░░░░░░░░] 20.6%` },
      ],
    },

    { t: 6500, kind: 'user-msg', author: 'user', body: [{ kind: 'text', value: '/budget' }] },
    {
      t: 6900, kind: 'command-card',
      title: '📊 Monthly API Budget',
      body: [
        { kind: 'list', items: ['Input Tokens: **152,430**', 'Output Tokens: **38,200**'] },
        { kind: 'list', items: ['Spent: **$0.5621**', 'Budget: **$20.00**', 'Remaining: **$19.4379**', 'Est. Exchanges Left: ~2,587'] },
        { kind: 'text', value: '*Resets on the 1st of each month*' },
      ],
    },
  ],
};

// ================================================================
// 🔒 errors — private channel with tool errors + API retry
// ================================================================
const errors: ChannelScript = {
  id: 'errors',
  name: 'errors',
  topic: 'tool + API errors, posted automatically',
  isPrivate: true,
  duration: 14000,
  steps: [
    {
      t: 400, kind: 'system-msg',
      icon: '🔴',
      title: 'Error Alert — April 18, 2026 at 11:42 PM Pacific',
      body: [{ kind: 'text', value: '*Auto-posted by DiVA — tool execution failure*' }],
    },
    {
      t: 800, kind: 'error-embed',
      title: 'Tool Execution Error',
      fields: [
        { label: 'Command', value: '`create_emoji`' },
        { label: 'User', value: 'jackie (#admin)' },
        { label: 'Guild', value: "DiVA's Server" },
        { label: 'Input URL', value: 'https://example.com/party.png' },
        { label: 'HTTP Status', value: '404 Not Found' },
        { label: 'Message', value: 'Invalid image URL — the provided URL returned a 404 response. Emoji creation requires a direct link to a PNG, JPG, or GIF image under 256 KB.' },
      ],
      trace:
`ToolExecutionError: Failed to fetch emoji source image
  at AdminTools.createEmoji (src/ai/adminTools.js:412)
  at processToolCall (src/ai/chat.js:187)
  at ChatRunner.run (src/ai/chat.js:94)`,
      highlight: HL_ERROR_NOTIF,
    },

    {
      t: 7500, kind: 'system-msg',
      icon: '⚠️',
      title: 'Rate Limit Warning — April 18, 2026 at 11:44 PM Pacific',
      body: [{ kind: 'text', value: '*Auto-posted by DiVA — automatic retry in progress*' }],
    },
    {
      t: 8000, kind: 'error-embed',
      title: 'API Rate Limit',
      fields: [
        { label: 'Service', value: 'Anthropic API' },
        { label: 'Endpoint', value: '`POST /v1/messages`' },
        { label: 'Status', value: '429 Too Many Requests' },
        { label: 'Retry-After', value: '12s' },
        { label: 'Action', value: 'Automatically queued — retrying in 12 seconds.' },
      ],
      highlight: HL_RETRY,
    },
  ],
};

export const CHANNELS: ChannelScript[] = [
  chat,
  personality,
  admin,
  community,
  metrics,
  errors,
];
