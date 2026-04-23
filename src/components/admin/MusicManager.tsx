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
  /** Added by the /api/music GET handler — not in the DB row. */
  audio_public_url?: string;
  cover_public_url?: string | null;
}

type Mode = 'list' | 'upload' | 'edit';

/**
 * Extract the audio file's duration in seconds via an HTMLAudioElement.
 * Zero-dep — the browser's own media pipeline reads the container.
 * Falls back to null for files the browser can't decode; the admin
 * can fill the number in via the edit form.
 */
function extractAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      cleanup();
      resolve(Number.isFinite(d) && d > 0 ? Math.round(d) : null);
    };
    audio.onerror = () => { cleanup(); resolve(null); };
    audio.src = url;
  });
}

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
                ♪
              </div>
              <div>
                <p className="admin-list-title">{t.title}</p>
                <p className="admin-list-meta">
                  {[t.composer, formatDuration(t.duration_seconds)].filter(Boolean).join(' · ') || '—'}
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
  const [duration, setDuration] = useState<number | null>(null);
  const [recordedDate, setRecordedDate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // When the admin picks an audio file, extract the duration via the
  // browser's media pipeline and derive the recorded_date from the
  // file's lastModified timestamp — this is what operating systems
  // expose through the File API and is the closest browser-accessible
  // proxy for "when the file was created" short of parsing ID3 tags
  // (which would require bundling music-metadata here).
  const handleAudioPick = async (picked: File | null) => {
    setAudio(picked);
    setDuration(null);
    setRecordedDate(null);
    if (!picked) return;
    setRecordedDate(new Date(picked.lastModified).toISOString());
    const d = await extractAudioDuration(picked);
    setDuration(d);
  };

  const submit = async (saveStatus: 'draft' | 'live') => {
    if (!audio) {
      setError('Pick an audio file first.');
      return;
    }
    setBusy(true);
    setError(null);
    setProgress('');
    try {
      // 1. Ask the server for presigned PUT URLs. One for the audio
      //    track (required), one for optional cover art. Short-lived
      //    and MIME-bound so a stolen URL can't upload arbitrary data.
      setProgress('Preparing upload…');
      const audioContentType = audio.type || 'audio/mpeg';
      const coverContentType = cover?.type || 'image/jpeg';
      const presignR = await fetch('/api/music/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_filename: audio.name,
          audio_content_type: audioContentType,
          cover_filename: cover?.name,
          cover_content_type: cover ? coverContentType : undefined,
        }),
      });
      const presignData = (await presignR.json().catch(() => ({}))) as {
        id?: string;
        audio_r2_key?: string;
        audio_upload_url?: string;
        cover_r2_key?: string;
        cover_upload_url?: string;
        error?: string;
      };
      if (!presignR.ok || !presignData.id || !presignData.audio_r2_key || !presignData.audio_upload_url) {
        throw new Error(presignData.error ?? `Presign failed (${presignR.status})`);
      }

      // 2. Upload the audio bytes directly to R2. Vercel never sees
      //    the bytes, so the 4.5 MB function-body limit is out of the
      //    loop — R2's per-object ceiling is 5 TB.
      setProgress('Uploading audio…');
      const audioPutR = await fetch(presignData.audio_upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': audioContentType },
        body: audio,
      });
      if (!audioPutR.ok) {
        throw new Error(`Audio upload to storage failed (${audioPutR.status})`);
      }

      // 3. Upload the cover (if any). Same pattern, separate signed URL.
      if (cover && presignData.cover_upload_url) {
        setProgress('Uploading cover…');
        const coverPutR = await fetch(presignData.cover_upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': coverContentType },
          body: cover,
        });
        if (!coverPutR.ok) {
          throw new Error(`Cover upload to storage failed (${coverPutR.status})`);
        }
      }

      // 4. Write the DB row.
      setProgress('Saving details…');
      const metaR = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: presignData.id,
          audio_r2_key: presignData.audio_r2_key,
          audio_filename: audio.name,
          cover_r2_key: presignData.cover_r2_key ?? null,
          cover_filename: cover?.name ?? null,
          title: title || audio.name,
          composer,
          duration_seconds: duration,
          recorded_date: recordedDate,
          status: saveStatus,
        }),
      });
      const metaData = (await metaR.json().catch(() => ({}))) as { error?: string };
      if (!metaR.ok) throw new Error(metaData.error ?? `Save failed (${metaR.status})`);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
      setProgress('');
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
          onChange={(e) => handleAudioPick(e.target.files?.[0] ?? null)}
          required
        />
        <p style={{ fontSize: '0.75rem', color: 'rgba(232,236,244,0.45)', margin: '6px 0 0' }}>
          MP3 / WAV / FLAC / OGG. Duration and recorded date are read the moment you pick the file — bytes upload straight to R2, no size limit.
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
        <label className="admin-label">
          <span>Composer <span style={{ color: 'rgba(232,236,244,0.45)', fontSize: '0.72rem' }}>(optional)</span></span>
          <input className="admin-input" value={composer} onChange={(e) => setComposer(e.target.value)} placeholder="Debussy" />
        </label>
      </div>

      {error ? <div className="admin-error">{error}</div> : null}
      {busy && progress ? (
        <div style={{ fontSize: '0.8rem', color: 'rgba(232,236,244,0.65)', fontStyle: 'italic' }}>
          {progress}
        </div>
      ) : null}

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
// Edit form — metadata only, no re-upload (delete + re-add for that)
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
      // Only send editable fields. type / notes aren't in the UI
      // anymore, but we preserve whatever the legacy row carried so
      // edits on old tracks don't null them out unintentionally.
      const patch = {
        title: form.title,
        composer: form.composer,
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
        <label className="admin-label">
          <span>Composer <span style={{ color: 'rgba(232,236,244,0.45)', fontSize: '0.72rem' }}>(optional)</span></span>
          <input className="admin-input" value={form.composer ?? ''} onChange={(e) => onChange('composer', e.target.value)} />
        </label>
        <label className="admin-label">
          <span>Duration (seconds)</span>
          <input className="admin-input" type="number" value={form.duration_seconds ?? 0} onChange={(e) => onChange('duration_seconds', Number(e.target.value))} />
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
