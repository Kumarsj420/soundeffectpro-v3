/**
 * Meilisearch client + sync helpers
 *
 * All functions degrade gracefully when MEILI_URL / MEILI_KEY are not set,
 * so the site continues to work on MongoDB search until Meilisearch is live.
 *
 * Setup:
 *   1. Add Meilisearch service on Railway (search "Meilisearch" in template store)
 *      OR use Meilisearch Cloud free tier (100k docs) at cloud.meilisearch.com
 *   2. Set env vars:
 *        MEILI_URL=https://your-instance.railway.app   (or cloud URL)
 *        MEILI_KEY=your-master-or-search-key
 *   3. Run GET /api/cron/sync-meili?secret=<CRON_SECRET> once to index all sounds
 */

import { Meilisearch as MeiliSearch } from "meilisearch";

const MEILI_URL = process.env.MEILI_URL ?? "";
const MEILI_KEY = process.env.MEILI_KEY ?? "";

export const SOUNDS_INDEX = "sounds";

// ── Singleton client ──────────────────────────────────────────────────────────

let _client: MeiliSearch | null = null;

export function getMeiliClient(): MeiliSearch | null {
    if (!MEILI_URL || !MEILI_KEY) return null;
    if (!_client) _client = new MeiliSearch({ host: MEILI_URL, apiKey: MEILI_KEY });
    return _client;
}

// ── Index configuration — call once via /api/cron/sync-meili ─────────────────

export async function configureMeiliIndex() {
    const client = getMeiliClient();
    if (!client) return;
    const index = client.index(SOUNDS_INDEX);
    await index.updateSettings({
        // Order matters: title matches outrank tag matches outrank category
        searchableAttributes: ["title", "tags", "category"],
        filterableAttributes: ["visibility", "category", "license"],
        sortableAttributes:   ["trendScore", "views", "createdAt"],
        rankingRules: [
            "words", "typo", "proximity", "attribute", "sort", "exactness",
        ],
        typoTolerance: {
            enabled: true,
            minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
        },
    });
}

// ── Document shape stored in Meilisearch ─────────────────────────────────────

export interface MeiliSoundDoc {
    s_id:       string;   // primary key
    slug:       string;
    title:      string;
    tags:       string[];
    category:   string;
    license:    string;
    duration:   string;
    trendScore: number;
    views:      number;
    visibility: boolean;
    createdAt:  number;   // unix ms — sortable
}

// ── Sync: add / update one sound ─────────────────────────────────────────────

export async function syncSound(doc: {
    s_id:       string;
    slug?:      string;
    title:      string;
    tags?:      string[];
    category?:  string;
    license?:   string;
    duration?:  string;
    trendScore?: number;
    visibility?: boolean;
    stats?:     { views?: number };
    createdAt?: Date;
}) {
    const client = getMeiliClient();
    if (!client) return;
    const index = client.index(SOUNDS_INDEX);
    await index.addDocuments(
        [{
            s_id:       doc.s_id,
            slug:       doc.slug        ?? "",
            title:      doc.title,
            tags:       doc.tags        ?? [],
            category:   doc.category    ?? "",
            license:    doc.license     ?? "unknown",
            duration:   doc.duration    ?? "00:00",
            trendScore: doc.trendScore  ?? 0,
            views:      doc.stats?.views ?? 0,
            visibility: doc.visibility  ?? true,
            createdAt:  doc.createdAt?.getTime() ?? Date.now(),
        }],
        { primaryKey: "s_id" }
    );
}

// ── Sync: remove one sound ────────────────────────────────────────────────────

export async function removeSound(s_id: string) {
    const client = getMeiliClient();
    if (!client) return;
    await client.index(SOUNDS_INDEX).deleteDocument(s_id);
}

// ── Search ────────────────────────────────────────────────────────────────────

export async function searchSounds(query: string, opts: {
    page?:   number;
    limit?:  number;
    sort?:   "relevant" | "popular" | "newest" | "trending";
}) {
    const client = getMeiliClient();
    if (!client) return null; // caller falls back to MongoDB

    const { page = 1, limit = 20, sort = "relevant" } = opts;

    const sortParam =
        sort === "popular"  ? ["views:desc"]      :
        sort === "newest"   ? ["createdAt:desc"]  :
        sort === "trending" ? ["trendScore:desc"] :
        undefined; // 'relevant' = Meilisearch default ranking

    const result = await client.index(SOUNDS_INDEX).search(query, {
        hitsPerPage: limit,
        page,
        filter:      "visibility = true",
        ...(sortParam && { sort: sortParam }),
        attributesToRetrieve: [
            "s_id","slug","title","tags","category","duration","trendScore","views",
        ],
    });

    return result;
}

// ── Suggest (used by live search dropdown) ────────────────────────────────────

export async function suggestSounds(query: string, limit = 5) {
    const client = getMeiliClient();
    if (!client) return [];

    const result = await client.index(SOUNDS_INDEX).search(query, {
        hitsPerPage: limit,
        filter: "visibility = true",
        attributesToRetrieve: ["s_id", "slug", "title", "duration", "category"],
    });

    return result.hits as { s_id: string; slug: string; title: string; duration: string; category: string }[];
}
