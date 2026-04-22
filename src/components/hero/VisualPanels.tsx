import type { ReactNode } from 'react';

interface Props {
  creativeBackground: ReactNode;
}

/**
 * Layer 1 — visual panels.
 *
 * Three flex children that resize on parent [data-takeover] changes.
 * The creative panel holds the photo/video backdrop as a child; the
 * center panel is visually empty (the CenterAnchor sits on top of it);
 * the tech panel shows just its label — the code background lives on
 * its own z-layer above the panels so it doesn't move when flex resizes.
 */
export default function VisualPanels({ creativeBackground }: Props) {
  return (
    <div className="hero-panels" aria-hidden="true">
      <div className="hero-panel hero-panel-creative">
        {creativeBackground}
        <div className="hero-panel-labels">
          <span className="hero-panel-label">Creative</span>
          <span className="hero-panel-sub">Music / Photography</span>
        </div>
      </div>
      <div className="hero-panel hero-panel-center" />
      <div className="hero-panel hero-panel-tech">
        <div className="hero-panel-labels">
          <span className="hero-panel-label">Technology</span>
          <span className="hero-panel-sub">Projects / Experience</span>
        </div>
      </div>
    </div>
  );
}
