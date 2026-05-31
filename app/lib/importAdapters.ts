import type { Category, License } from "./constants";

export interface FetchedSoundMeta {
    title: string;
    audioUrl: string;
    thumbnailUrl?: string;
    tags: string[];
    category: Category;
    license: License;
    description?: string;
    duration?: string;   // "MM:SS" if known from API
    sourceName: string;
}

// ── Category auto-detection ───────────────────────────────────────────────────
const CATEGORY_KEYWORDS: Array<[RegExp, Category]> = [
    [/\b(minecraft|roblox|fortnite|gaming|game|fps|rpg|among us|valorant|gta|cod|pubg|overwatch)\b/i, "Gaming"],
    [/\b(anime|naruto|dragonball|bleach|attack on titan|one piece|demon slayer|jjk|jujutsu|goku|luffy)\b/i, "Anime"],
    [/\b(meme|brainrot|rizz|viral|sigma|skibidi|sus|cringe|funny|tiktok|trending)\b/i, "Meme"],
    [/\b(movie|film|cinema|marvel|dc|star wars|avengers|batman|spider.?man|harry potter)\b/i, "Movies"],
    [/\b(series|tv show|breaking bad|friends|office|stranger things|netflix|episode)\b/i, "Series"],
    [/\b(music|song|beat|rap|hip.?hop|remix|melody|tune|track|instrument)\b/i, "Music"],
    [/\b(sport|football|soccer|basketball|cricket|nba|nfl|goal|referee|whistle)\b/i, "Sports"],
    [/\b(politic|trump|biden|president|congress|debate|election|senate)\b/i, "Politics"],
    [/\b(comedy|joke|standup|laugh|humor|prank|roast)\b/i, "Comedy"],
];

export function detectCategory(text: string): Category {
    for (const [pattern, cat] of CATEGORY_KEYWORDS) {
        if (pattern.test(text)) return cat;
    }
    return "Random";
}

// ── Tag suggestions from title ────────────────────────────────────────────────
export function suggestTags(title: string, existing: string[] = []): string[] {
    const words = title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 2 && w.length <= 15)
        .slice(0, 8);
    return [...new Set([...existing.map(t => t.toLowerCase()), ...words])].slice(0, 10);
}

// ── Seconds → "MM:SS" ────────────────────────────────────────────────────────
export function secsToDuration(secs: number): string {
    const total = Math.min(Math.round(secs), 1200); // cap at 20:00
    const mm = String(Math.floor(total / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");
    return `${mm}:${ss}`;
}

// ── HTML helpers ──────────────────────────────────────────────────────────────
function ogMeta(html: string, prop: string): string {
    const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, "i"))
        ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, "i"));
    return m?.[1] ?? "";
}

function htmlDecode(str: string): string {
    return str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&nbsp;/g, " ");
}

async function fetchHtml(url: string): Promise<string> {
    const resp = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(12_000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} from ${url}`);
    return resp.text();
}

// ── myinstants.com ────────────────────────────────────────────────────────────
async function fetchMyInstants(url: string): Promise<FetchedSoundMeta> {
    const html = await fetchHtml(url);

    // myinstants embeds audio path in onclick, data-*, JSON, or <audio> — search broadly
    const fullUrl = html.match(/https?:\/\/(?:www\.)?myinstants\.com\/media\/sounds\/[^"'?\s\\]+\.mp3/i)?.[0];
    const relPath = html.match(/\/media\/sounds\/[^"'?\s\\]+\.mp3/i)?.[0];
    const audioRaw = fullUrl ?? relPath
        ?? html.match(/<audio[^>]+src=["']([^"']+)["']/i)?.[1]
        ?? html.match(/<source[^>]+src=["']([^"']+\.mp3)["']/i)?.[1];

    if (!audioRaw) throw new Error("Could not find audio URL on myinstants page");

    const audioUrl = audioRaw.startsWith("http") ? audioRaw : `https://www.myinstants.com${audioRaw}`;

    const rawTitle = htmlDecode(ogMeta(html, "title"))
        || htmlDecode(html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] ?? "")
        || htmlDecode(html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? "");
    const title = rawTitle
        .replace(/\s*[-–|]\s*myinstants.*$/i, "")
        .replace(/\s*\|\s*.*$/, "")
        .replace(/\s+sound\s+button\s*$/i, "")  // strip trailing "Sound Button" suffix
        .trim() || "Unknown";

    const image = ogMeta(html, "image");
    const desc = htmlDecode(ogMeta(html, "description")).slice(0, 300);

    return {
        title,
        audioUrl,
        thumbnailUrl: image || undefined,
        tags: suggestTags(title),
        category: detectCategory(title + " " + desc),
        license: "unknown",
        description: desc || undefined,
        sourceName: "myinstants",
    };
}

