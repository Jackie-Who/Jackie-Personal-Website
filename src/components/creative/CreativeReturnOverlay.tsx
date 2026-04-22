/**
 * Mirror of the tech portfolio's ReturnOverlay but for /creative.
 * Slides in from the left (back navigation) showing the hero's
 * neutral three-panel layout so there's no white flash between
 * /creative fading out and the hero mounting.
 */
export default function CreativeReturnOverlay() {
  return (
    <div className="creative-return-overlay" aria-hidden="true">
      <div className="creative-return-panel creative-return-panel-creative" />
      <div className="creative-return-panel creative-return-panel-center" />
      <div className="creative-return-panel creative-return-panel-tech" />
    </div>
  );
}
