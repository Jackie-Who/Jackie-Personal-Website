interface Props {
  message: string;
  visible: boolean;
}

/**
 * Global status toast — bottom center, slides up on show, fades out.
 * Wrapped in role=status so screen readers announce messages like
 * "Copied to clipboard" politely without stealing focus.
 */
export default function Toast({ message, visible }: Props) {
  return (
    <div
      className={`tech-toast${visible ? ' tech-toast-visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="tech-toast-dot" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
