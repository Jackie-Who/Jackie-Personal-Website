// Tokenized source code for the hero's tech-side background.
// Content mirrors the /tech landing page — the intro block, social
// icons, and the scrollable resume pane (experience + education +
// certifications). Runs at 8ms/char (see CodeBackground) so the
// loop takes ~30s even though there's a lot more text now.

export type TokenKind =
  | 'tag'   // HTML tag names
  | 'attr'  // attribute names
  | 'val'   // attribute values
  | 'txt'   // text content
  | 'cmt'   // comments
  | 'pn'    // punctuation (brackets, quotes, slashes)
  | 'cls';  // class / constant / list item / tag value

export interface Token {
  t: string;
  c?: TokenKind;
}

export type Line = Token[];

const pn = (t: string): Token => ({ t, c: 'pn' });
const tag = (t: string): Token => ({ t, c: 'tag' });
const attr = (t: string): Token => ({ t, c: 'attr' });
const val = (t: string): Token => ({ t, c: 'val' });
const txt = (t: string): Token => ({ t, c: 'txt' });
const cmt = (t: string): Token => ({ t, c: 'cmt' });
const cls = (t: string): Token => ({ t, c: 'cls' });
const sp = (t: string): Token => ({ t });
const blank: Line = [];

const openTag = (name: string, className?: string): Token[] =>
  className
    ? [pn('<'), tag(name), sp(' '), attr('class'), pn('="'), val(className), pn('">')]
    : [pn('<'), tag(name), pn('>')];
const closeTag = (name: string): Token[] => [pn('</'), tag(name), pn('>')];
const textLine = (indent: string, tagName: string, text: string): Line => [
  sp(indent),
  ...openTag(tagName),
  txt(text),
  ...closeTag(tagName),
];
const tagLine = (indent: string, text: string): Line => [
  sp(indent),
  ...openTag('li', 'tag'),
  cls(text),
  ...closeTag('li'),
];

