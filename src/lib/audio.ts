import { parseBuffer } from 'music-metadata';

/**
 * Audio duration extraction for the track upload pipeline.
 *
 * `music-metadata` parses MP3/FLAC/WAV/OGG headers and returns a
 * format block with a `duration` in seconds. The admin form
 * pre-fills the duration field so the publisher doesn't have to
 * enter it manually.
 */

export interface ExtractedAudio {
  /** Duration in whole seconds (rounded). */
  durationSeconds: number | null;
  /** Container / encoding hint (e.g. "MPEG", "FLAC"). */
  format: string | null;
  /** Bitrate in kbps. */
  bitrate: number | null;
}

export async function extractAudioMetadata(
  buffer: Buffer | Uint8Array,
  mimeType?: string,
): Promise<ExtractedAudio> {
  try {
    const meta = await parseBuffer(
      buffer instanceof Buffer ? buffer : Buffer.from(buffer),
      mimeType ? { mimeType } : undefined,
    );
    return {
      durationSeconds: meta.format.duration ? Math.round(meta.format.duration) : null,
      format: meta.format.container ?? meta.format.codec ?? null,
      bitrate: meta.format.bitrate ? Math.round(meta.format.bitrate / 1000) : null,
    };
  } catch {
    return { durationSeconds: null, format: null, bitrate: null };
  }
}
