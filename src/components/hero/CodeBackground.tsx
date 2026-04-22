import { useEffect, useRef } from 'react';
import { CODE_LINES, type Line, type Token } from './code-content';

const TYPE_INTERVAL_MS = 8;
const LOOP_RESTART_DELAY_MS = 500;

interface Props {
  typing: boolean;
}

/**
 * Typed code background, imperative for perf.
 *
 * We touch DOM directly (via refs) because driving a 16ms/char render
 * through React state would re-render the whole tree at ~60Hz.
 *
 * Behavior:
 *   - typing=false  → render every line statically at opacity 0.3
 *   - typing=true   → clear, type char-by-char, auto-scroll as lines
 *                     overflow. Loops after a brief pause.
 *   - prefers-reduced-motion: always render statically; no animation.
 */
export default function CodeBackground({ typing }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const loopTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const clearTimers = () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (loopTimeoutRef.current !== null) {
        window.clearTimeout(loopTimeoutRef.current);
        loopTimeoutRef.current = null;
      }
    };

    if (!typing || prefersReducedMotion) {
      clearTimers();
      renderStatic(el);
      return () => {
        clearTimers();
      };
    }

    // Typing state: clear and animate
    clearTimers();
    el.innerHTML = '';
    el.scrollTop = 0;

    let lineIndex = 0;
    let charIndex = 0;
    let currentLineEl: HTMLDivElement | null = null;

    const tick = () => {
      // End of content — pause, then restart
      if (lineIndex >= CODE_LINES.length) {
        clearTimers();
        const cursor = el.querySelector('.hero-code-cursor');
        cursor?.remove();
        loopTimeoutRef.current = window.setTimeout(() => {
          el.innerHTML = '';
          lineIndex = 0;
          charIndex = 0;
          currentLineEl = null;
          intervalRef.current = window.setInterval(tick, TYPE_INTERVAL_MS);
        }, LOOP_RESTART_DELAY_MS);
        return;
      }

      const line = CODE_LINES[lineIndex];
      const flatText = line.map((t) => t.t).join('');

      // Start a new line
      if (!currentLineEl) {
        currentLineEl = buildLineScaffold(lineIndex + 1);
        el.appendChild(currentLineEl);
        charIndex = 0;
      }

      // Finish line & advance
      if (charIndex >= flatText.length) {
        const cursor = currentLineEl.querySelector('.hero-code-cursor');
        cursor?.remove();
        lineIndex += 1;
        currentLineEl = null;
        el.scrollTop = el.scrollHeight;
        return;
      }

      writeCharAt(currentLineEl, line, charIndex);
      charIndex += 1;
      el.scrollTop = el.scrollHeight;
    };

    intervalRef.current = window.setInterval(tick, TYPE_INTERVAL_MS);

    return () => {
      clearTimers();
    };
  }, [typing]);

  // Outer wrapper is the element that slides — React never mutates
  // its subtree beyond one child, so Chromium's transition engine
  // doesn't pin `translate` on it. The inner container is the one
  // CodeBackground writes into imperatively.
  return (
    <div className="hero-code-wrap" aria-hidden="true">
      <div
        ref={containerRef}
        className="hero-code"
        role="presentation"
      />
    </div>
  );
}

// ---------------------------------------------------------------
// Static render — all lines at once, used when typing is off.
// ---------------------------------------------------------------
function renderStatic(container: HTMLDivElement) {
  container.innerHTML = '';
  CODE_LINES.forEach((line, i) => {
    const row = document.createElement('div');
    row.className = 'hero-code-line';
    row.appendChild(buildGutter(i + 1));
    for (const tok of line) {
      if (!tok.t) continue;
      row.appendChild(buildTokenSpan(tok));
    }
    container.appendChild(row);
  });
  container.scrollTop = 0;
}

// ---------------------------------------------------------------
// Typing helpers
// ---------------------------------------------------------------
function buildLineScaffold(lineNumber: number): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'hero-code-line';
  row.appendChild(buildGutter(lineNumber));
  return row;
}

function buildGutter(n: number): HTMLSpanElement {
  const gutter = document.createElement('span');
  gutter.className = 'hero-code-gutter';
  gutter.textContent = String(n).padStart(2, ' ') + '  ';
  return gutter;
}

function buildTokenSpan(token: Token): HTMLSpanElement {
  const span = document.createElement('span');
  if (token.c) span.className = `hero-code-${token.c}`;
  span.textContent = token.t;
  return span;
}

/**
 * Append the next character to the active line, creating token spans
 * as we cross token boundaries. Also replants the cursor at the end.
 */
function writeCharAt(lineEl: HTMLDivElement, line: Line, flatIndex: number) {
  // Locate which token this char lives in
  let accum = 0;
  let tokenIndex = 0;
  let indexInToken = 0;
  for (let i = 0; i < line.length; i += 1) {
    const t = line[i].t;
    if (accum + t.length > flatIndex) {
      tokenIndex = i;
      indexInToken = flatIndex - accum;
      break;
    }
    accum += t.length;
  }

  // Token spans live as siblings after the gutter (and the cursor)
  const tokenSpans = Array.from(lineEl.children).filter(
    (c) => c.classList.contains('hero-code-token-slot'),
  ) as HTMLSpanElement[];

  // Ensure a span exists for this token index
  let span = tokenSpans[tokenIndex];
  if (!span) {
    span = document.createElement('span');
    span.className = 'hero-code-token-slot';
    const kind = line[tokenIndex].c;
    if (kind) span.classList.add(`hero-code-${kind}`);
    // Drop the cursor first if present; we'll re-append it below
    const existingCursor = lineEl.querySelector('.hero-code-cursor');
    existingCursor?.remove();
    lineEl.appendChild(span);
  }

  // Grow the text for the current token by one char
  const fullTokenText = line[tokenIndex].t;
  span.textContent = fullTokenText.substring(0, indexInToken + 1);

  // Ensure cursor sits at the very end
  const cursor = lineEl.querySelector('.hero-code-cursor');
  cursor?.remove();
  const newCursor = document.createElement('span');
  newCursor.className = 'hero-code-cursor';
  lineEl.appendChild(newCursor);
}
