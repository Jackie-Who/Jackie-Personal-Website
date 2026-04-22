/**
 * A visual stand-in for the hero's three panels, shown during the
 * back-to-hero transition. Sits at fixed position inset:0 and slides
 * in from the left, "pushing" the tech content to the right.
 *
 * The panel backgrounds match the hero's neutral (data-takeover="neutral")
 * layout, so when navigation fires and the real hero mounts, the
 * visual continues without a flash.
 */
export default function ReturnOverlay() {
  return (
    <div className="tech-return-overlay" aria-hidden="true">
      <div className="tech-return-panel tech-return-panel-creative" />
      <div className="tech-return-panel tech-return-panel-center" />
      <div className="tech-return-panel tech-return-panel-tech" />
    </div>
  );
}
