// Registry of launch-ready projects. Add new projects here and they
// appear as additional scroll-snap sections in /tech.
import { sonnetDiscordAgent, type Project } from './sonnet-discord-agent';

export type { Project } from './sonnet-discord-agent';

export const projects: Project[] = [sonnetDiscordAgent];
