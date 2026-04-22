export interface ProjectLink {
  label: string;
  href: string;
  icon?: 'github' | 'external' | 'mail';
}

export interface ProjectFeature {
  title: string;
  blurb: string;
}

export type ProjectLayout = 'default' | 'showcase';

export interface Project {
  id: string;
  number: string;    // e.g., '01'
  total: string;     // e.g., '01'
  title: string;
  tagline: string;
  description: string;
  features: ProjectFeature[];
  stack: string[];
  links: ProjectLink[];
  // 'showcase' = full-width visual (no 2-col split), compact meta strip below.
  // Used for projects whose visual needs the full viewport width to read.
  layout?: ProjectLayout;
}

export const sonnetDiscordAgent: Project = {
  id: 'sonnet-discord-agent',
  number: '01',
  total: '01',
  title: 'DiVA — Discord Virtual Assistant',
  tagline: 'AI-powered Discord bot with an evolving personality and 23 admin tools',
  description:
    "Full-featured Discord bot powered by Claude AI. Routes messages between Haiku (simple queries) and Sonnet (complex reasoning) for cost-aware responses. An evolving personality system synthesizes each server's tone through periodic dream digests, shaping future replies. Ships with per-channel memory, reply-chain awareness, image analysis, web search, and strict budget management with model-aware pricing. Production-deployed on Railway with Docker, daily database backups, weekly metrics reporting, and error alerting.",
  features: [
    {
      title: 'Multi-model routing',
      blurb:
        'Haiku for quick queries, Sonnet for complex reasoning — cost optimization baked into the request path.',
    },
    {
      title: 'Evolving personality',
      blurb:
        "Periodic dream digests synthesize the server's tone into memory, so replies drift to match each community.",
    },
    {
      title: '23 admin tools',
      blurb:
        'Destructive operations require confirmation. Every action has a 5-minute undo window.',
    },
    {
      title: 'Budget management',
      blurb:
        'Hard caps, saving mode, and model-aware pricing prevent runaway spend.',
    },
    {
      title: 'Per-channel memory',
      blurb:
        'Reply-chain awareness with image analysis and web search, scoped to each channel.',
    },
    {
      title: 'Production ops',
      blurb:
        'Railway deploy, daily SQLite backups, weekly metrics reports, error alerting, graceful shutdown.',
    },
  ],
  stack: [
    'Node.js',
    'discord.js v14',
    'Claude Sonnet 4.6',
    'Claude Haiku 4.5',
    'SQLite',
    'Docker',
    'Railway',
  ],
  links: [
    {
      label: 'GitHub',
      href: 'https://github.com/Jackie-Who/Sonnet-Discord-Agent',
      icon: 'github',
    },
  ],
  layout: 'showcase',
};
