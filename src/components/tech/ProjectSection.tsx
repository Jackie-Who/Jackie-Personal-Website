import type { Project } from '@/content/projects';
import ProjectVisual from './ProjectVisual';

interface Props {
  project: Project;
}

/**
 * Reusable project template. Layout:
 *   - project number (NN / NN)
 *   - title + tagline
 *   - two columns: visual (left) + description/features/stack/links (right)
 *
 * Future projects can render their own visual component via the
 * `visual` slot — for now the only project ships a stylized terminal.
 */
export default function ProjectSection({ project }: Props) {
  const layout = project.layout ?? 'default';
  const isShowcase = layout === 'showcase';

  return (
    <article className="tech-pj" data-layout={layout}>
      <div className="tech-pj-head">
        <p className="tech-pj-num">
          {project.number} / {project.total}
        </p>
        <h2 className="tech-pj-title">{project.title}</h2>
        <p className="tech-pj-tagline">{project.tagline}</p>
      </div>

      <div className="tech-pj-body">
        <div className="tech-pj-visual-col">
          <ProjectVisual project={project} />
        </div>

        <div className="tech-pj-details">
          {!isShowcase && (
            <p className="tech-pj-description">{project.description}</p>
          )}

          {!isShowcase && project.features.length > 0 && (
            <ul className="tech-pj-features">
              {project.features.map((f) => (
                <li key={f.title} className="tech-pj-feature">
                  <h3 className="tech-pj-feature-title">{f.title}</h3>
                  <p className="tech-pj-feature-blurb">{f.blurb}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="tech-pj-meta">
            <div className="tech-pj-stack">
              {project.stack.map((s) => (
                <span key={s} className="tech-pj-stack-tag">
                  {s}
                </span>
              ))}
            </div>

            {project.links.length > 0 && (
              <div className="tech-pj-links">
                {project.links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    className="tech-pj-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {l.icon === 'github' && (
                      <svg className="tech-pj-link-icon" viewBox="0 0 16 16" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.88.51-1.08-1.78-.2-3.64-.89-3.64-3.96 0-.88.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.64 7.64 0 014 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.82 1.27.82 2.15 0 3.08-1.87 3.76-3.65 3.96.29.25.54.74.54 1.48v2.2c0 .22.15.46.55.38A8 8 0 0016 8c0-4.42-3.58-8-8-8z"
                        />
                      </svg>
                    )}
                    <span>{l.label}</span>
                    <svg className="tech-pj-link-ext" viewBox="0 0 16 16" aria-hidden="true">
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                        d="M5 11L11 5 M5 5h6v6"
                      />
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