// ── freesound.org ─────────────────────────────────────────────────────────────
async function fetchFreesound(url: string): Promise<FetchedSoundMeta> {
    const idMatch = url.match(/\/sounds\/(\d+)/);
    if (!idMatch) throw new Error("Could not extract Freesound sound ID from URL");
    const soundId = idMatch[1];

    const apiKey = process.env.FREESOUND_API_KEY;
    if (!apiKey) throw new Error("FREESOUND_API_KEY not configured in environment");

    const apiUrl = `https://freesound.org/apiv2/sounds/${soundId}/?token=${apiKey}`;
    const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(10_000) });
    if (!resp.ok) throw new Error(`Freesound API error: ${resp.status}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await resp.json();

    let license: License = "unknown";
    const lic: string = data.license ?? "";
    if (lic.includes("publicdomain") || lic.includes("zero")) license = "public-domain";
    else if (lic.includes("Attribution") || lic.includes("attribution")) license = "creative-commons";

    const tags = ((data.tags ?? []) as string[]).map(t => t.toLowerCase().slice(0, 15)).slice(0, 10);

    return {
        title: data.name ?? "Unknown",
        audioUrl: data.previews?.["preview-hq-mp3"] ?? data.previews?.["preview-lq-mp3"],
        thumbnailUrl: data.images?.waveform_m ?? undefined,
        tags: suggestTags(data.name ?? "", tags),
        category: detectCategory([data.name, ...tags].join(" ")),
        license,
        description: (data.description ?? "").slice(0, 300) || undefined,
        duration: data.duration ? secsToDuration(data.duration) : undefined,
        sourceName: "freesound",
    };
}

// ── tuna.voicemod.net ─────────────────────────────────────────────────────────
async function fetchTunaVoicemod(url: string): Promise<FetchedSoundMeta> {
    const html = await fetchHtml(url);

    // Try to find JSON-LD or next data
    const nextData = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([^<]+)<\/script>/i)?.[1];
    if (nextData) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const parsed: any = JSON.parse(nextData);
            const sound = parsed?.props?.pageProps?.sound ?? parsed?.props?.pageProps?.soundData;
            if (sound) {
                const title = sound.name ?? sound.title ?? "Unknown";
                const audioUrl = sound.audioUrl ?? sound.preview ?? sound.url;
                if (audioUrl) {
                    return {
                        title,
                        audioUrl,
                        thumbnailUrl: sound.imageUrl ?? sound.thumbnail ?? undefined,
                        tags: suggestTags(title, sound.tags ?? []),
                        category: detectCategory(title),
                        license: "unknown",
                        description: sound.description?.slice(0, 300),
                        sourceName: "tuna.voicemod",
                    };
                }
            }
        } catch {
            // fall through to OG scrape
        }
    }

    // Fallback: scrape OG tags + find audio URL
    const rawTitle = htmlDecode(ogMeta(html, "title")).replace(/\s*[-–|].*$/, "").trim();
    const audioRaw =
        html.match(/<audio[^>]+src=["']([^"']+)["']/i)?.[1] ??
        html.match(/["'](https?:\/\/[^"']+\.mp3[^"']*)["']/i)?.[1] ??
        html.match(/audioUrl["']?\s*:\s*["']([^"']+)["']/i)?.[1];

    if (!audioRaw) throw new Error("Could not find audio URL on tuna.voicemod page");

    return {
        title: rawTitle || "Unknown",
        audioUrl: audioRaw.startsWith("http") ? audioRaw : `https://tuna.voicemod.net${audioRaw}`,
        thumbnailUrl: ogMeta(html, "image") || undefined,
        tags: suggestTags(rawTitle),
        category: detectCategory(rawTitle),
        license: "unknown",
        sourceName: "tuna.voicemod",
    };
}

