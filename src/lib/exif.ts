import exifr from 'exifr';

/**
 * EXIF extraction for the photo upload pipeline.
 *
 * Runs server-side on the uploaded image buffer. Values are
 * normalized into the exact strings the portfolio Photo type
 * expects (e.g. "35mm", "ƒ/1.8", "1/125s", "ISO 200") so the admin
 * form can pre-populate with correct display formats out of the box.
 *
 * Any missing field falls back to null — the admin can edit before
 * publishing.
 */

export interface ExtractedExif {
  focal: string | null;
  aperture: string | null;
  shutter: string | null;
  iso: string | null;
  camera: string | null;
  lens: string | null;
  /** Capture date as ISO string, if present. */
  dateTaken: string | null;
}

interface RawExif {
  FocalLength?: number;
  FocalLengthIn35mmFormat?: number;
  FNumber?: number;
  ApertureValue?: number;
  ExposureTime?: number;
  ShutterSpeedValue?: number;
  ISO?: number;
  Model?: string;
  Make?: string;
  LensModel?: string;
  DateTimeOriginal?: Date | string;
}

export async function extractExif(buffer: Buffer | Uint8Array): Promise<ExtractedExif> {
  let raw: RawExif = {};
  try {
    raw = (await exifr.parse(buffer, {
      tiff: true,
      exif: true,
      gps: false,
      xmp: false,
      pick: [
        'FocalLength',
        'FocalLengthIn35mmFormat',
        'FNumber',
        'ApertureValue',
        'ExposureTime',
        'ShutterSpeedValue',
        'ISO',
        'Model',
        'Make',
        'LensModel',
        'DateTimeOriginal',
      ],
    })) as RawExif;
  } catch {
    // Corrupt/missing EXIF — return nulls and let the admin fill in.
    return empty();
  }
  if (!raw) return empty();

  return {
    focal: formatFocal(raw.FocalLength ?? raw.FocalLengthIn35mmFormat),
    aperture: formatAperture(raw.FNumber ?? raw.ApertureValue),
    shutter: formatShutter(raw.ExposureTime ?? raw.ShutterSpeedValue),
    iso: raw.ISO ? `ISO ${raw.ISO}` : null,
    camera: formatCamera(raw.Make, raw.Model),
    lens: raw.LensModel ?? null,
    dateTaken: raw.DateTimeOriginal
      ? new Date(raw.DateTimeOriginal as Date | string).toISOString()
      : null,
  };
}

function empty(): ExtractedExif {
  return {
    focal: null, aperture: null, shutter: null, iso: null,
    camera: null, lens: null, dateTaken: null,
  };
}

function formatFocal(mm: number | undefined): string | null {
  if (!mm) return null;
  return `${Math.round(mm)}mm`;
}

function formatAperture(f: number | undefined): string | null {
  if (!f) return null;
  // ƒ/1.8 → no trailing zero; ƒ/2.0 → keep '2'
  const rounded = Math.round(f * 10) / 10;
  return `ƒ/${rounded}`;
}

function formatShutter(seconds: number | undefined): string | null {
  if (!seconds) return null;
  if (seconds >= 1) return `${seconds}s`;
  // Express as 1/N for fractions of a second
  const inverted = Math.round(1 / seconds);
  return `1/${inverted}s`;
}

function formatCamera(make: string | undefined, model: string | undefined): string | null {
  if (!make && !model) return null;
  if (!model) return make ?? null;
  if (!make) return model;
  // Avoid "Sony Sony A7 III" when model already includes the brand.
  if (model.toLowerCase().startsWith(make.toLowerCase())) return model;
  return `${make} ${model}`;
}