export const CODE_LINES: Line[] = [
  [pn('<'), tag('main'), sp(' '), attr('class'), pn('="'), val('landing'), pn('" '), attr('data-phase'), pn('="'), val('landing'), pn('">')],
  blank,

  [sp('  '), cmt('<!-- Intro column -->')],
  [sp('  '), ...openTag('section', 'intro')],
  [sp('    '), ...openTag('div', 'cat-mark')],
  [sp('      '), ...openTag('div', 'ears')],
  [sp('        '), ...openTag('span'), txt('^'), ...closeTag('span')],
  [sp('        '), ...openTag('span'), txt('^'), ...closeTag('span')],
  [sp('      '), ...closeTag('div')],
  [sp('      '), ...openTag('div', 'face')],
  [sp('        '), ...openTag('span', 'eye'), txt('•'), ...closeTag('span')],
  [sp('        '), ...openTag('span', 'nose'), txt('ㅅ'), ...closeTag('span')],
  [sp('        '), ...openTag('span', 'eye'), txt('•'), ...closeTag('span')],
  [sp('      '), ...closeTag('div')],
  [sp('    '), ...closeTag('div')],
  blank,

  [sp('    '), ...openTag('header', 'greeting')],
  textLine('      ', 'span', "Hi, I'm"),
  textLine('      ', 'h1', 'Jackie'),
  [sp('    '), ...closeTag('header')],
  blank,

  [sp('    '), ...openTag('p', 'description')],
  [sp('      '), txt('IT Engineer, pursuing software')],
  [sp('      '), txt('development. Vibe coding at home.')],
  [sp('    '), ...closeTag('p')],
  blank,

  [sp('    '), ...openTag('ul', 'socials')],
  [sp('      '), ...openTag('li'), sp(' '), ...openTag('a', 'github'), txt('GitHub'), ...closeTag('a'), ...closeTag('li')],
  [sp('      '), ...openTag('li'), sp(' '), ...openTag('button', 'copy-email'), txt('Email'), ...closeTag('button'), ...closeTag('li')],
  [sp('      '), ...openTag('li'), sp(' '), ...openTag('a', 'instagram'), txt('Instagram'), ...closeTag('a'), ...closeTag('li')],
  [sp('      '), ...openTag('li'), sp(' '), ...openTag('a', 'x'), txt('X'), ...closeTag('a'), ...closeTag('li')],
  [sp('    '), ...closeTag('ul')],
  [sp('  '), ...closeTag('section')],
  blank,

  [sp('  '), cmt('<!-- Details column — scrollable -->')],
  [sp('  '), ...openTag('aside', 'details')],
  [sp('    '), ...openTag('section', 'experience')],
  textLine('      ', 'h2', 'Experience'),
  blank,

  [sp('      '), cmt('<!-- AICE rotation -->')],
  [sp('      '), ...openTag('article', 'exp')],
  textLine('        ', 'h3', 'AICE — AI Evaluation'),
  textLine('        ', 'span', 'Amazon · Mar–May 2026'),
  [sp('        '), ...openTag('p')],
  [sp('          '), txt('Python evaluation scenarios for AI agentic IT tool.')],
  [sp('          '), txt('Cross-model benchmarking: Nova, Haiku, Sonnet, Opus.')],
  [sp('        '), ...closeTag('p')],
  [sp('        '), ...openTag('ul', 'tags')],
  tagLine('          ', 'Python'),
  tagLine('          ', 'Kiro'),
  tagLine('          ', 'Claude API'),
  tagLine('          ', 'Amazon Nova'),
  tagLine('          ', 'Eval frameworks'),
  [sp('        '), ...closeTag('ul')],
  [sp('      '), ...closeTag('article')],
  blank,

  [sp('      '), cmt('<!-- IT Support Engineer I (L4) -->')],
  [sp('      '), ...openTag('article', 'exp')],
  textLine('        ', 'h3', 'IT Support Engineer I (L4)'),
  textLine('        ', 'span', 'Amazon · Dec 2025–Present'),
  [sp('        '), ...openTag('p')],
  [sp('          '), txt('Promoted in 14 months. 20+ projects as pseudo-PM.')],
  [sp('          '), txt('Cross-team with AICE, PnD, LT&D, GSD Lead Program.')],
  [sp('        '), ...closeTag('p')],
  [sp('        '), ...openTag('ul', 'tags')],
  tagLine('          ', 'Project management'),
  tagLine('          ', 'Cross-team leadership'),
  tagLine('          ', 'Mentoring'),
  tagLine('          ', 'AWS'),
  [sp('        '), ...closeTag('ul')],
  [sp('      '), ...closeTag('article')],
  blank,

  [sp('      '), cmt('<!-- IT Support Associate II (L3) -->')],
  [sp('      '), ...openTag('article', 'exp')],
  textLine('        ', 'h3', 'IT Support Associate II (L3)'),
  textLine('        ', 'span', 'Amazon · Oct 2024–Dec 2025'),
  [sp('        '), ...openTag('div', 'metrics')],
  [sp('          '), ...openTag('span'), cls('Handle: 17.04min'), ...closeTag('span')],
  [sp('          '), ...openTag('span'), cls('Resolution: 92.5%'), ...closeTag('span')],
  [sp('          '), ...openTag('span'), cls('CSAT: 4.77/5'), ...closeTag('span')],
  [sp('        '), ...closeTag('div')],
  [sp('        '), ...openTag('ul', 'tags')],
  tagLine('          ', 'ServiceNow'),
  tagLine('          ', 'Customer support'),
  tagLine('          ', 'Networking'),
  tagLine('          ', 'Linux'),
  [sp('        '), ...closeTag('ul')],
  [sp('      '), ...closeTag('article')],
  blank,

  [sp('      '), cmt('<!-- Desktop Support — EA -->')],
  [sp('      '), ...openTag('article', 'exp')],
  textLine('        ', 'h3', 'Desktop Support · IT Assets'),
  textLine('        ', 'span', 'Electronic Arts · 2022–2023'),
  [sp('        '), ...openTag('p'), txt('500+ workstations across a 2000+ person studio.'), ...closeTag('p')],
  [sp('        '), ...openTag('ul', 'tags')],
  tagLine('          ', 'Windows'),
  tagLine('          ', 'macOS'),
  tagLine('          ', 'SCCM'),
  tagLine('          ', 'Enterprise IT'),
  [sp('        '), ...closeTag('ul')],
  [sp('      '), ...closeTag('article')],
  blank,

  [sp('      '), cmt('<!-- BCCMA Web Designer -->')],
  [sp('      '), ...openTag('article', 'exp')],
  textLine('        ', 'h3', 'Web Designer'),
  textLine('        ', 'span', 'BC Chinese Music Association · 2018'),
  [sp('        '), ...openTag('p'), txt('bccma.net with Shopify — 800+ concert tickets.'), ...closeTag('p')],
  [sp('        '), ...openTag('ul', 'tags')],
  tagLine('          ', 'HTML/CSS'),
  tagLine('          ', 'JavaScript'),
  tagLine('          ', 'Shopify'),
  [sp('        '), ...closeTag('ul')],
  [sp('      '), ...closeTag('article')],
  [sp('    '), ...closeTag('section')],
  blank,

  [sp('    '), cmt('<!-- Education -->')],
  [sp('    '), ...openTag('section', 'education')],
  textLine('      ', 'h2', 'Education'),
  textLine('      ', 'p', 'University of Alberta'),
  textLine('      ', 'p', 'B.Sc. Computer Science, Music minor'),
  textLine('      ', 'p', '2017 – 2024'),
  [sp('    '), ...closeTag('section')],
  blank,

  [sp('    '), cmt('<!-- Certifications -->')],
  [sp('    '), ...openTag('section', 'certs')],
  textLine('      ', 'h2', 'Certifications'),
  [sp('      '), ...openTag('ul')],
  tagLine('        ', 'CompTIA A+ (2023)'),
  tagLine('        ', 'Google IT Support Professional'),
  [sp('      '), ...closeTag('ul')],
  [sp('    '), ...closeTag('section')],
  [sp('  '), ...closeTag('aside')],
  closeTag('main'),
];
