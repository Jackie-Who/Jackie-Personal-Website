import type { Project } from '@/content/projects';
import DiscordDemo from './projects/DiscordDemo';

interface Props {
  project: Project;
}

/**
 * Project visual — dispatches per project id. Projects whose visual is
 * a custom self-contained mockup (like the Discord bot showcase) return
 * their own component; other projects fall back to a generic terminal
 * transcript placeholder.
 */
export default function ProjectVisual({ project }: Props) {
  if (project.id === 'sonnet-discord-agent') {
    return <DiscordDemo />;
  }
  return <TerminalPlaceholder />;
}

function TerminalPlaceholder() {
  return (
    <div className="tech-pj-visual" aria-hidden="true">
      <div className="tech-pj-terminal">
        <div className="tech-pj-terminal-head">
          <span className="tech-pj-dot" />
          <span className="tech-pj-dot" />
          <span className="tech-pj-dot" />
          <span className="tech-pj-terminal-label">project · preview</span>
        </div>
        <pre className="tech-pj-terminal-body">
          <span className="tech-pj-t-cmd">{'> preview coming soon'}</span>
        </pre>
      </div>
    </div>
  );
}
