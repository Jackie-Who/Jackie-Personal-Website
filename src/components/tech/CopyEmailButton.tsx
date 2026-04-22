import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  email: string;
  label: string;
  children?: ReactNode;
  onCopied?: () => void;
}

/**
 * Renders the "Email" pill — click to copy the address to clipboard.
 * Reports success via the optional onCopied prop so the parent can
 * drive a global toast. Falls back to document.execCommand if the
 * async Clipboard API isn't available (older Safari, insecure
 * contexts).
 */
export default function CopyEmailButton({ email, label, children, onCopied }: Props) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    let ok = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
        ok = true;
      } else {
        const ta = document.createElement('textarea');
        ta.value = email;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch {
      ok = false;
    }

    if (ok) {
      setCopied(true);
      onCopied?.();
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 1600);
    }
  }, [email, onCopied]);

  return (
    <button
      type="button"
      className={`tech-link tech-link-copy${copied ? ' tech-link-copied' : ''}`}
      onClick={handleCopy}
      aria-label={copied ? 'Email copied to clipboard' : `Copy email ${email} to clipboard — ${label}`}
      aria-pressed={copied}
      title={label}
    >
      {copied ? (
        <svg className="tech-link-check" viewBox="0 0 16 16" aria-hidden="true">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.5 8.5l3 3 6-6"
          />
        </svg>
      ) : (
        children ?? <span>{label}</span>
      )}
    </button>
  );
}
