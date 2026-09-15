// Every counted play is a function invocation plus a DB write, and soundboard
// users replay the same clip rapidly. Count each sound at most once per window
// per browser session — the Map covers client-side navigation, sessionStorage
// covers reloads.
const WINDOW_MS = 30_000;
const lastSent  = new Map<string, number>();

/** `slugWithId` is the canonical "{slug}-{s_id}" URL param. */
export function trackPlay(slugWithId: string) {
    const key = `play:${slugWithId}`;
    const now = Date.now();

    let last = lastSent.get(key) ?? 0;
    try { last = Math.max(last, Number(sessionStorage.getItem(key)) || 0); } catch { /* storage blocked */ }
    if (now - last < WINDOW_MS) return;

    lastSent.set(key, now);
    try { sessionStorage.setItem(key, String(now)); } catch { /* storage blocked */ }

    fetch(`/api/sound/${slugWithId}/play`, { method: "POST", keepalive: true }).catch(() => null);
}
