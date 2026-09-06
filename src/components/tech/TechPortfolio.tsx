import { useCallback, useEffect, useRef, useState } from 'react';
import { navigate } from 'astro:transitions/client';
import TopNav from './TopNav';
import DotNav from './DotNav';
import LandingSection from './LandingSection';
import ProjectSection from './ProjectSection';
import MoreProjectsComingSoon from './MoreProjectsComingSoon';
import CardioSurfersPlaceholder from './CardioSurfersPlaceholder';
import BlobCursor from './BlobCursor';
import Toast from './Toast';
import ReturnOverlay from './ReturnOverlay';
import { projects } from '@/content/projects';
import './tech.css';

const BACK_SWIPE_MS = 600;
const TOAST_DURATION_MS = 1700;

/** Section id of the Cardio Surfers placeholder. Rendered outside the
 *  projects registry for now so the full showcase (parked on the
 *  `cardio-surfers-showcase` branch) can drop in later without
 *  renumbering DiVA in the meantime. */
export const SURFER_ID = 'cardio-surfers';

const sections = [
  { id: 'landing', label: 'Landing' },
  ...projects.map((p) => ({ id: p.id, label: p.title })),
  { id: SURFER_ID, label: 'Cardio Surfers' },
  { id: 'coming-soon', label: 'More projects' },
];

/**
 * Deep links. Each of these sections owns a URL: scrolling it into view
 * rewrites the address bar, and loading that URL lands you on it.
 * Sections absent from this map fall back to /tech.
 */
const SECTION_PATHS: Record<string, string> = {
  'sonnet-discord-agent': '/diva',
  [SURFER_ID]: '/surfer',
};
const DEFAULT_PATH = '/tech';

interface Props {
  /** Section to open on. Set by the page route (/diva, /surfer); /tech
   *  omits it and opens at the top. */
  initialSection?: string;
}

export default function TechPortfolio({ initialSection }: Props = {}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>(
    () => ({ message: '', visible: false }),
  );
  // Incremented whenever the Cardio Surfers section takes the viewport;
  // the placeholder re-rolls its scribbled note on every change.
  const [surferRoll, setSurferRoll] = useState(0);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, TOAST_DURATION_MS);
  }, []);

  const handleBack = useCallback(() => {
    setLeaving(true);
    window.setTimeout(() => {
      navigate('/');
    }, BACK_SWIPE_MS);
  }, []);

  const handleTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleEmailCopied = useCallback(() => {
    showToast('Copied to clipboard');
  }, [showToast]);

  /**
   * Keep the address bar pointed at whatever section is on screen.
   *
   * replaceState rather than pushState on purpose: a scroll is not a
   * navigation, and pushing would bury the page the visitor arrived
   * from under one entry per section they passed. Back still returns
   * them to wherever they came from.
   */
  const handleActiveSection = useCallback((id: string) => {
    const path = SECTION_PATHS[id] ?? DEFAULT_PATH;
    if (window.location.pathname !== path) {
      window.history.replaceState(window.history.state, '', path);
    }
    // Bump the Cardio Surfers aside each time that section takes the
    // viewport, so its scribbled note is different on a revisit.
    // Driven from here rather than from an observer inside the section
    // itself: DotNav observes against the snap container as its root,
    // which is the only arrangement that fires reliably here.
    if (id === SURFER_ID) setSurferRoll((n) => n + 1);
  }, []);

  /**
   * Open on the section the route asked for. Scroll behaviour is
   * forced to auto for this one jump — the container sets
   * `scroll-behavior: smooth`, which would otherwise animate a visible
   * scroll down the page on first paint instead of just being there.
   */
  useEffect(() => {
    if (!initialSection) return;
    const root = scrollRef.current;
    if (!root) return;
    const target = root.querySelector<HTMLElement>(`#${CSS.escape(initialSection)}`);
    if (!target) return;

    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    target.scrollIntoView({ block: 'start' });
    // Restore on the next frame so the jump itself can't be smoothed.
    const raf = window.requestAnimationFrame(() => {
      root.style.scrollBehavior = previous;
    });
    return () => window.cancelAnimationFrame(raf);
  }, [initialSection]);

  return (
    <div className="tech-app" data-leaving={leaving || undefined}>
      <BlobCursor />
      {leaving && <ReturnOverlay />}
      <TopNav onBack={handleBack} onTop={handleTop} />
      <DotNav
        sections={sections}
        containerRef={scrollRef}
        onActiveChange={handleActiveSection}
      />

      <div ref={scrollRef} className="tech-snap no-scrollbar">
        <section
          id="landing"
          className="tech-snap-section tech-snap-section-landing"
          aria-label="Introduction and resume"
        >
          <LandingSection onCopyEmail={handleEmailCopied} />
        </section>

        {projects.map((project) => (
          <section
            key={project.id}
            id={project.id}
            className="tech-snap-section"
            data-project={project.id}
            data-project-layout={project.layout ?? 'default'}
            aria-label={project.title}
          >
            <ProjectSection project={project} />
          </section>
        ))}

        <section
          id={SURFER_ID}
          className="tech-snap-section tech-snap-section-surfer"
          aria-label="Cardio Surfers"
        >
          <CardioSurfersPlaceholder rollToken={surferRoll} />
        </section>

        <section
          id="coming-soon"
          className="tech-snap-section tech-snap-section-coming"
          aria-label="More projects coming soon"
        >
          <MoreProjectsComingSoon />
        </section>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
