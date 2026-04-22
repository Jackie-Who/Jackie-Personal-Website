import { useEffect, useRef } from 'react';

/**
 * Viscous blob cursor — soft ambient glow with physics.
 *
 * Three blobs chained via spring-follow: the head eases toward the
 * cursor, each subsequent blob eases toward its predecessor. Overlap
 * gives a soft teardrop shape when the cursor accelerates; at rest the
 * stack collapses into a single round glow that reads like the plain
 * radial-gradient light we had before the physics pass.
 *
 * The filter is deliberately gentle — no high-contrast alpha matrix
 * (that's what was making the blob feel like a jiggling sticker and
 * visually "disappearing" when the trail caught up). Just a pair of
 * blurs merged together.
 */

interface BlobSpec {
  radius: number;
  lerp: number;
}

const BLOBS: BlobSpec[] = [
  { radius: 130, lerp: 0.18 }, // head — dominant, tracks cursor tightly
  { radius: 95,  lerp: 0.10 }, // mid — soft trail for stretch
  { radius: 60,  lerp: 0.055 }, // tail — short lag, keeps blob from splitting
];

export default function BlobCursor() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const circleRefs = useRef<Array<SVGCircleElement | null>>([]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const noHover = window.matchMedia('(hover: none)').matches;
    if (reduced || noHover) return;

    const positions = BLOBS.map(() => ({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    }));
    let targetX = positions[0].x;
    let targetY = positions[0].y;
    let visible = false;

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!visible) {
        for (const p of positions) {
          p.x = targetX;
          p.y = targetY;
        }
        svg.style.opacity = '1';
        visible = true;
      }
    };

    const onLeave = () => {
      svg.style.opacity = '0';
      visible = false;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);

    let rafId = 0;
    const tick = () => {
      for (let i = 0; i < BLOBS.length; i += 1) {
        const pos = positions[i];
        const { lerp } = BLOBS[i];
        const ax = i === 0 ? targetX : positions[i - 1].x;
        const ay = i === 0 ? targetY : positions[i - 1].y;
        pos.x += (ax - pos.x) * lerp;
        pos.y += (ay - pos.y) * lerp;

        const c = circleRefs.current[i];
        if (c) {
          c.setAttribute('cx', pos.x.toFixed(2));
          c.setAttribute('cy', pos.y.toFixed(2));
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className="tech-blob-cursor"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        {/* Just a soft blur — no high-contrast alpha matrix. The
            blobs compose naturally via their gradient alpha, so when
            they overlap you get a smooth merged glow, and when they
            separate you get a small natural trail instead of two
            solid shapes splitting apart. */}
        <filter id="blob-soften" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="18" />
        </filter>
        <radialGradient id="blob-fill" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="rgba(110, 175, 225, 0.26)" />
          <stop offset="55%" stopColor="rgba(90, 159, 212, 0.14)" />
          <stop offset="100%" stopColor="rgba(58, 122, 189, 0.0)" />
        </radialGradient>
      </defs>
      <g filter="url(#blob-soften)">
        {BLOBS.map((b, i) => (
          <circle
            key={i}
            ref={(el) => {
              circleRefs.current[i] = el;
            }}
            r={b.radius}
            fill="url(#blob-fill)"
          />
        ))}
      </g>
    </svg>
  );
}
