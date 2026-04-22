import type { SocialIcon as IconName } from '@/content/resume';

interface Props {
  name: IconName;
  className?: string;
}

/**
 * Inline social / contact icons. 16×16 viewBox. Uses currentColor so
 * parent styling drives the color (hover, focus, active states).
 */
export default function SocialIcon({ name, className }: Props) {
  const cls = className ?? 'social-icon';

  switch (name) {
    case 'github':
      return (
        <svg className={cls} viewBox="0 0 16 16" aria-hidden="true">
          <path
            fill="currentColor"
            d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.88.51-1.08-1.78-.2-3.64-.89-3.64-3.96 0-.88.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.64 7.64 0 014 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.82 1.27.82 2.15 0 3.08-1.87 3.76-3.65 3.96.29.25.54.74.54 1.48v2.2c0 .22.15.46.55.38A8 8 0 0016 8c0-4.42-3.58-8-8-8z"
          />
        </svg>
      );
    case 'email':
      return (
        <svg className={cls} viewBox="0 0 16 16" aria-hidden="true">
          <rect
            x="1.75"
            y="3.5"
            width="12.5"
            height="9"
            rx="1.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M2.5 4.5l5.5 4 5.5-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'instagram':
      return (
        <svg className={cls} viewBox="0 0 16 16" aria-hidden="true">
          <rect
            x="1.75"
            y="1.75"
            width="12.5"
            height="12.5"
            rx="3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="11.7" cy="4.3" r="0.8" fill="currentColor" />
        </svg>
      );
    case 'x':
      return (
        <svg className={cls} viewBox="0 0 16 16" aria-hidden="true">
          <path
            fill="currentColor"
            d="M11.88 1.5h2.29L9.16 7.23 15 14.5h-4.62L6.77 9.92 2.66 14.5H.37l5.36-6.13L.14 1.5h4.74l3.27 4.2L11.88 1.5zm-.8 11.62h1.27L4.98 2.78H3.6l7.48 10.34z"
          />
        </svg>
      );
    default:
      return null;
  }
}
