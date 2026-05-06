import { useEffect, useRef } from 'react';
import type { NavState, Takeover } from './HeroSection';

interface Props {
  /** Drives the per-hemisphere active color + target opacity. */
  takeover: Takeover;
  /** Expanding into a side page → fire a click-burst of particles
   *  radiating from that hemisphere before the page swipes. The
   *  loading-* states (post-expansion handoff window) don't
   *  trigger any new effects — the brain is fading out by then. */
  nav: NavState;
}

/**
 * NeuralBrain — Canvas 2D replacement for the static BrainSvg.
 *
 * Renders two hemispheres of nodes (~60 per side on desktop) linked by
 * intra-hemisphere edges + a sparse corpus-callosum bundle bridging
 * the midline. Every frame the rAF loop updates ambient drift, cursor
 * repulsion, cursor parallax (pseudo-3D via z-depth), synapse
 * firing, traveling signal particles, and click-burst particles, then
 * redraws the whole canvas.
 *
 * Why Canvas 2D and not WebGL / Three.js: ~120 nodes + a few hundred
 * edges is trivial for 2D canvas at 60 fps on any device built this
 * decade. Three.js would add ~200 KB gzipped to the landing-page
 * bundle for no visible improvement. The pseudo-3D depth effect
 * (nodes shift based on their z × cursor parallax) gives the feel of
 * 3D without any of the cost.
 *
 * Reduced motion: the rAF loop is skipped entirely; we draw ONCE with
 * nodes at their rest positions, no drift / firing / parallax. Still
 * re-draws on takeover change so colors stay responsive.
 *
 * Mobile (< 720 px): half the node count, no cursor parallax (touch
 * devices don't have a hover cursor), everything else intact.
 */

// ------------------------------------------------------------
// Tuning knobs. Change these to reshape the brain's personality
// without touching the rendering loop.
// ------------------------------------------------------------
const DESKTOP_NODES_PER_HEMI = 60;
const MOBILE_NODES_PER_HEMI = 28;
/** Extra nodes per hemisphere that ONLY appear when that side is
 *  active. Visually evolves the network from "base brain" → "engaged
 *  brain" — the densification is the brain "thinking harder". */
const DESKTOP_EXTRA_PER_HEMI = 26;
const MOBILE_EXTRA_PER_HEMI = 12;
const NEIGHBOR_COUNT = 4;
/** Extras connect to MORE neighbors than base nodes — when they fade
 *  in, the wireframe visibly densifies in the active hemisphere. */
const EXTRA_NEIGHBOR_COUNT = 6;
/** Fraction of canvas width used as the max neighbor distance. */
const NEIGHBOR_MAX_DIST_FRAC = 0.35;
/** Extras get a slightly wider reach so connections cross the lobe
 *  clusters into the base wireframe. */
const EXTRA_NEIGHBOR_DIST_FRAC = 0.42;
const CROSS_HEMI_EDGES = 10;
const REPULSION_RADIUS = 80;
const REPULSION_FORCE = 0.55;
const VELOCITY_DAMPING = 0.86;
const SPRING_LERP = 0.08;
const PARALLAX_LERP = 0.06;
/** Parallax strength as a fraction of canvas width. */
const PARALLAX_STRENGTH = 0.05;
const DRIFT_AMPLITUDE = 1.4;
const FIRE_INTERVAL_MS = 420;
const SIGNAL_SPEED = 0.022;
const CHAIN_CHANCE = 0.4;
const COLOR_LERP = 0.05;
const BURST_COUNT = 30;
const TAKEOVER_SIGNAL_COUNT = 4;
/** Lerp factor for fading extras in / out as their hemi activates. */
const EXTRA_VIS_LERP = 0.05;
/** Ambient thinking-element spawn rate while a hemisphere is active.
 *  Lower than the cursor-reactive rate below — ambient flow is
 *  background atmosphere; cursor-reactive is the loud "you touched
 *  something" feedback. */
const THOUGHT_INTERVAL_MS = 420;
/** Spawn-rate for cursor-area thoughts (popping out where the
 *  pointer is interacting with the wireframe). Faster than ambient
 *  so the response feels direct. */
const CURSOR_THOUGHT_INTERVAL_MS = 180;

// Palette. RGB only — alpha is computed per-node / per-edge.
// Neutral tone darkened so the wireframe reads clearly against the
// near-white (#fafafa) center-panel backdrop — the previous silver
// at rgba .38 was near-invisible on white. Keeping the alpha the
// same and letting the darker RGB do the contrast work.
const COLOR_NEUTRAL = { r: 95, g: 108, b: 128 }; // darker steel
const COLOR_CREATIVE = { r: 199, g: 125, b: 186 }; // #c77dba hero pink
const COLOR_TECH = { r: 90, g: 159, b: 212 };      // #5a9fd4 hero blue

