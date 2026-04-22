/**
 * BrainSvg — two-hemisphere brain diagram.
 *
 * Colors and opacities are driven entirely by the parent hero's
 * data-takeover attribute via CSS. This component is pure geometry.
 */
export default function BrainSvg() {
  return (
    <svg
      className="hero-brain"
      viewBox="0 0 60 68"
      role="img"
      aria-label="Two-hemisphere brain. Right hemisphere highlights on the creative side, left on the tech side."
    >
      {/* Right hemisphere (viewer's left, drives Creative) */}
      <path
        className="hero-brain-right"
        d="M30 3C17 3,5 15,5 34C5 49,14 63,30 63Z"
      />
      {/* Left hemisphere (viewer's right, drives Tech) */}
      <path
        className="hero-brain-left"
        d="M30 3C43 3,55 15,55 34C55 49,46 63,30 63Z"
      />
      {/* Midline */}
      <line
        className="hero-brain-midline"
        x1="30"
        y1="3"
        x2="30"
        y2="63"
      />
      {/* Subtle folds — decoration, stays static */}
      <path className="hero-brain-fold" d="M15 22Q23 20,29 24" />
      <path className="hero-brain-fold" d="M15 35Q22 33,29 37" />
      <path className="hero-brain-fold" d="M15 48Q22 46,29 50" />
      <path className="hero-brain-fold" d="M45 22Q37 20,31 24" />
      <path className="hero-brain-fold" d="M45 35Q38 33,31 37" />
      <path className="hero-brain-fold" d="M45 48Q38 46,31 50" />
    </svg>
  );
}
