import { useCallback, useEffect, useState } from 'react';

interface PhotoRow {
  id: string;
  title: string;
  filename: string;
  r2_key: string;
  focal_length: string | null;
  aperture: string | null;
  shutter_speed: string | null;
  iso: string | null;
  camera: string | null;
  lens: string | null;
  category: string | null;
  layout: string;
  status: string;
  sort_order: number;
  created_at: string;
}

type Mode = 'list' | 'upload' | 'edit';

export default function PhotoManager() {
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<PhotoRow | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/photos');
      const data = (await r.json()) as { photos?: PhotoRow[]; error?: string };
      if (!r.ok) throw new Error(data.error ?? `Failed to load (${r.status})`);
      setPhotos(data.photos ?? []);
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
      if (!confirm('Delete this photo? The original file in R2 will also be removed.')) return;
      try {
        const r = await fetch(`/api/photos/${id}`, { method: 'DELETE' });
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
      <PhotoUploadForm
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
      <PhotoEditForm
        photo={editing}
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
          + Add photo
        </button>
      </div>
      {error ? <div className="admin-error">{error}</div> : null}
      {loading ? (
        <p style={{ color: 'rgba(232,236,244,0.5)' }}>Loading…</p>
      ) : photos.length === 0 ? (
        <p style={{ color: 'rgba(232,236,244,0.5)' }}>No photos yet. Click “+ Add photo” to upload one.</p>
      ) : (
        <ul className="admin-list">
          {photos.map((p) => (
            <li key={p.id} className="admin-list-item">
              <div className="admin-list-thumb" aria-hidden="true">{p.layout}</div>
              <div>
                <p className="admin-list-title">{p.title}</p>
                <p className="admin-list-meta">
                  {[p.aperture, p.shutter_speed, p.iso].filter(Boolean).join(' · ') || '— no EXIF —'}
                </p>
              </div>
              <span className={'admin-badge ' + (p.status === 'live' ? 'admin-badge-live' : 'admin-badge-draft')}>
                {p.status}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="admin-btn"
                  onClick={() => {
                    setEditing(p);
                    setMode('edit');
                  }}
                >
                  Edit
                </button>
                <button className="admin-btn admin-btn-danger" onClick={() => onDelete(p.id)}>
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

// ------------------------------------------------------------
// Upload form
// ------------------------------------------------------------
interface UploadProps {
  onCancel: () => void;
  onSaved: () => void;
}
function PhotoUploadForm({ onCancel, onSaved }: UploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [layout, setLayout] = useState<'standard' | 'wide'>('standard');
  const [aperture, setAperture] = useState('');
  const [shutter, setShutter] = useState('');
  const [iso, setIso] = useState('');
  const [status, setStatus] = useState<'draft' | 'live'>('draft');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (saveStatus: 'draft' | 'live') => {
    if (!file) {
      setError('Pick a photo file first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title || file.name);
      fd.append('layout', layout);
      fd.append('aperture', aperture);
      fd.append('shutter', shutter);
      fd.append('iso', iso);
      fd.append('status', saveStatus);
      const r = await fetch('/api/photos', { method: 'POST', body: fd });
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
        submit(status);
      }}
    >
      <div className="admin-section">
        <h2>Photo file</h2>
        <input
          className="admin-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
        <p style={{ fontSize: '0.75rem', color: 'rgba(232,236,244,0.45)', margin: '6px 0 0' }}>
          JPG / PNG / WebP. EXIF will be auto-extracted on upload.
        </p>
      </div>

      <div className="admin-section">
        <h2>Details</h2>
        <div className="admin-row">
          <label className="admin-label">
            <span>Title</span>
            <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Light through vines" />
          </label>
          <label className="admin-label">
            <span>Layout</span>
            <select className="admin-select" value={layout} onChange={(e) => setLayout(e.target.value as 'standard' | 'wide')}>
              <option value="standard">Standard (1 col)</option>
              <option value="wide">Wide (2 cols)</option>
            </select>
          </label>
        </div>
      </div>

      <div className="admin-section">
        <h2>EXIF (auto-filled, editable)</h2>
        <div className="admin-row">
          <label className="admin-label">
            <span>Aperture</span>
            <input className="admin-input" value={aperture} onChange={(e) => setAperture(e.target.value)} placeholder="ƒ/1.8" />
          </label>
          <label className="admin-label">
            <span>Shutter</span>
            <input className="admin-input" value={shutter} onChange={(e) => setShutter(e.target.value)} placeholder="1/125s" />
          </label>
        </div>
        <label className="admin-label">
          <span>ISO</span>
          <input className="admin-input" value={iso} onChange={(e) => setIso(e.target.value)} placeholder="ISO 200" />
        </label>
        <p style={{ fontSize: '0.72rem', color: 'rgba(232,236,244,0.4)', margin: '6px 0 0' }}>
          Blank fields will be populated from EXIF when the file is uploaded.
        </p>
      </div>

      {error ? <div className="admin-error">{error}</div> : null}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="admin-btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="admin-btn" disabled={busy || !file} onClick={() => submit('draft')}>
          {busy ? 'Saving…' : 'Save draft'}
        </button>
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy || !file} onClick={() => submit('live')}>
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
  photo: PhotoRow;
  onCancel: () => void;
  onSaved: () => void;
}
function PhotoEditForm({ photo, onCancel, onSaved }: EditProps) {
  const [form, setForm] = useState(photo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = <K extends keyof PhotoRow>(k: K, v: PhotoRow[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const patch = {
        title: form.title,
        layout: form.layout,
        aperture: form.aperture,
        shutter_speed: form.shutter_speed,
        iso: form.iso,
        status: form.status,
        sort_order: form.sort_order,
      };
      const r = await fetch(`/api/photos/${photo.id}`, {
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
        <div className="admin-row">
          <label className="admin-label">
            <span>Title</span>
            <input className="admin-input" value={form.title} onChange={(e) => onChange('title', e.target.value)} />
          </label>
          <label className="admin-label">
            <span>Layout</span>
            <select className="admin-select" value={form.layout} onChange={(e) => onChange('layout', e.target.value)}>
              <option value="standard">Standard</option>
              <option value="wide">Wide</option>
            </select>
          </label>
        </div>
      </div>

      <div className="admin-section">
        <h2>EXIF</h2>
        <div className="admin-row">
          <label className="admin-label"><span>Aperture</span><input className="admin-input" value={form.aperture ?? ''} onChange={(e) => onChange('aperture', e.target.value)} /></label>
          <label className="admin-label"><span>Shutter</span><input className="admin-input" value={form.shutter_speed ?? ''} onChange={(e) => onChange('shutter_speed', e.target.value)} /></label>
        </div>
        <label className="admin-label"><span>ISO</span><input className="admin-input" value={form.iso ?? ''} onChange={(e) => onChange('iso', e.target.value)} /></label>
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