// "Thinking" decorations per hemisphere. Tech gets binary / code
// glyphs that read as logical reasoning; creative gets colored
// shape primitives that read as a broader expressive palette. Both
// spawn from a random node in the active hemisphere and drift
// slightly outward with a mild upward bias, fading over ~2 s.
const TECH_CHARS = ['0', '1', '0', '1', '0', '1', '0', '1', '{', '}', ';', '=', '<', '>', '/', '+'];
const TECH_PALETTE = [
  { r: 90, g: 159, b: 212 },   // #5a9fd4 — primary blue
  { r: 104, g: 197, b: 216 },  // cyan
  { r: 136, g: 207, b: 160 },  // pale green — "matrix" feel
  { r: 140, g: 190, b: 225 },  // soft blue
];
const CREATIVE_PALETTE = [
  { r: 199, g: 125, b: 186 },  // #c77dba — primary pink
  { r: 224, g: 176, b: 96 },   // warm gold
  { r: 215, g: 185, b: 213 },  // lilac
  { r: 240, g: 170, b: 160 },  // peach
  { r: 170, g: 135, b: 200 },  // soft purple
];
type ShapeKind = 'circle' | 'triangle' | 'square' | 'arc';
const CREATIVE_SHAPES: ShapeKind[] = ['circle', 'triangle', 'square', 'arc'];

interface Node {
  /** Rest position (unperturbed center). */
  rx: number;
  ry: number;
  /** Depth in [-1, 1] — drives parallax offset + size + edge alpha. */
  z: number;
  /** Per-node phase offset for the ambient sine drift. */
  phase: number;
  /** Current display position (rest + drift + repulsion velocity). */
  cx: number;
  cy: number;
  /** Repulsion velocity (damped each frame). */
  vx: number;
  vy: number;
  hemi: 'left' | 'right';
  /** Indices of connected neighbor nodes. Edges are rendered each
   *  frame; no separate edges array. */
  neighbors: number[];
  /** True for nodes that only become visible when their hemisphere
   *  is active — fades in / out via the per-hemi extra-vis lerp.
   *  False for the always-visible base wireframe. */
  extra: boolean;
  /** Firing intensity 0..1, decays ~25 frames. */
  firing: number;
  /** Current color (lerped toward target each frame). Keeping these
   *  on the node lets us smoothly transition between takeover
   *  palettes without CSS. */
  r: number;
  g: number;
  b: number;
  a: number;
}

interface Signal {
  fromIdx: number;
  toIdx: number;
  /** Progress along the edge, 0..1. Negative means "delayed start"
   *  (used by the takeover-signal burst to stagger particles). */
  t: number;
  speed: number;
  color: { r: number; g: number; b: number };
  /** If true, arrival may trigger another signal on a random neighbor. */
  chainable: boolean;
}

interface Burst {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Life in 1..0, removed when <= 0. */
  life: number;
  color: { r: number; g: number; b: number };
}

/**
 * Ambient "thinking" particle — a binary digit / code symbol (tech)
 * or a colored shape primitive (creative). Spawned at random nodes
 * on the active hemisphere every ~170 ms while one is active.
 * Drifts outward with a mild upward bias, fades over ~2 s.
 */
interface Thought {
  kind: 'text' | 'shape';
  text?: string;
  shape?: ShapeKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vrot: number;
  /** Font size (text) or radius-ish size (shape) in px. */
  size: number;
  color: { r: number; g: number; b: number };
  /** Life in 1..0 — decays by `decay` each frame. */
  life: number;
  decay: number;
}

// Which hemisphere lights up for each takeover:
//   creative → VIEWER'S LEFT (anatomical right hemisphere drives
//              creativity in the split-brain metaphor)
//   tech     → VIEWER'S RIGHT (anatomical left)
function activeHemi(takeover: Takeover): 'left' | 'right' | null {
  if (takeover === 'creative') return 'left';
  if (takeover === 'tech') return 'right';
  return null;
}

