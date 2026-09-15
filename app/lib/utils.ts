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
/**
 * Truncate a counter to 2 significant digits (347 → 340, 45678 → 45000).
 * Statically cached pages use this instead of exact stats: an exact counter
 * changes on every play, so every ISR revalidation wrote a new copy of the
 * page. Rounded values only change when a bucket is crossed, and revalidations
 * that produce identical output cost no ISR writes.
 */
export function roughCount(n: number): number {
  if (!Number.isFinite(n) || n < 10) return Math.max(0, Math.floor(n || 0));
  const step = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.floor(n / step) * step;
}

/** roughCount() formatted compactly: 340, 1.2K, 45K, 1.3M. */
export function formatRoughCount(n: number): string {
  const r = roughCount(n);
  if (r >= 1_000_000) return `${+(r / 1_000_000).toFixed(1)}M`;
  if (r >= 1_000)     return `${+(r / 1_000).toFixed(1)}K`;
  return String(r);
}
