import { useCallback, useEffect, useState } from 'react';

interface TrackRow {
  id: string;
  title: string;
  composer: string | null;
  audio_filename: string;
  audio_r2_key: string;
  cover_filename: string | null;
  cover_r2_key: string | null;
  duration_seconds: number | null;
  type: string | null;
  recorded_date: string | null;
  notes: string | null;
  status: string;
  sort_order: number;
  created_at: string;
}

type Mode = 'list' | 'upload' | 'edit';

export default function MusicManager() {
  const [tracks, setTracks] = useState<TrackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<TrackRow | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/music');
      const data = (await r.json()) as { tracks?: TrackRow[]; error?: string };
      if (!r.ok) throw new Error(data.error ?? `Failed to load (${r.status})`);
      setTracks(data.tracks ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onDelete = useCallback(
    async (id: string) => {
      if (!confirm('Delete this track? The audio + cover files in R2 will also be removed.')) return;
      try {
        const r = await fetch(`/api/music/${id}`, { method: 'DELETE' });
        const data = (await r.json().catch(() => ({}))) as { error?: string };
        if (!r.ok) throw new Error(data.error ?? `Delete failed (${r.status})`);
        refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Delete failed');
      }
    },
    [refresh],
  );

  if (mode === 'upload') {
    return (
      <TrackUploadForm
        onCancel={() => setMode('list')}
        onSaved={() => {
          setMode('list');
          refresh();
        }}
      />
    );
  }

  if (mode === 'edit' && editing) {
    return (
      <TrackEditForm
        track={editing}
        onCancel={() => {
          setMode('list');
          setEditing(null);
        }}
        onSaved={() => {
          setMode('list');
          setEditing(null);
          refresh();
        }}
      />
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="admin-btn admin-btn-primary" onClick={() => setMode('upload')}>
          + Add track
        </button>
      </div>
      {error ? <div className="admin-error">{error}</div> : null}
      {loading ? (
        <p style={{ color: 'rgba(232,236,244,0.5)' }}>Loading…</p>
      ) : tracks.length === 0 ? (
        <p style={{ color: 'rgba(232,236,244,0.5)' }}>No tracks yet. Click “+ Add track” to upload one.</p>
      ) : (
        <ul className="admin-list">
          {tracks.map((t) => (
            <li key={t.id} className="admin-list-item">
              <div className="admin-list-thumb" aria-hidden="true" style={{ borderRadius: '50%' }}>
                {t.cover_r2_key ? '♪' : '♪'}
              </div>
              <div>
                <p className="admin-list-title">{t.title}</p>
                <p className="admin-list-meta">
                  {[t.composer, formatDuration(t.duration_seconds), t.type].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <span className={'admin-badge ' + (t.status === 'live' ? 'admin-badge-live' : 'admin-badge-draft')}>
                {t.status}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="admin-btn"
                  onClick={() => {
                    setEditing(t);
                    setMode('edit');
                  }}
                >
                  Edit
                </button>
                <button className="admin-btn admin-btn-danger" onClick={() => onDelete(t.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ------------------------------------------------------------
// Upload form
// ------------------------------------------------------------
interface UploadProps {
  onCancel: () => void;
  onSaved: () => void;
}
function TrackUploadForm({ onCancel, onSaved }: UploadProps) {
  const [audio, setAudio] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [type, setType] = useState<'solo' | 'ensemble' | 'cover'>('solo');
  const [recordedDate, setRecordedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (saveStatus: 'draft' | 'live') => {
    if (!audio) {
      setError('Pick an audio file first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('audio', audio);
      if (cover) fd.append('cover', cover);
      fd.append('title', title || audio.name);
      fd.append('composer', composer);
      fd.append('type', type);
      fd.append('recorded_date', recordedDate);
      fd.append('notes', notes);
      fd.append('status', saveStatus);
      const r = await fetch('/api/music', { method: 'POST', body: fd });
      const data = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(data.error ?? `Upload failed (${r.status})`);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="admin-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit('draft');
      }}
    >
      <div className="admin-section">
        <h2>Audio file</h2>
        <input
          className="admin-input"
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/flac,audio/ogg,audio/*"
          onChange={(e) => setAudio(e.target.files?.[0] ?? null)}
          required
        />
        <p style={{ fontSize: '0.75rem', color: 'rgba(232,236,244,0.45)', margin: '6px 0 0' }}>
          MP3 / WAV / FLAC. Duration will be auto-detected on upload.
        </p>
      </div>

      <div className="admin-section">
        <h2>Cover art (optional)</h2>
        <input
          className="admin-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setCover(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="admin-section">
        <h2>Details</h2>
        <label className="admin-label">
          <span>Title</span>
          <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Syrinx" />
        </label>
        <div className="admin-row">
          <label className="admin-label">
            <span>Composer</span>
            <input className="admin-input" value={composer} onChange={(e) => setComposer(e.target.value)} placeholder="Debussy" />
          </label>
          <label className="admin-label">
            <span>Type</span>
            <select className="admin-select" value={type} onChange={(e) => setType(e.target.value as 'solo' | 'ensemble' | 'cover')}>
              <option value="solo">Solo</option>
              <option value="ensemble">Ensemble</option>
              <option value="cover">Cover</option>
            </select>
          </label>
        </div>
        <div className="admin-row">
          <label className="admin-label">
            <span>Recorded date</span>
            <input className="admin-input" type="date" value={recordedDate} onChange={(e) => setRecordedDate(e.target.value)} />
          </label>
          <label className="admin-label">
            <span>Notes</span>
            <input className="admin-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional program note" />
          </label>
        </div>
      </div>

      {error ? <div className="admin-error">{error}</div> : null}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="admin-btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="admin-btn" disabled={busy || !audio} onClick={() => submit('draft')}>
          {busy ? 'Saving…' : 'Save draft'}
        </button>
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy || !audio} onClick={() => submit('live')}>
          {busy ? 'Publishing…' : 'Publish'}
        </button>
      </div>
    </form>
  );
}

// ------------------------------------------------------------
// Edit form
// ------------------------------------------------------------
interface EditProps {
  track: TrackRow;
  onCancel: () => void;
  onSaved: () => void;
}
function TrackEditForm({ track, onCancel, onSaved }: EditProps) {
  const [form, setForm] = useState(track);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = <K extends keyof TrackRow>(k: K, v: TrackRow[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const patch = {
        title: form.title,
        composer: form.composer,
        type: form.type,
        recorded_date: form.recorded_date,
        notes: form.notes,
        status: form.status,
        sort_order: form.sort_order,
        duration_seconds: form.duration_seconds,
      };
      const r = await fetch(`/api/music/${track.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(data.error ?? `Save failed (${r.status})`);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <div className="admin-section">
        <h2>Details</h2>
        <label className="admin-label">
          <span>Title</span>
          <input className="admin-input" value={form.title} onChange={(e) => onChange('title', e.target.value)} />
        </label>
        <div className="admin-row">
          <label className="admin-label">
            <span>Composer</span>
            <input className="admin-input" value={form.composer ?? ''} onChange={(e) => onChange('composer', e.target.value)} />
          </label>
          <label className="admin-label">
            <span>Type</span>
            <select className="admin-select" value={form.type ?? 'solo'} onChange={(e) => onChange('type', e.target.value)}>
              <option value="solo">Solo</option>
              <option value="ensemble">Ensemble</option>
              <option value="cover">Cover</option>
            </select>
          </label>
        </div>
        <div className="admin-row">
          <label className="admin-label">
            <span>Recorded date</span>
            <input className="admin-input" type="date" value={form.recorded_date ?? ''} onChange={(e) => onChange('recorded_date', e.target.value)} />
          </label>
          <label className="admin-label">
            <span>Duration (seconds)</span>
            <input className="admin-input" type="number" value={form.duration_seconds ?? 0} onChange={(e) => onChange('duration_seconds', Number(e.target.value))} />
          </label>
        </div>
        <label className="admin-label">
          <span>Notes</span>
          <textarea className="admin-textarea" rows={3} value={form.notes ?? ''} onChange={(e) => onChange('notes', e.target.value)} />
        </label>
      </div>

      <div className="admin-section">
        <h2>Publishing</h2>
        <div className="admin-row">
          <label className="admin-label">
            <span>Status</span>
            <select className="admin-select" value={form.status} onChange={(e) => onChange('status', e.target.value)}>
              <option value="draft">Draft</option>
              <option value="live">Live</option>
            </select>
          </label>
          <label className="admin-label">
            <span>Sort order</span>
            <input className="admin-input" type="number" value={form.sort_order} onChange={(e) => onChange('sort_order', Number(e.target.value))} />
          </label>
        </div>
      </div>

      {error ? <div className="admin-error">{error}</div> : null}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="admin-btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
