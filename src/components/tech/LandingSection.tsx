import { useEffect, useRef, useState } from 'react';
import {
  intro,
  experience,
  extracurricular,
  education,
  certifications,
} from '@/content/resume';
import MetricCards from './MetricCards';
import CatMark from '@/components/shared/CatMark';
import SocialLinks from './SocialLinks';

interface Props {
  onCopyEmail?: () => void;
}

type Phase = 'intro' | 'landing';

const INTRO_HOLD_MS = 1400;

/**
 * Two-phase landing section:
 *
 *   - Phase 'intro'   — the "Hi, I'm Jackie" block sits centered,
 *                       alone on the canvas. Held for ~2.5s, or
 *                       advanced by any user input.
 *   - Phase 'landing' — the intro block moves to the left column
 *                       (same size, same alignment — the column
 *                       itself just shrinks) and the experience +
 *                       education pane fades in on the right.
 *
 * The grid-template-columns transition is the only layout change;
 * everything inside the intro keeps its size + alignment so the
 * glyphs don't shuffle.
 */
export default function LandingSection({ onCopyEmail }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const advancedRef = useRef(false);

  useEffect(() => {
    if (advancedRef.current) return;

    const advance = () => {
      if (advancedRef.current) return;
      advancedRef.current = true;
      setPhase('landing');
    };

    const timer = window.setTimeout(advance, INTRO_HOLD_MS);

    const opts: AddEventListenerOptions = { passive: true, once: true };
    window.addEventListener('wheel', advance, opts);
    window.addEventListener('scroll', advance, opts);
    window.addEventListener('pointerdown', advance, opts);
    window.addEventListener('keydown', advance as EventListener, { once: true });
    window.addEventListener('touchstart', advance, opts);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('wheel', advance);
      window.removeEventListener('scroll', advance);
      window.removeEventListener('pointerdown', advance);
      window.removeEventListener('keydown', advance as EventListener);
      window.removeEventListener('touchstart', advance);
    };
  }, []);

  const descriptionLines = intro.description.split('\n');

  return (
    <div className="tech-landing" data-phase={phase}>
      <div className="tech-landing-intro">
        <CatMark winkRadius={80} />

        <div className="tech-landing-greeting">
          <span className="tech-landing-hi">{intro.greeting}</span>
          <h1 className="tech-landing-name">{intro.name}</h1>
        </div>

        <p className="tech-landing-description">
          {descriptionLines.map((line, i) => (
            <span key={i}>
              {line}
              {i < descriptionLines.length - 1 && <br />}
            </span>
          ))}
        </p>

        <SocialLinks onCopyEmail={onCopyEmail} />
      </div>

      <aside className="tech-landing-details" aria-label="Resume">
        <div
          className="tech-landing-scroll no-scrollbar"
          tabIndex={phase === 'landing' ? 0 : -1}
          role="region"
          aria-label="Experience, education, and certifications — scrollable"
        >
          <section className="tech-landing-block">
            <h2 className="tech-resume-lb">Experience</h2>
            {experience.map((e) => (
              <article
                key={`${e.company}-${e.role}-${e.period}`}
                className="tech-exp"
              >
                <h3 className="tech-exp-role">{e.role}</h3>
                <p className="tech-exp-co">
                  <span>{e.company}</span>
                  <span className="tech-exp-dot" aria-hidden="true">
                    ·
                  </span>
                  <span>{e.period}</span>
                </p>
                {e.metrics && <MetricCards metrics={e.metrics} />}
                {e.notes && (
                  <ul className="tech-exp-notes">
                    {e.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                )}
                {e.tags && e.tags.length > 0 && (
                  <ul className="tech-exp-tags" aria-label="Skills used">
                    {e.tags.map((t) => (
                      <li key={t} className="tech-skill">
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </section>

          <section className="tech-landing-block">
            <h2 className="tech-resume-lb">Extracurriculars</h2>
            {extracurricular.map((e) => (
              <article
                key={`${e.company}-${e.role}-${e.period}`}
                className="tech-exp"
              >
                <h3 className="tech-exp-role">{e.role}</h3>
                <p className="tech-exp-co">
                  <span>{e.company}</span>
                  <span className="tech-exp-dot" aria-hidden="true">
                    ·
                  </span>
                  <span>{e.period}</span>
                </p>
                {e.metrics && <MetricCards metrics={e.metrics} />}
                {e.notes && (
                  <ul className="tech-exp-notes">
                    {e.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                )}
                {e.tags && e.tags.length > 0 && (
                  <ul className="tech-exp-tags" aria-label="Skills used">
                    {e.tags.map((t) => (
                      <li key={t} className="tech-skill">
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </section>

          <section className="tech-landing-block">
            <h2 className="tech-resume-lb">Education</h2>
            <p className="tech-edu-school">{education.school}</p>
            <p className="tech-edu-degree">{education.degree}</p>
            <p className="tech-edu-period">{education.period}</p>
          </section>

          <section className="tech-landing-block">
            <h2 className="tech-resume-lb">Certifications</h2>
            <ul className="tech-cert-list">
              {certifications.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
        </div>
      </aside>

      <div className="tech-scroll-hint" aria-hidden="true">
        <span className="tech-scroll-arrow">↓</span>
        <span>
          {phase === 'intro' ? 'scroll or tap to continue' : 'scroll for projects'}
        </span>
      </div>
    </div>
  );
}
