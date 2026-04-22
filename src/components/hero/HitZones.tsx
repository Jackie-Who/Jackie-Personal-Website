import type { KeyboardEvent } from 'react';
import type { Takeover } from './HeroSection';

interface Props {
  onEnterZone: (zone: Takeover) => void;
  onCreativeActivate: () => void;
  onTechActivate: () => void;
  disabled: boolean;
}

/**
 * Layer 3 — invisible interaction layer.
 *
 * Three golden-ratio slices that capture mouse enter / click and
 * keyboard activation (Tab → focus, Enter/Space → activate).
 *
 * The center slice resets takeover to neutral whenever the cursor
 * crosses into it, matching the prototype's "always-returnable"
 * interaction model.
 */
export default function HitZones({
  onEnterZone,
  onCreativeActivate,
  onTechActivate,
  disabled,
}: Props) {
  const onKey = (activate: () => void) => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate();
    }
  };

  return (
    <div className="hero-hitzones" aria-hidden={disabled || undefined}>
      <button
        type="button"
        className="hero-hitzone hero-hitzone-creative"
        aria-label="Enter creative portfolio — flute performances and photography"
        onMouseEnter={() => onEnterZone('creative')}
        onFocus={() => onEnterZone('creative')}
        onClick={() => !disabled && onCreativeActivate()}
        onKeyDown={onKey(onCreativeActivate)}
        disabled={disabled}
      />
      <button
        type="button"
        className="hero-hitzone hero-hitzone-center"
        aria-label="Neutral — Jackie's identity"
        tabIndex={-1}
        onMouseEnter={() => onEnterZone('neutral')}
        onFocus={() => onEnterZone('neutral')}
      />
      <button
        type="button"
        className="hero-hitzone hero-hitzone-tech"
        aria-label="Enter technology portfolio — resume, projects, and engineering work"
        onMouseEnter={() => onEnterZone('tech')}
        onFocus={() => onEnterZone('tech')}
        onClick={() => !disabled && onTechActivate()}
        onKeyDown={onKey(onTechActivate)}
        disabled={disabled}
      />
    </div>
  );
}
