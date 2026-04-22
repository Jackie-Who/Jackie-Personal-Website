// Resume data — hardcoded. Source of truth for the /tech landing section.
// Update here; the tech portfolio rebuilds automatically.

export interface Metric {
  value: string;
  label: string;
  avg?: string;
}

export interface Experience {
  role: string;
  company: string;
  period: string;
  notes?: string[];
  metrics?: Metric[];
  tags?: string[];
}

export interface Extracurricular {
  role: string;
  company: string;
  period: string;
  notes?: string[];
  metrics?: Metric[];
  tags?: string[];
}

export type ResumeLinkAction = 'copy-email';
export type SocialIcon = 'github' | 'email' | 'instagram' | 'x';

export interface ResumeLink {
  label: string;
  href: string;
  icon: SocialIcon;
  external?: boolean;
  action?: ResumeLinkAction;
}

export const identity = {
  name: 'Jackie',
  title: 'IT Support Engineer / AI Evaluation / Full-Stack Builder',
};

export const intro = {
  greeting: "Hi, I'm",
  name: 'Jackie',
  description: 'IT Engineer, pursuing software development.\nVibe coding at home.',
};

export const email = 'jackie.yifei.hu@gmail.com';

// Social / contact links — rendered as icon buttons.
// Placeholder URLs for Instagram and X — swap for Jackie's actual
// handles when confirmed.
export const links: ResumeLink[] = [
  {
    label: 'GitHub',
    href: 'https://github.com/Jackie-Who',
    icon: 'github',
    external: true,
  },
  {
    label: 'Email',
    href: `mailto:${email}`,
    icon: 'email',
    action: 'copy-email',
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/jackie.who/',
    icon: 'instagram',
    external: true,
  },
  {
    label: 'X',
    href: 'https://x.com/Jackie_Who',
    icon: 'x',
    external: true,
  },
];

export const experience: Experience[] = [
  {
    role: 'AICE — AI Evaluation',
    company: 'Amazon · Rotation',
    period: 'Mar 2026 – May 2026',
    notes: [
      'Developed Python-based evaluation scenarios for an AI agentic IT troubleshooting tool.',
      'Benchmarked model performance across Amazon Nova, Claude Haiku, Sonnet, and Opus.',
      'Built scenarios using Kiro with a custom-designed Kiro skill. Focus: cross-model comparison, regression prevention, production readiness.',
    ],
    tags: ['Python', 'AI-Assisted Development', 'Claude API', 'AWS', 'Eval frameworks', 'Research'],
  },
  {
    role: 'IT Support Engineer I (L4)',
    company: 'Amazon',
    period: 'Dec 2025 – Present',
    notes: [
      'Promoted in 14 months. Oversaw 20+ projects as pseudo-project manager.',
      'Partnered across AICE, PnD, LT&D, on-site IT, and the GSD Lead Program.',
      'Mentor for L3 teams.',
    ],
    tags: ['Project management', 'Cross-team leadership', 'Mentoring', 'Escalation support'],
  },
  {
    role: 'IT Support Associate II (L3)',
    company: 'Amazon',
    period: 'Oct 2024 – Dec 2025',
    notes: ['20–30 customer interactions daily.'],
    metrics: [
      { value: '17.04m', label: 'Handle time', avg: 'avg 22.28m · 23% faster' },
      { value: '92.5%', label: 'Resolution', avg: 'avg 89.5%' },
      { value: '4.77', label: 'CSAT / 5', avg: 'avg 4.71' },
    ],
    tags: ['Windows OS', 'MacOS', 'Customer support', 'Linux', 'Bomgar', 'M365'],
  },
  {
    role: 'Desktop Support · IT Asset Management',
    company: 'Electronic Arts',
    period: 'Oct 2022 – Apr 2023',
    notes: [
      'Enterprise IT in a 2000+ person game studio.',
      'Lifecycle tracking for 500+ developer workstations.',
      'Deployed workstation infrastructure for 20+ development teams.',
    ],
    tags: ['ServiceNow', 'Asset management', 'Enterprise IT', 'Hardware', 'Networking'],
  },
  {
    role: 'Web Designer',
    company: 'BC Chinese Music Association',
    period: '2018',
    notes: [
      'Built bccma.net with a Shopify integration handling 800+ concert ticket sales.',
    ],
    tags: ['HTML/CSS', 'JavaScript', 'Shopify', 'WordPress'],
  },
  {
    role: 'Database Administrator',
    company: 'BC Chinese Music Association',
    period: '2019',
    notes: [
      'Built an Access database organizing 2000+ files for a 100-person orchestra.',
    ],
    tags: ['MS Access', 'SQL', 'Data modeling'],
  },
];

export const extracurricular: Extracurricular[] = [
  {  
    role: 'President',
    company: 'University of Alberta Esports Association',
    period: 'Sep 2021 – Aug 2022',
    notes: [
      'Led the largest student group at the University of Alberta.',
      'Partnerships with Red Bull, Memory Express, TELUS, MSI Canada.',
      'Managed 100+ players across 12+ competitive teams.',
    ],
    tags: ['Leadership', 'Sponsorship negotiation', 'Community building', 'Operations'],
  },
];

export const education = {
  school: 'University of Alberta',
  degree: 'B.Sc. — Computer Science major, Music minor',
  period: '2017 – 2024',
};

export const certifications: string[] = [
  'CompTIA A+ (2023)',
  'Google IT Support Professional (2023)',
];
