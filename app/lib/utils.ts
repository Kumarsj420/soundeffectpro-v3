import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse the URL param for a sound page/API route.
 * Param format: "{slug}-{s_id}"
 *
 * s_id formats supported:
 *   - 32-char hex UUID (new records):  /^[0-9a-f]{32}$/
 *   - 4-6 lowercase alpha (old v1 records): /^[a-z]{4,6}$/
 *
 * Returns { slug, s_id } where s_id may be null if param has no recognised suffix.
 */
export function parseSoundParam(param: string): { slug: string; s_id: string | null } {
  // New records: 32-char hex UUID without dashes
  const v2 = param.match(/^(.+)-([0-9a-f]{32})$/);
  if (v2) return { slug: v2[1], s_id: v2[2] };

  // Old v1 records: 4-6 lowercase alphanumeric chars (e.g. "ikal9", "zqlmx", "iqzs3")
  const v1 = param.match(/^(.+)-([a-z0-9]{4,6})$/);
  if (v1) return { slug: v1[1], s_id: v1[2] };

  return { slug: param, s_id: null };
}