import { links } from '@/content/resume';
import CopyEmailButton from './CopyEmailButton';
import SocialIcon from '@/components/shared/SocialIcon';

interface Props {
  onCopyEmail?: () => void;
}

/**
 * Icon-only social link row — LinkedIn, GitHub, Email, Instagram, X.
 * Email copies to clipboard and swaps to a checkmark on success.
 */
export default function SocialLinks({ onCopyEmail }: Props) {
  return (
    <ul className="tech-socials" aria-label="Contact and social links">
      {links.map((l) => {
        if (l.action === 'copy-email') {
          const address = l.href.replace(/^mailto:/, '');
          return (
            <li key={l.href}>
              <CopyEmailButton email={address} label={l.label} onCopied={onCopyEmail}>
                <SocialIcon name={l.icon} />
              </CopyEmailButton>
            </li>
          );
        }
        return (
          <li key={l.href}>
            <a
              href={l.href}
              className="tech-link"
              target={l.external ? '_blank' : undefined}
              rel={l.external ? 'noopener noreferrer' : undefined}
              aria-label={l.label}
              title={l.label}
            >
              <SocialIcon name={l.icon} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
