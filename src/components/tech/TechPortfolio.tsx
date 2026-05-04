import { useCallback, useEffect, useRef, useState } from 'react';
import { navigate } from 'astro:transitions/client';
import TopNav from './TopNav';
import DotNav from './DotNav';
import LandingSection from './LandingSection';
import ProjectSection from './ProjectSection';
import MoreProjectsComingSoon from './MoreProjectsComingSoon';
import BlobCursor from './BlobCursor';
import Toast from './Toast';
import ReturnOverlay from './ReturnOverlay';
import { projects } from '@/content/projects';
import './tech.css';

const BACK_SWIPE_MS = 600;
const TOAST_DURATION_MS = 1700;

const sections = [
  { id: 'landing', label: 'Landing' },
  ...projects.map((p) => ({ id: p.id, label: p.title })),
  { id: 'coming-soon', label: 'More projects' },
];

export default function TechPortfolio() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>(
    () => ({ message: '', visible: false }),
  );

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

  return (
    <div className="tech-app" data-leaving={leaving || undefined}>
      <BlobCursor />
      {leaving && <ReturnOverlay />}
      <TopNav onBack={handleBack} onTop={handleTop} />
      <DotNav sections={sections} containerRef={scrollRef} />

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