function targetColor(
  hemi: 'left' | 'right',
  takeover: Takeover,
): { r: number; g: number; b: number; a: number } {
  const active = activeHemi(takeover);
  if (active === null) return { ...COLOR_NEUTRAL, a: 0.38 };
  if (hemi === active) {
    const accent = active === 'left' ? COLOR_CREATIVE : COLOR_TECH;
    return { ...accent, a: 0.92 };
  }
  return { ...COLOR_NEUTRAL, a: 0.12 };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function NeuralBrain({ takeover, nav }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Refs mirror props so the long-lived rAF loop can read them
  // without the effect re-binding on every change.
  const takeoverRef = useRef<Takeover>(takeover);
  const navRef = useRef<NavState>(nav);
  useEffect(() => { takeoverRef.current = takeover; }, [takeover]);
  useEffect(() => { navRef.current = nav; }, [nav]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 720px)').matches;
    const nodesPerHemi = isMobile ? MOBILE_NODES_PER_HEMI : DESKTOP_NODES_PER_HEMI;
    const extrasPerHemi = isMobile ? MOBILE_EXTRA_PER_HEMI : DESKTOP_EXTRA_PER_HEMI;

    let W = 0;
    let H = 0;
    let dpr = window.devicePixelRatio || 1;

    let mouseX = -9999;
    let mouseY = -9999;
    let parallaxTargetX = 0;
    let parallaxTargetY = 0;
    let parallaxX = 0;
    let parallaxY = 0;

    const nodes: Node[] = [];
    let signals: Signal[] = [];
    let bursts: Burst[] = [];
    let thoughts: Thought[] = [];
    let lastFireAt = 0;
    let lastThoughtAt = 0;
    let lastCursorThoughtAt = 0;

    // Per-hemisphere extra-node visibility (0..1) — lerped each
    // frame toward the target dictated by the current takeover.
    // When the visibility hits 1, that hemisphere's "evolved"
    // network is fully in; at 0 the brain shows only its base
    // wireframe. The fade smooths the transition either way.
    let leftExtraVis = 0;
    let rightExtraVis = 0;

    let prevTakeover: Takeover = takeoverRef.current;
    let prevNav: NavState = navRef.current;
    let rafId = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const generateNodes = () => {
      nodes.length = 0;
      signals = [];
      bursts = [];
      thoughts = [];

      // Two hemisphere ellipses — narrower in x (inward) so they don't
      // cross the midline; taller in y. Tuned so the aggregate node
      // cloud reads as a stylized brain shape rather than two discs.
      const ellipseRx = W * 0.2;
      const ellipseRy = H * 0.42;
      const centers = [
        { x: W * 0.5 - W * 0.2, y: H * 0.5, hemi: 'left' as const },
        { x: W * 0.5 + W * 0.2, y: H * 0.5, hemi: 'right' as const },
      ];

      // ----- Base nodes (always visible) -----
      // Uniform-area sampling across the hemisphere ellipse. These
      // form the resting "neutral brain" wireframe.
      for (const center of centers) {
        for (let i = 0; i < nodesPerHemi; i++) {
          const theta = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random());
          const dx = r * ellipseRx * Math.cos(theta);
          const dy = r * ellipseRy * Math.sin(theta);
          const rx = center.x + dx;
          const ry = center.y + dy;
          nodes.push({
            rx,
            ry,
            z: (Math.random() - 0.5) * 2,
            phase: Math.random() * Math.PI * 2,
            cx: rx,
            cy: ry,
            vx: 0,
            vy: 0,
            hemi: center.hemi,
            neighbors: [],
            extra: false,
            firing: 0,
            r: COLOR_NEUTRAL.r,
            g: COLOR_NEUTRAL.g,
            b: COLOR_NEUTRAL.b,
            a: 0.38,
          });
        }
      }

      // ----- Extra "evolved" nodes (only visible when active) -----
      // Distributed in TWO LOBE clusters per hemisphere (upper +
      // lower) rather than uniformly. The deliberate clustering is
      // what makes the active network look topologically DIFFERENT
      // from the base wireframe — not just denser, but structured.
      // Reads as the brain "developing additional regions" when the
      // viewer engages a side.
      for (const center of centers) {
        const lobes = [
          { x: center.x + ellipseRx * 0.05, y: center.y - ellipseRy * 0.32, rx: ellipseRx * 0.55, ry: ellipseRy * 0.32 },
          { x: center.x - ellipseRx * 0.05, y: center.y + ellipseRy * 0.32, rx: ellipseRx * 0.55, ry: ellipseRy * 0.32 },
        ];
        const perLobe = Math.ceil(extrasPerHemi / lobes.length);
        for (const lobe of lobes) {
          for (let i = 0; i < perLobe; i++) {
            const theta = Math.random() * Math.PI * 2;
            // Tighter clustering than base — pow(rand, 0.7) biases
            // toward the lobe edge; we want concentration without
            // perfect uniformity.
            const r = Math.pow(Math.random(), 0.7);
            const dx = r * lobe.rx * Math.cos(theta);
            const dy = r * lobe.ry * Math.sin(theta);
            const rx = lobe.x + dx;
            const ry = lobe.y + dy;
            nodes.push({
              rx,
              ry,
              z: (Math.random() - 0.5) * 2,
              phase: Math.random() * Math.PI * 2,
              cx: rx,
              cy: ry,
              vx: 0,
              vy: 0,
              hemi: center.hemi,
              neighbors: [],
              extra: true,
              firing: 0,
              r: COLOR_NEUTRAL.r,
              g: COLOR_NEUTRAL.g,
              b: COLOR_NEUTRAL.b,
              a: 0.38,
            });
          }
        }
      }

      // Intra-hemisphere edges. Two regimes:
      //   - Base nodes connect ONLY to other base nodes within the
      //     standard radius (preserves the resting wireframe).
      //   - Extras connect to MORE neighbors (6 vs. 4) over a wider
      //     radius — and they reach into the base layer. So when
      //     extras fade in, the active hemisphere visibly grows new
      //     bridges into the base structure rather than appearing
      //     as a separate detached cluster.
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        const neighborCount = a.extra ? EXTRA_NEIGHBOR_COUNT : NEIGHBOR_COUNT;
        const maxDist = a.extra
          ? W * EXTRA_NEIGHBOR_DIST_FRAC
          : W * NEIGHBOR_MAX_DIST_FRAC;
        const candidates: { idx: number; d: number }[] = [];
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const b = nodes[j];
          if (b.hemi !== a.hemi) continue;
          // Base nodes ignore extras — keeps the resting topology
          // identical to before. Extras are free to pick up either.
          if (!a.extra && b.extra) continue;
          const dx = b.rx - a.rx;
          const dy = b.ry - a.ry;
          const d = Math.hypot(dx, dy);
          if (d <= maxDist) candidates.push({ idx: j, d });
        }
        candidates.sort((p, q) => p.d - q.d);
        a.neighbors = candidates.slice(0, neighborCount).map((c) => c.idx);
      }

      // Corpus-callosum edges: bridge the two hemispheres at BASE
      // nodes closest to the vertical midline. Restricted to base
      // nodes so the cross-hemisphere signal pulses (used for the
      // takeover-flow burst) always have a stable, always-visible
      // path — they wouldn't if the bridge nodes could fade out.
      const midX = W * 0.5;
      const leftIndexed = nodes
        .map((n, idx) => ({ n, idx }))
        .filter((x) => x.n.hemi === 'left' && !x.n.extra)
        .sort((a, b) => Math.abs(a.n.rx - midX) - Math.abs(b.n.rx - midX))
        .slice(0, CROSS_HEMI_EDGES);
      const rightIndexed = nodes
        .map((n, idx) => ({ n, idx }))
        .filter((x) => x.n.hemi === 'right' && !x.n.extra)
        .sort((a, b) => Math.abs(a.n.rx - midX) - Math.abs(b.n.rx - midX))
        .slice(0, CROSS_HEMI_EDGES);
      const pairCount = Math.min(leftIndexed.length, rightIndexed.length);
      for (let i = 0; i < pairCount; i++) {
        leftIndexed[i].n.neighbors.push(rightIndexed[i].idx);
        rightIndexed[i].n.neighbors.push(leftIndexed[i].idx);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      // Parallax uses VIEWPORT-relative position so the brain reacts
      // to cursor movement anywhere on the page, not just over the
      // canvas itself. The magnitude is bounded by PARALLAX_STRENGTH
      // * canvas size so it never goes crazy.
      const vw = window.innerWidth || 1;
      const vh = window.innerHeight || 1;
      const cx = vw / 2;
      const cy = vh / 2;
      parallaxTargetX = ((e.clientX - cx) / cx) * W * PARALLAX_STRENGTH;
      parallaxTargetY = ((e.clientY - cy) / cy) * H * PARALLAX_STRENGTH;
    };

    const triggerTakeoverSignalFlow = (toward: 'left' | 'right') => {
      // Pick cross-hemisphere edges where the FROM node is on the
      // inactive side and the TO node is on the active side. Stagger
      // the signals by seeding their t values with negative offsets
      // (the render loop skips t < 0, so each one "appears" after a
      // short delay).
      const candidates: { from: number; to: number }[] = [];
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.hemi === toward) continue;
        for (const nbIdx of node.neighbors) {
          if (nodes[nbIdx].hemi === toward) candidates.push({ from: i, to: nbIdx });
        }
      }
      if (candidates.length === 0) return;
      const color = toward === 'left' ? COLOR_CREATIVE : COLOR_TECH;
      for (let k = 0; k < TAKEOVER_SIGNAL_COUNT; k++) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        signals.push({
          fromIdx: pick.from,
          toIdx: pick.to,
          t: -k * 0.18,
          speed: SIGNAL_SPEED * 1.1,
          color,
          chainable: true,
        });
      }
    };

    // Pick characteristic + color for a thought based on the
    // currently active hemisphere — extracted because both ambient
    // and cursor-reactive spawning use it. On neutral, randomly
    // pick text or shape with the muted neutral palette so the
    // cursor-reactive case still works (the ambient case bails on
    // neutral, but cursor interaction still spawns).
    const pickThoughtKindAndColor = (hemi: 'left' | 'right' | null): {
      kind: 'text' | 'shape';
      text?: string;
      shape?: ShapeKind;
      color: { r: number; g: number; b: number };
    } => {
      if (hemi === 'right') {
        return {
          kind: 'text',
          text: TECH_CHARS[Math.floor(Math.random() * TECH_CHARS.length)],
          color: TECH_PALETTE[Math.floor(Math.random() * TECH_PALETTE.length)],
        };
      }
      if (hemi === 'left') {
        return {
          kind: 'shape',
          shape: CREATIVE_SHAPES[Math.floor(Math.random() * CREATIVE_SHAPES.length)],
          color: CREATIVE_PALETTE[Math.floor(Math.random() * CREATIVE_PALETTE.length)],
        };
      }
      // Neutral — mix both kinds with the muted silver tint, so the
      // cursor still elicits a soft response even before a side is
      // committed to.
      if (Math.random() < 0.5) {
        return {
          kind: 'text',
          text: TECH_CHARS[Math.floor(Math.random() * TECH_CHARS.length)],
          color: COLOR_NEUTRAL,
        };
      }
      return {
        kind: 'shape',
        shape: CREATIVE_SHAPES[Math.floor(Math.random() * CREATIVE_SHAPES.length)],
        color: COLOR_NEUTRAL,
      };
    };

    // Cursor-reactive spawning — fires while the pointer is INSIDE
    // the canvas bounds. The thought appears at the cursor with a
    // small radial offset, drifting outward. Visually this reads as
    // the brain "responding" to the touch wherever the viewer is
    // poking at the wireframe.
    const spawnCursorThought = () => {
      const { kind, text, shape, color } = pickThoughtKindAndColor(activeHemi(takeoverRef.current));
      const offsetTheta = Math.random() * Math.PI * 2;
      const offsetR = 8 + Math.random() * 22;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 0.7;
      const decay = 1 / (90 + Math.random() * 50);
      thoughts.push({
        kind,
        text,
        shape,
        x: mouseX + Math.cos(offsetTheta) * offsetR,
        y: mouseY + Math.sin(offsetTheta) * offsetR,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.3,
        rotation: kind === 'shape' ? Math.random() * Math.PI * 2 : 0,
        vrot: kind === 'shape' ? (Math.random() - 0.5) * 0.05 : 0,
        size: kind === 'text' ? 11 + Math.random() * 5 : 4 + Math.random() * 6,
        color,
        life: 1,
        decay,
      });
    };

    const spawnThought = (hemi: 'left' | 'right') => {
      // Anchor on a random VISIBLE node in the active hemisphere.
      // Skip extras while their hemi-vis is still ramping up so
      // thoughts don't appear to spawn from invisible-but-soon-to-be
      // nodes (which reads as "particles from nowhere"). Once the
      // hemi-vis is past 0.4 the extras are visually present enough
      // to anchor on.
      const hemiVis = hemi === 'left' ? leftExtraVis : rightExtraVis;
      const hemiNodes = nodes.filter(
        (n) => n.hemi === hemi && (!n.extra || hemiVis > 0.4),
      );
      if (hemiNodes.length === 0) return;
      const anchor = hemiNodes[Math.floor(Math.random() * hemiNodes.length)];
      const { kind, text, shape, color } = pickThoughtKindAndColor(hemi);
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 0.6;
      const decay = 1 / (110 + Math.random() * 70); // ~1.8–3.0 s at 60 fps
      thoughts.push({
        kind,
        text,
        shape,
        x: anchor.cx,
        y: anchor.cy,
        vx: Math.cos(angle) * speed,
        // Slight upward bias — rising feels more alive than falling.
        vy: Math.sin(angle) * speed - 0.3,
        rotation: kind === 'shape' ? Math.random() * Math.PI * 2 : 0,
        vrot: kind === 'shape' ? (Math.random() - 0.5) * 0.05 : 0,
        size: kind === 'text' ? 11 + Math.random() * 5 : 4 + Math.random() * 6,
        color,
        life: 1,
        decay,
      });
    };

    const triggerBurst = (hemi: 'left' | 'right') => {
      const hemiNodes = nodes.filter((n) => n.hemi === hemi);
      if (hemiNodes.length === 0) return;
      let cx = 0;
      let cy = 0;
      for (const n of hemiNodes) {
        cx += n.cx;
        cy += n.cy;
      }
      cx /= hemiNodes.length;
      cy /= hemiNodes.length;
      const color = hemi === 'left' ? COLOR_CREATIVE : COLOR_TECH;
      for (let i = 0; i < BURST_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3.5;
        bursts.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color,
        });
      }
    };

    const frame = (tNow: number) => {
      // ----- Detect edge-triggered state transitions -----
      const currentTakeover = takeoverRef.current;
      if (currentTakeover !== prevTakeover) {
        if (currentTakeover === 'creative') triggerTakeoverSignalFlow('left');
        else if (currentTakeover === 'tech') triggerTakeoverSignalFlow('right');
        prevTakeover = currentTakeover;
      }
      const currentNav = navRef.current;
      if (currentNav !== prevNav) {
        if (currentNav === 'expanding-creative') triggerBurst('left');
        else if (currentNav === 'expanding-tech') triggerBurst('right');
        prevNav = currentNav;
      }

      // ----- Parallax follow (smooth) -----
      parallaxX = lerp(parallaxX, parallaxTargetX, PARALLAX_LERP);
      parallaxY = lerp(parallaxY, parallaxTargetY, PARALLAX_LERP);

      // ----- Extras visibility per hemisphere -----
      // Target is 1 when this hemisphere is active, 0 otherwise.
      // Smooth lerp gives the "evolving" fade; quicker than the
      // color lerp so the network densification reads as
      // intentional growth rather than a slow tint shift.
      const leftTarget = currentTakeover === 'creative' ? 1 : 0;
      const rightTarget = currentTakeover === 'tech' ? 1 : 0;
      leftExtraVis = lerp(leftExtraVis, leftTarget, EXTRA_VIS_LERP);
      rightExtraVis = lerp(rightExtraVis, rightTarget, EXTRA_VIS_LERP);

      // ----- Node physics + color tween -----
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        // Ambient drift — sine on both axes, offset by the node's phase
        const driftY = Math.sin(tNow * 0.0012 + n.phase) * DRIFT_AMPLITUDE;
        const driftX = Math.sin(tNow * 0.0008 + n.phase * 1.3) * DRIFT_AMPLITUDE * 0.5;
        const baseX = n.rx + driftX;
        const baseY = n.ry + driftY;

        // Cursor repulsion: nodes within REPULSION_RADIUS get pushed
        // radially outward, velocity scaled by closeness.
        if (mouseX > -9000) {
          const dx = n.cx - mouseX;
          const dy = n.cy - mouseY;
          const d = Math.hypot(dx, dy);
          if (d < REPULSION_RADIUS && d > 0.01) {
            const push = ((REPULSION_RADIUS - d) / REPULSION_RADIUS) * REPULSION_FORCE;
            n.vx += (dx / d) * push;
            n.vy += (dy / d) * push;
          }
        }

        // Damp velocity, apply, then spring back toward the drift-
        // perturbed rest position.
        n.vx *= VELOCITY_DAMPING;
        n.vy *= VELOCITY_DAMPING;
        n.cx += n.vx;
        n.cy += n.vy;
        n.cx = lerp(n.cx, baseX, SPRING_LERP);
        n.cy = lerp(n.cy, baseY, SPRING_LERP);

        // Color tween toward target (depends on hemi + takeover).
        const tgt = targetColor(n.hemi, currentTakeover);
        n.r = lerp(n.r, tgt.r, COLOR_LERP);
        n.g = lerp(n.g, tgt.g, COLOR_LERP);
        n.b = lerp(n.b, tgt.b, COLOR_LERP);
        n.a = lerp(n.a, tgt.a, COLOR_LERP);

        // Firing decay
        if (n.firing > 0) n.firing = Math.max(0, n.firing - 0.04);
      }

      // ----- Random synapse fire (on active hemisphere when there is one) -----
      if (tNow - lastFireAt > FIRE_INTERVAL_MS + Math.random() * 300) {
        lastFireAt = tNow;
        const active = activeHemi(currentTakeover);
        const pool = active
          ? nodes.filter((n) => n.hemi === active)
          : nodes;
        if (pool.length > 0) {
          const fromNode = pool[Math.floor(Math.random() * pool.length)];
          const fromIdx = nodes.indexOf(fromNode);
          if (fromNode.neighbors.length > 0) {
            const toIdx = fromNode.neighbors[Math.floor(Math.random() * fromNode.neighbors.length)];
            const color =
              active === 'left' ? COLOR_CREATIVE : active === 'right' ? COLOR_TECH : COLOR_NEUTRAL;
            signals.push({
              fromIdx,
              toIdx,
              t: 0,
              speed: SIGNAL_SPEED,
              color,
              chainable: true,
            });
            fromNode.firing = 1;
          }
        }
      }

      // ----- Signal travel + chain on arrival -----
      const nextSignals: Signal[] = [];
      for (const s of signals) {
        s.t += s.speed;
        if (s.t >= 1) {
          const toNode = nodes[s.toIdx];
          if (toNode) {
            toNode.firing = 1;
            if (s.chainable && Math.random() < CHAIN_CHANCE && toNode.neighbors.length > 0) {
              const nextTo =
                toNode.neighbors[Math.floor(Math.random() * toNode.neighbors.length)];
              nextSignals.push({
                fromIdx: s.toIdx,
                toIdx: nextTo,
                t: 0,
                speed: s.speed,
                color: s.color,
                // 50% chance each chain step — probabilistic depth limit.
                chainable: Math.random() < 0.5,
              });
            }
          }
        } else {
          nextSignals.push(s);
        }
      }
      signals = nextSignals;

      // ----- Burst particle physics -----
      bursts = bursts.filter((b) => {
        b.x += b.vx;
        b.y += b.vy;
        b.vx *= 0.92;
        b.vy *= 0.92;
        b.life -= 0.025;
        return b.life > 0;
      });

      // ----- "Thinking" particle spawn + physics -----
      // TWO sources:
      //   1. Ambient: while a hemisphere is active, spawn from a
      //      random active-hemi node every ~420 ms. Background
      //      atmosphere — sparse on purpose so the cursor source
      //      below has something to add.
      //   2. Cursor-reactive: while the pointer is inside the
      //      canvas bounds, spawn at the cursor every ~180 ms.
      //      Fires regardless of takeover state so the brain
      //      "responds" wherever the viewer is poking at it,
      //      even on neutral.
      const activeForThought = activeHemi(currentTakeover);
      if (activeForThought && tNow - lastThoughtAt > THOUGHT_INTERVAL_MS) {
        lastThoughtAt = tNow;
        spawnThought(activeForThought);
      }
      const cursorInBounds =
        mouseX > -9000 && mouseX >= 0 && mouseX < W && mouseY >= 0 && mouseY < H;
      if (cursorInBounds && tNow - lastCursorThoughtAt > CURSOR_THOUGHT_INTERVAL_MS) {
        lastCursorThoughtAt = tNow;
        spawnCursorThought();
      }
      thoughts = thoughts.filter((t) => {
        t.x += t.vx;
        t.y += t.vy;
        // Mild air-resistance decel so thoughts don't shoot off.
        t.vx *= 0.985;
        t.vy *= 0.985;
        // Tiny gravity pulling downward so risers eventually settle.
        t.vy += 0.005;
        t.rotation += t.vrot;
        t.life -= t.decay;
        return t.life > 0;
      });

      // ----- Draw -----
      drawScene();

      rafId = window.requestAnimationFrame(frame);
    };

    const drawScene = () => {
      ctx.clearRect(0, 0, W, H);

      // Pseudo-3D projection: shift each node by parallax × z. Positive
      // z pushes toward the cursor, negative away — giving a genuine
      // depth feel without an actual 3D pipeline.
      const proj = (n: Node): { x: number; y: number } => ({
        x: n.cx + parallaxX * n.z,
        y: n.cy + parallaxY * n.z,
      });

      // Helper: how visible is this node right now? Base nodes are
      // always 1. Extras follow their hemisphere's lerp toward
      // active. Used to gate both node + edge alpha.
      const visOf = (n: Node): number => {
        if (!n.extra) return 1;
        return n.hemi === 'left' ? leftExtraVis : rightExtraVis;
      };

      // Edges under nodes — thinner + lower alpha than the nodes so
      // they read as wiring, not fills. Edge alpha is gated by the
      // MIN of its endpoints' visibility — extras-to-base edges
      // fade with the extras while base-to-base stays solid.
      ctx.lineWidth = 0.6;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        const aVis = visOf(a);
        if (aVis < 0.02) continue;
        for (const nbIdx of a.neighbors) {
          // Dedupe each undirected edge: only render when neighbor
          // index is greater than ours (or the neighbor doesn't have
          // us back — asymmetric, takes the first half).
          if (nbIdx <= i) {
            const b = nodes[nbIdx];
            if (b.neighbors.indexOf(i) !== -1) continue;
          }
          const b = nodes[nbIdx];
          const bVis = visOf(b);
          const edgeVis = Math.min(aVis, bVis);
          if (edgeVis < 0.02) continue;
          const pa = proj(a);
          const pb = proj(b);
          const avgA = ((a.a + b.a) * 0.5) * 0.42 * edgeVis;
          const avgR = (a.r + b.r) * 0.5;
          const avgG = (a.g + b.g) * 0.5;
          const avgB = (a.b + b.b) * 0.5;
          ctx.strokeStyle = `rgba(${avgR | 0}, ${avgG | 0}, ${avgB | 0}, ${avgA})`;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
        }
      }

      // "Thinking" particles — binary + code glyphs on tech,
      // colored shapes on creative. Drawn BEFORE nodes so the
      // neural web stays in front, reading as the primary
      // structure while the thoughts are its ambient halo.
      for (const t of thoughts) {
        const alpha = Math.max(0, Math.min(1, t.life * 1.5));
        if (alpha <= 0.01) continue;
        ctx.save();
        ctx.translate(t.x, t.y);
        if (t.vrot !== 0) ctx.rotate(t.rotation);
        if (t.kind === 'text' && t.text) {
          ctx.font = `${t.size | 0}px "JetBrains Mono", "Fira Code", "Courier New", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = `rgba(${t.color.r}, ${t.color.g}, ${t.color.b}, ${alpha * 0.85})`;
          ctx.fillText(t.text, 0, 0);
        } else if (t.kind === 'shape') {
          ctx.fillStyle = `rgba(${t.color.r}, ${t.color.g}, ${t.color.b}, ${alpha * 0.78})`;
          switch (t.shape) {
            case 'circle':
              ctx.beginPath();
              ctx.arc(0, 0, t.size, 0, Math.PI * 2);
              ctx.fill();
              break;
            case 'triangle':
              ctx.beginPath();
              ctx.moveTo(0, -t.size);
              ctx.lineTo(t.size * 0.866, t.size * 0.5);
              ctx.lineTo(-t.size * 0.866, t.size * 0.5);
              ctx.closePath();
              ctx.fill();
              break;
            case 'square':
              ctx.fillRect(-t.size * 0.7, -t.size * 0.7, t.size * 1.4, t.size * 1.4);
              break;
            case 'arc':
              ctx.beginPath();
              ctx.arc(0, 0, t.size, 0, Math.PI);
              ctx.fill();
              break;
          }
        }
        ctx.restore();
      }

      // Nodes — size scales with z (closer = bigger) and firing boost.
      // Extras' alpha is gated by their hemi's visibility lerp so
      // they fade in / out smoothly as the active hemisphere
      // engages or releases.
      for (const n of nodes) {
        const nodeVis = visOf(n);
        if (nodeVis < 0.02) continue;
        const p = proj(n);
        const size = 1.7 * (1 + n.z * 0.35) + n.firing * 2.6;
        const alpha = n.a * nodeVis;
        ctx.fillStyle = `rgba(${n.r | 0}, ${n.g | 0}, ${n.b | 0}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, size), 0, Math.PI * 2);
        ctx.fill();
      }

      // Traveling signal particles — brighter than nodes + small glow ring.
      for (const s of signals) {
        if (s.t < 0) continue;
        const from = nodes[s.fromIdx];
        const to = nodes[s.toIdx];
        if (!from || !to) continue;
        const pa = proj(from);
        const pb = proj(to);
        const x = pa.x + (pb.x - pa.x) * s.t;
        const y = pa.y + (pb.y - pa.y) * s.t;
        // Glow ring
        ctx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, 0.25)`;
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        // Core
        ctx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, 0.95)`;
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Click-burst particles — radiate from active-hemisphere centroid.
      for (const b of bursts) {
        ctx.fillStyle = `rgba(${b.color.r}, ${b.color.g}, ${b.color.b}, ${b.life})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 1.3 + (1 - b.life) * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // ----- Mount -----
    resize();
    generateNodes();
    // Seed colors at their neutral target so the initial paint is
    // already correct rather than tweening in from nothing.
    for (const n of nodes) {
      const tgt = targetColor(n.hemi, takeoverRef.current);
      n.r = tgt.r;
      n.g = tgt.g;
      n.b = tgt.b;
      n.a = tgt.a;
    }
    drawScene();

    // Resize regenerates the node graph to keep the ellipse ratios
    // sensible across viewport changes. Throttling isn't necessary —
    // resize doesn't fire at high frequency.
    const onResize = () => {
      resize();
      generateNodes();
    };
    window.addEventListener('resize', onResize);

    // ------------------------------------------------------------
    // Visibility-aware rAF gating.
    //
    // The brain's canvas redraws ~60 fps continuously while the
    // component is mounted. Three states make that work wasted:
    //
    //  1. Tab is hidden (alt-tab, switch tab) — `document.visibilityState`
    //  2. About / contact phase active — `.hero-brain-layer` opacity:0
    //     hides the canvas, but the rAF kept drawing into it
    //  3. Brain canvas scrolled out of viewport — extreme on this site
    //     since the hero IS the viewport, but covered by IO as defense
    //     in depth (e.g. very small screens with URL-bar visibility
    //     changes, dev-tools open shrinking the canvas to 0×0).
    //
    // We DO NOT pause during expanding-* / loading-* nav states: the
    // click-burst particles need to render through the 420 ms canvas
    // opacity fade-out for the "brain bursts before the page swipes"
    // beat to read.
    // ------------------------------------------------------------
    const heroApp = canvas.closest('.hero-app') as HTMLElement | null;
    let tabHidden = document.visibilityState === 'hidden';
    let aboutHidden = (heroApp?.getAttribute('data-about-phase') ?? 'hero') !== 'hero';
    let onScreen = true; // optimistic until IO says otherwise

    const shouldRun = (): boolean => !tabHidden && !aboutHidden && onScreen;

    const start = () => {
      if (rafId) return;
      if (reduced) return; // reduced-motion never animates
      if (!shouldRun()) return;
      rafId = window.requestAnimationFrame(frame);
    };
    const stop = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const onVisibility = () => {
      const next = document.visibilityState === 'hidden';
      if (next === tabHidden) return;
      tabHidden = next;
      if (tabHidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Watch hero-app's data-about-phase attribute. When it leaves
    // 'hero' the brain layer fades to opacity 0 via CSS — pausing
    // the rAF leaves the LAST drawn frame frozen on the canvas,
    // which the CSS opacity transition fades out smoothly. On
    // return to 'hero' we restart immediately so the canvas is
    // already animating during the fade-in.
    const aboutObserver: MutationObserver | null = heroApp
      ? new MutationObserver((muts) => {
          for (const m of muts) {
            if (m.attributeName !== 'data-about-phase') continue;
            const next = (heroApp.getAttribute('data-about-phase') ?? 'hero') !== 'hero';
            if (next === aboutHidden) continue;
            aboutHidden = next;
            if (aboutHidden) stop();
            else start();
          }
        })
      : null;
    aboutObserver?.observe(heroApp!, {
      attributes: true,
      attributeFilter: ['data-about-phase'],
    });

    // Geometric-visibility safety net. Pauses the loop if the canvas
    // is somehow scrolled out of view or sized to zero. Not the
    // primary signal, but cheap and prevents obscure regressions.
    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              for (const e of entries) {
                const next = e.isIntersecting;
                if (next === onScreen) continue;
                onScreen = next;
                if (!onScreen) stop();
                else start();
              }
            },
            { rootMargin: '64px' },
          )
        : null;
    io?.observe(canvas);

    if (!reduced) {
      if (!isMobile) {
        window.addEventListener('pointermove', onPointerMove, { passive: true });
      }
      // Initial kickoff goes through start() so it respects the same
      // gating logic as later restarts. Equivalent to the old direct
      // requestAnimationFrame call when shouldRun() is true at mount.
      start();
    }

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      aboutObserver?.disconnect();
      io?.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="hero-neural-brain"
      aria-hidden="true"
    />
  );
}