// ── pixabay.com ───────────────────────────────────────────────────────────────
async function fetchPixabay(url: string): Promise<FetchedSoundMeta> {
    // Extract numeric ID from URL like /sound-effects/name-12345/
    const idMatch = url.match(/[-/](\d{5,})\/?(?:\?|#|$)/);
    if (!idMatch) throw new Error("Could not extract Pixabay sound ID from URL");

    const apiKey = process.env.PIXABAY_API_KEY;
    if (apiKey) {
        const apiUrl = `https://pixabay.com/api/?key=${apiKey}&id=${idMatch[1]}&media_type=music`;
        const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(10_000) });
        if (resp.ok) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data: any = await resp.json();
            const hit = data?.hits?.[0];
            if (hit) {
                const title = htmlDecode(hit.tags?.split(",")[0] ?? "Unknown").trim();
                return {
                    title,
                    audioUrl: hit.audio ?? hit.previewURL,
                    thumbnailUrl: hit.previewURL ?? undefined,
                    tags: (hit.tags ?? "").split(",").map((t: string) => t.trim().toLowerCase()).slice(0, 10),
                    category: detectCategory(hit.tags ?? ""),
                    license: "royalty-free",
                    sourceName: "pixabay",
                };
            }
        }
    }

    // Fallback: HTML scrape
    const html = await fetchHtml(url);
    const rawTitle = htmlDecode(ogMeta(html, "title")).replace(/\s*[-–|].*pixabay.*/i, "").trim();
    const audioRaw =
        html.match(/["'](https?:\/\/cdn\.pixabay\.com\/[^"']+\.mp3)["']/i)?.[1] ??
        html.match(/<audio[^>]+src=["']([^"']+)["']/i)?.[1];

    if (!audioRaw) throw new Error("Could not find audio URL on Pixabay page");

    return {
        title: rawTitle || "Unknown",
        audioUrl: audioRaw,
        thumbnailUrl: ogMeta(html, "image") || undefined,
        tags: suggestTags(rawTitle),
        category: detectCategory(rawTitle),
        license: "royalty-free",
        sourceName: "pixabay",
    };
}

// ── 101soundboards.com ────────────────────────────────────────────────────────
async function fetch101Soundboards(url: string): Promise<FetchedSoundMeta> {
    const html = await fetchHtml(url);

    const rawTitle = htmlDecode(ogMeta(html, "title")).replace(/\s*[-–|].*$/i, "").trim()
        || htmlDecode(html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] ?? "").trim();

    // Audio URL patterns on 101soundboards
    const audioRaw =
        html.match(/["'](https?:\/\/www\.101soundboards\.com\/sounds\/[^"'?]+\.mp3)["']/i)?.[1] ??
        html.match(/data-audio=["']([^"']+)["']/i)?.[1] ??
        html.match(/<source[^>]+src=["']([^"']+\.mp3)["']/i)?.[1] ??
        html.match(/<audio[^>]+src=["']([^"']+)["']/i)?.[1];

    if (!audioRaw) throw new Error("Could not find audio URL on 101soundboards page");

    const audioUrl = audioRaw.startsWith("http") ? audioRaw : `https://www.101soundboards.com${audioRaw}`;

    return {
        title: rawTitle || "Unknown",
        audioUrl,
        thumbnailUrl: ogMeta(html, "image") || undefined,
        tags: suggestTags(rawTitle),
        category: detectCategory(rawTitle),
        license: "unknown",
        sourceName: "101soundboards",
    };
}

// ── Generic HTML scraper fallback ─────────────────────────────────────────────
async function fetchGeneric(url: string): Promise<FetchedSoundMeta> {
    const html = await fetchHtml(url);

    const rawTitle = htmlDecode(ogMeta(html, "title")).replace(/\s*[-–|].*$/, "").trim()
        || htmlDecode(html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] ?? "")
        || "Unknown";

    const audioRaw =
        html.match(/<audio[^>]+src=["']([^"']+\.mp3[^"']*)["']/i)?.[1] ??
        html.match(/<source[^>]+src=["']([^"']+\.mp3[^"']*)["']/i)?.[1] ??
        html.match(/["'](https?:\/\/[^"']+\.mp3)["']/i)?.[1];

    if (!audioRaw) throw new Error("No audio URL found on this page");

    const audioUrl = audioRaw.startsWith("http") ? audioRaw : new URL(audioRaw, url).href;

    return {
        title: rawTitle,
        audioUrl,
        thumbnailUrl: ogMeta(html, "image") || undefined,
        tags: suggestTags(rawTitle),
        category: detectCategory(rawTitle),
        license: "unknown",
        sourceName: new URL(url).hostname,
    };
}

// ── Router ────────────────────────────────────────────────────────────────────
export async function fetchSoundMeta(url: string): Promise<FetchedSoundMeta> {
    const hostname = new URL(url).hostname.replace(/^www\./, "");

    if (hostname === "myinstants.com")      return fetchMyInstants(url);
    if (hostname === "freesound.org")       return fetchFreesound(url);
    if (hostname === "tuna.voicemod.net")   return fetchTunaVoicemod(url);
    if (hostname === "pixabay.com")         return fetchPixabay(url);
    if (hostname === "101soundboards.com")  return fetch101Soundboards(url);

    return fetchGeneric(url);
}
