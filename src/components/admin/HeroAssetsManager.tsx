import { useCallback, useEffect, useRef, useState } from 'react';

interface HeroAssetsRow {
  id: string;
  creative_image_r2_key: string | null;
  creative_image_filename: string | null;
  creative_video_r2_key: string | null;
  creative_video_filename: string | null;
  creative_image_public_url?: string | null;
  creative_video_public_url?: string | null;
  updated_at: string;
}

type Kind = 'image' | 'video';

/**
 * Admin manager for the homepage hero's creative-side assets.
 *
 * Singleton row in the hero_assets table — one image (resting state)
 * and one video (on hover). Uploads use the same presigned-URL flow
 * as photos / music: client → /api/hero-assets/presign → PUT bytes
 * directly to R2 → PUT metadata to /api/hero-assets.
 *
 * Falls back to the built-in CSS placeholder until the admin uploads
 * real assets (see CreativeBackground in src/components/hero/).
 */
export default function HeroAssetsManager() {
  const [assets, setAssets] = useState<HeroAssetsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/hero-assets');
      const data = (await r.json()) as { assets?: HeroAssetsRow; error?: string };
      if (!r.ok) throw new Error(data.error ?? `Failed to load (${r.status})`);
      setAssets(data.assets ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <>
      {error ? <div className="admin-error" style={{ marginBottom: 14 }}>{error}</div> : null}
      <p style={{ color: 'rgba(232,236,244,0.55)', fontSize: '0.86rem', marginBottom: 24 }}>
        These two files drive the creative side of the homepage hero.
        The image shows in the resting state; the video plays on hover.
        Until you upload real ones, the hero falls back to a built-in
        placeholder.
      </p>
      {loading ? (
        <p style={{ color: 'rgba(232,236,244,0.5)' }}>Loading…</p>
      ) : (
        <>
          <AssetUploader
            kind="image"
            currentUrl={assets?.creative_image_public_url ?? null}
            currentFilename={assets?.creative_image_filename ?? null}
            onSaved={refresh}
            accept="image/jpeg,image/png,image/webp"
            label="Resting-state image"
            hint="Shows on the creative side when the viewer isn't hovering. Use a still that captures your aesthetic — landscape works best."
          />
          <AssetUploader
            kind="video"
            currentUrl={assets?.creative_video_public_url ?? null}
            currentFilename={assets?.creative_video_filename ?? null}
            onSaved={refresh}
            accept="video/mp4,video/webm,video/*"
            label="On-hover video"
            hint="Plays when the viewer hovers the creative side. Keep it short (5–10 s, looped is fine) and small (under ~5 MB) so it loads instantly."
          />
        </>
      )}
    </>
  );
}

// ------------------------------------------------------------
// Single-asset uploader — used twice (image + video)
// ------------------------------------------------------------
interface UploaderProps {
  kind: Kind;
  currentUrl: string | null;
  currentFilename: string | null;
  onSaved: () => void;
  accept: string;
  label: string;
  hint: string;
}
function AssetUploader({ kind, currentUrl, currentFilename, onSaved, accept, label, hint }: UploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handlePick = async (file: File) => {
    setBusy(true);
    setError(null);
    setProgress('');
    try {
      // 1. Presign
      setProgress('Preparing upload…');
      const contentType = file.type || (kind === 'image' ? 'image/jpeg' : 'video/mp4');
      const presignR = await fetch('/api/hero-assets/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, filename: file.name, contentType }),
      });
      const presignData = (await presignR.json().catch(() => ({}))) as {
        r2_key?: string;
        upload_url?: string;
        public_url?: string;
        error?: string;
      };
      if (!presignR.ok || !presignData.upload_url || !presignData.r2_key) {
        throw new Error(presignData.error ?? `Presign failed (${presignR.status})`);
      }

      // 2. Direct upload to R2 — bypasses Vercel's 4.5 MB body cap.
      setProgress(kind === 'image' ? 'Uploading image…' : 'Uploading video…');
      const putR = await fetch(presignData.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });
      if (!putR.ok) {
        throw new Error(`Upload to storage failed (${putR.status})`);
      }

      // 3. Save metadata
      setProgress('Saving…');
      const patch =
        kind === 'image'
          ? { creative_image_r2_key: presignData.r2_key, creative_image_filename: file.name }
          : { creative_video_r2_key: presignData.r2_key, creative_video_filename: file.name };
      const metaR = await fetch('/api/hero-assets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const metaData = (await metaR.json().catch(() => ({}))) as { error?: string };
      if (!metaR.ok) throw new Error(metaData.error ?? `Save failed (${metaR.status})`);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
      setProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClear = async () => {
    if (!confirm(`Clear the current ${kind}? The file will stop being used; the R2 object stays in storage.`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const patch =
        kind === 'image'
          ? { creative_image_r2_key: null, creative_image_filename: null }
          : { creative_video_r2_key: null, creative_video_filename: null };
      const r = await fetch('/api/hero-assets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(data.error ?? `Clear failed (${r.status})`);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Clear failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-section">
      <h2>{label}</h2>
      <p style={{ fontSize: '0.78rem', color: 'rgba(232,236,244,0.55)', margin: '0 0 14px' }}>{hint}</p>

      {currentUrl ? (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: '0.78rem', color: 'rgba(232,236,244,0.65)', marginBottom: 8 }}>
            Currently using: <strong style={{ color: '#cfe3f5' }}>{currentFilename ?? '(unnamed)'}</strong>
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '0.5px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
            padding: 10,
            maxWidth: 420,
            aspectRatio: '16 / 10',
          }}>
            {kind === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentUrl}
                alt=""
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            ) : (
              <video
                src={currentUrl}
                controls
                muted
                playsInline
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              />
            )}
          </div>
        </div>
      ) : (
        <div style={{
          padding: '14px 16px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '0.5px dashed rgba(255, 255, 255, 0.12)',
          borderRadius: 8,
          color: 'rgba(232,236,244,0.55)',
          fontSize: '0.82rem',
          marginBottom: 14,
        }}>
          No {kind} uploaded yet — the hero is using the built-in placeholder.
        </div>
      )}

      {error ? <div className="admin-error" style={{ marginBottom: 12 }}>{error}</div> : null}
      {busy && progress ? (
        <div style={{ fontSize: '0.8rem', color: 'rgba(232,236,244,0.65)', fontStyle: 'italic', marginBottom: 12 }}>
          {progress}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          ref={fileInputRef}
          className="admin-input"
          type="file"
          accept={accept}
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handlePick(file);
          }}
          style={{ flex: 1 }}
        />
        {currentUrl ? (
          <button type="button" className="admin-btn admin-btn-danger" onClick={handleClear} disabled={busy}>
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
