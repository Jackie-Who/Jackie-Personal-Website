import { useState, type FormEvent } from 'react';
import SocialIcon from '@/components/shared/SocialIcon';
import { links } from '@/content/resume';
import type { AboutPhase } from './HeroSection';

interface Props {
  /** Current phase. Drawer renders open only when phase === 'contact';
   *  for all other phases the drawer is translated below the viewport
   *  (CSS-driven, so the transition runs in both directions). */
  phase: AboutPhase;
}

const FORMSPREE_ENDPOINT =
  (typeof import.meta !== 'undefined' &&
    (import.meta as { env?: Record<string, string | undefined> }).env
      ?.PUBLIC_FORMSPREE_ENDPOINT) ||
  '';

const FALLBACK_EMAIL = 'jackie.yifei.hu@gmail.com';

type Status = 'idle' | 'sending' | 'sent' | 'error';

/**
 * Contact drawer that slides up from the bottom of the hero when
 * the about-me scroll progresses to the `contact` phase.
 *
 * Style — typography-first, sans-serif (Inter) for a cleaner read
 * than the previous Playfair-everywhere draft. Only the title uses
 * Playfair italic to anchor the moment.
 *
 * Form — name, email, and message all required. Email validates
 * against a basic shape check (server-side validation is the real
 * gate). Posts to PUBLIC_FORMSPREE_ENDPOINT when configured;
 * mailto fallback bakes the visitor's reply-to into the body.
 *
 * Social row — same icon-only LinkedIn / GitHub / Email / Instagram
 * / X buttons used on the tech landing, so the cross-portfolio
 * footer-link consistency stays.
 */
export default function HeroContactDrawer({ phase }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const open = phase === 'contact';

  function validate() {
    if (!name.trim()) return 'Add your name so I know who I\'m talking to.';
    if (!email.trim()) return 'Email please — that\'s how I\'ll write back.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'That email looks off — double-check it for me.';
    }
    if (!message.trim()) return 'Add a message before sending.';
    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'sending') return;
    const err = validate();
    if (err) {
      setStatus('error');
      setErrorMsg(err);
      return;
    }

    if (!FORMSPREE_ENDPOINT) {
      const subject = encodeURIComponent(`Site contact — ${name}`);
      const body = encodeURIComponent(`${message}\n\n— ${name}\nReply to: ${email}`);
      window.location.href = `mailto:${FALLBACK_EMAIL}?subject=${subject}&body=${body}`;
      setStatus('sent');
      return;
    }

    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, _replyto: email }),
      });
      if (!res.ok) throw new Error(`Formspree returned ${res.status}`);
      setStatus('sent');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setStatus('error');
      setErrorMsg(
        err instanceof Error
          ? `${err.message}. Try emailing ${FALLBACK_EMAIL} directly.`
          : `Couldn't send. Try emailing ${FALLBACK_EMAIL} directly.`,
      );
    }
  }

  // Build the social-links row from the same source the tech landing
  // pulls from. Email link is rendered as a plain <a> here (no copy
  // button — the user removed that) so it falls through to the
  // mailto: handler in the user's default client.
  const socialLinks = links.map((l) => {
    const isEmail = l.action === 'copy-email';
    const href = isEmail ? `mailto:${l.href.replace(/^mailto:/, '')}` : l.href;
    return { ...l, href };
  });

  return (
    <div
      className={`hero-contact-drawer${open ? ' is-open' : ''}`}
      aria-hidden={!open}
    >
      <div className="hero-contact-handle" aria-hidden="true">
        <span className="hero-contact-handle-bar" />
      </div>

      <div className="hero-contact-inner">
        <header className="hero-contact-head">
          <h2 className="hero-contact-title">Contact me</h2>
          <p className="hero-contact-sub">
            Hiring, collaborating, or just curious — send a note and I'll
            write back.
          </p>
        </header>

        {status === 'sent' ? (
          <div className="hero-contact-sent" role="status" aria-live="polite">
            <p className="hero-contact-sent-line">Message away.</p>
            <p className="hero-contact-sent-sub">Thanks — I'll reply soon.</p>
          </div>
        ) : (
          <form className="hero-contact-form" onSubmit={handleSubmit} noValidate>
            <div className="hero-contact-row">
              <label className="hero-contact-field">
                <span className="hero-contact-label">name</span>
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="hero-contact-input"
                  placeholder="who's writing"
                  required
                  disabled={status === 'sending'}
                />
              </label>
              <label className="hero-contact-field">
                <span className="hero-contact-label">email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="hero-contact-input"
                  placeholder="where to reply"
                  required
                  disabled={status === 'sending'}
                />
              </label>
            </div>
            <label className="hero-contact-field">
              <span className="hero-contact-label">message</span>
              <textarea
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="hero-contact-textarea"
                placeholder="say what you'd like — short or long, both work"
                rows={3}
                required
                disabled={status === 'sending'}
              />
            </label>
            {status === 'error' && errorMsg && (
              <p className="hero-contact-error" role="alert">
                {errorMsg}
              </p>
            )}
            <div className="hero-contact-actions">
              <button
                type="submit"
                className="hero-contact-send"
                disabled={status === 'sending'}
              >
                {status === 'sending' ? 'sending…' : 'send →'}
              </button>
            </div>
          </form>
        )}

        {/* Social row — icon-only, sits below the form for users who'd
            rather skip the form and reach out through their channel
            of choice. Same five icons as the tech landing for
            cross-page consistency. */}
        <ul className="hero-contact-socials" aria-label="Other ways to reach Jackie">
          {socialLinks.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="hero-contact-social"
                target={l.external ? '_blank' : undefined}
                rel={l.external ? 'noopener noreferrer' : undefined}
                aria-label={l.label}
                title={l.label}
              >
                <SocialIcon name={l.icon} />
              </a>
            </li>
          ))}
        </ul>

        <footer className="hero-contact-footer">
          <p>© 2026 Jackie Hu</p>
        </footer>
      </div>
    </div>
  );
}
