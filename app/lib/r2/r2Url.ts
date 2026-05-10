export function getR2Url(key?: string | null, forceDownload = false) {
  if (!key) return null;
  return `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`;
}

export function getR2KeyFromUrl(url?: string | null) {
  if (!url) return null;

  const publicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!publicBase) return null;

  try {
    const base = publicBase.replace(/\/+$/, "");
    if (!url.startsWith(base)) return null;

    const key = url.slice(base.length + 1);

    return key || null;
  } catch {
    return null;
  }
}
