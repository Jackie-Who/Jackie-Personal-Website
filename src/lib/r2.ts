import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 client wrapper.
 *
 * R2 speaks S3. We use the AWS SDK with a custom endpoint pointing at
 * Cloudflare's `*.r2.cloudflarestorage.com`. The `R2_PUBLIC_URL`
 * prefix is what viewers hit — it's the bucket's public / custom
 * domain exposed via Cloudflare.
 */

let client: S3Client | null = null;

interface R2Env {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
}

function readEnv(): R2Env {
  const env = import.meta.env;
  const get = (k: string) => (env as Record<string, string | undefined>)[k] ?? process.env[k];

  const accountId = get('R2_ACCOUNT_ID');
  const accessKeyId = get('R2_ACCESS_KEY_ID');
  const secretAccessKey = get('R2_SECRET_ACCESS_KEY');
  const bucket = get('R2_BUCKET_NAME');
  const publicUrl = get('R2_PUBLIC_URL');

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error(
      'R2 is not fully configured. Need R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL.',
    );
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

function getClient(): { client: S3Client; bucket: string; publicUrl: string } {
  const env = readEnv();
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.accessKeyId,
        secretAccessKey: env.secretAccessKey,
      },
    });
  }
  return { client, bucket: env.bucket, publicUrl: env.publicUrl };
}

/**
 * Upload a Buffer to R2 under `key`. Returns the public URL
 * (via the bucket's configured public-access URL prefix).
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<{ key: string; publicUrl: string }> {
  const { client: c, bucket, publicUrl } = getClient();
  const params: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  };
  await c.send(new PutObjectCommand(params));
  const normalized = publicUrl.replace(/\/$/, '');
  return { key, publicUrl: `${normalized}/${encodeURI(key)}` };
}

/**
 * Hard-delete an object. Used by the admin delete endpoints so
 * purged rows don't leave orphan blobs.
 */
export async function deleteFromR2(key: string): Promise<void> {
  const { client: c, bucket } = getClient();
  await c.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * Resolve a stored `r2_key` into a viewer-facing URL. Components
 * reading from the DB call this to get the asset href.
 */
export function r2PublicUrl(key: string): string {
  const { publicUrl } = getClient();
  const normalized = publicUrl.replace(/\/$/, '');
  return `${normalized}/${encodeURI(key)}`;
}

/**
 * Generate a collision-safe R2 key: `{prefix}/{id}-{slug}.{ext}`.
 * `slug` is derived from the original filename; kept short to avoid
 * pushing the key beyond R2's 1024-byte limit.
 */
export function buildR2Key(prefix: string, id: string, filename: string): string {
  const ext = (filename.split('.').pop() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const base = filename
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const suffix = ext ? `.${ext}` : '';
  const stem = base ? `${id}-${base}` : id;
  return `${prefix}/${stem}${suffix}`;
}

/** True if R2 env vars are set. Safe to call from pages. */
export function isR2Configured(): boolean {
  try {
    readEnv();
    return true;
  } catch {
    return false;
  }
}
