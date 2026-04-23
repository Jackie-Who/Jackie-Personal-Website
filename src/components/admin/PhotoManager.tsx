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
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [aperture, setAperture] = useState('');
  const [shutter, setShutter] = useState('');
  const [iso, setIso] = useState('');
  const [dateTaken, setDateTaken] = useState<string | null>(null);
  const [status, setStatus] = useState<'draft' | 'live'>('draft');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Measure dimensions AND extract EXIF entirely in the browser.
  // The bytes never leave the client side until the direct-to-R2
  // PUT at submit time — Vercel's 4.5 MB function-body limit never
  // sees the image. exifr is a universal package (Node + browser);
  // dynamic-imported here so the chunk is code-split away from
  // whatever else the admin bundle carries.
  const handleFilePick = async (picked: File | null) => {
    setFile(picked);
    setAspectRatio(null);
    setAperture('');
    setShutter('');
    setIso('');
    setDateTaken(null);
    if (!picked) return;

    // Natural dimensions → aspect ratio (used for layout + gallery
    // slot reservation).
    const objectUrl = URL.createObjectURL(picked);
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setAspectRatio(img.naturalWidth / img.naturalHeight);
      }
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => URL.revokeObjectURL(objectUrl);
    img.src = objectUrl;

    // EXIF — fills the three displayed fields + captures the
    // capture-date for year grouping. Silent on failure so the
    // admin can still edit manually.
    try {
      const mod = (await import('exifr')) as {
        parse: (f: File, opts: unknown) => Promise<Record<string, unknown> | undefined>;
      };
      const raw = await mod.parse(picked, {
        tiff: true,
        exif: true,
        gps: false,
        xmp: false,
        pick: ['FNumber', 'ApertureValue', 'ExposureTime', 'ShutterSpeedValue', 'ISO', 'DateTimeOriginal'],
      });
      if (raw) {
        const f = (raw.FNumber ?? raw.ApertureValue) as number | undefined;
        if (f) setAperture(`ƒ/${Math.round(f * 10) / 10}`);

        const s = (raw.ExposureTime ?? raw.ShutterSpeedValue) as number | undefined;
        if (s) {
          if (s >= 1) setShutter(`${s}s`);
          else setShutter(`1/${Math.round(1 / s)}s`);
        }

        const isoVal = raw.ISO as number | undefined;
        if (isoVal) setIso(`ISO ${isoVal}`);

        const date = raw.DateTimeOriginal as Date | string | undefined;
        if (date) setDateTaken(new Date(date).toISOString());
      }
    } catch {
      /* EXIF absent or unparseable — admin fills manually */
    }
  };

  const submit = async (saveStatus: 'draft' | 'live') => {
    if (!file) {
      setError('Pick a photo file first.');
      return;
    }
    setBusy(true);
    setError(null);
    setProgress('');
    try {
      // 1. Ask the server for a presigned PUT URL. Short-lived
      //    (10 minutes) and content-type-bound so a stolen URL
      //    can't be used to upload arbitrary content.
      setProgress('Preparing upload…');
      const contentType = file.type || 'application/octet-stream';
      const presignR = await fetch('/api/photos/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType }),
      });
      const presignData = (await presignR.json().catch(() => ({}))) as {
        id?: string;
        r2_key?: string;
        upload_url?: string;
        public_url?: string;
        error?: string;
      };
      if (!presignR.ok || !presignData.upload_url || !presignData.id || !presignData.r2_key) {
        throw new Error(presignData.error ?? `Presign failed (${presignR.status})`);
      }

      // 2. Upload the bytes directly to R2. This bypasses Vercel
      //    entirely so the 4.5 MB function-body limit doesn't
      //    apply — R2's object size ceiling is 5 TB.
      setProgress('Uploading to storage…');
      const putR = await fetch(presignData.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });
      if (!putR.ok) {
        throw new Error(`Upload to storage failed (${putR.status})`);
      }

      // 3. Write the DB row now that the bytes are safely at rest
      //    in R2. If this fails, the R2 object is orphaned — not
      //    fatal (it's cheap to re-upload); the admin can re-try.
      setProgress('Saving details…');
      const metaR = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: presignData.id,
          r2_key: presignData.r2_key,
          filename: file.name,
          title: title || file.name,
          aspect_ratio: aspectRatio,
          aperture,
          shutter,
          iso,
          date_taken: dateTaken,
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
        submit(status);
      }}
    >
      <div className="admin-section">
        <h2>Photo file</h2>
        <input
          className="admin-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => handleFilePick(e.target.files?.[0] ?? null)}
          required
        />
        <p style={{ fontSize: '0.75rem', color: 'rgba(232,236,244,0.45)', margin: '6px 0 0' }}>
          JPG / PNG / WebP. EXIF, capture date, and aspect ratio are read the moment you pick the file — no upload size limit (bytes go straight to R2, bypassing the serverless body cap).
        </p>
      </div>

      <div className="admin-section">
        <h2>Details</h2>
        <label className="admin-label">
          <span>Title</span>
          <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Light through vines" />
        </label>
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
          Fields auto-populate from the file's EXIF when a photo is picked. Override anything above before saving.
        </p>
      </div>

      {error ? <div className="admin-error">{error}</div> : null}
      {busy && progress ? (
        <div style={{ fontSize: '0.8rem', color: 'rgba(232,236,244,0.65)', fontStyle: 'italic' }}>
          {progress}
        </div>
      ) : null}

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
        <label className="admin-label">
          <span>Title</span>
          <input className="admin-input" value={form.title} onChange={(e) => onChange('title', e.target.value)} />
        </label>
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
