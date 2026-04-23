import { useState } from 'react';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = username.trim() !== '' && password !== '' && !busy;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `Login failed (${res.status})`);
        return;
      }
      window.location.href = '/admin';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="sl-form" noValidate>
      <label className="sl-field">
        <span className="sl-label">Username</span>
        <input
          className="sl-input"
          type="text"
          autoComplete="username"
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </label>

      <label className="sl-field">
        <span className="sl-label">Password</span>
        <input
          className="sl-input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      {error ? <div className="sl-error" role="alert">{error}</div> : null}

      <button className="sl-submit" disabled={!canSubmit} type="submit">
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
