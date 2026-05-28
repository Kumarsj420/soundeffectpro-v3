/**
 * GET /api/cron/sync-meili
 *
 * Full re-index of all visible sounds into Meilisearch.
 * Run once after setting up Meilisearch, then re-run if the index goes stale.
 *
 * Also configures index settings (searchable attrs, filters, typo tolerance).
 * Safe to run multiple times — Meilisearch upserts documents.
 *
 * Auth: x-cron-secret header OR ?secret= query param (same CRON_SECRET as trend cron).
 *
 * Processes in batches of 500 to stay within request memory limits.
 */

import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import { getMeiliClient, SOUNDS_INDEX, configureMeiliIndex } from "@/app/lib/meilisearch";
import type { MeiliSoundDoc } from "@/app/lib/meilisearch";

export const dynamic = "force-dynamic";
// Give up to 5 min for large libraries
export const maxDuration = 300;

const BATCH = 500;

export async function GET(req: Request) {
    const secret =
        req.headers.get("x-cron-secret") ??
        new URL(req.url).searchParams.get("secret");

    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = getMeiliClient();
    if (!client) {
        return Response.json({
            error: "MEILI_URL or MEILI_KEY not set — Meilisearch not configured",
        }, { status: 503 });
    }

    const startedAt = Date.now();
    await connectDB();

    // Configure index settings first
    await configureMeiliIndex();

    const index = client.index(SOUNDS_INDEX);
    const total = await File.countDocuments({ visibility: true });
    let indexed = 0;
    let page = 0;

    while (true) {
        const docs = await File.find({ visibility: true })
            .sort({ _id: 1 })
            .skip(page * BATCH)
            .limit(BATCH)
            .select("s_id slug title tags category license duration trendScore visibility stats createdAt")
            .lean();

        if (docs.length === 0) break;

        const meiliDocs: MeiliSoundDoc[] = docs.map(d => ({
            s_id:       d.s_id,
            slug:       d.slug ?? "",
            title:      d.title,
            tags:       (d.tags as string[]) ?? [],
            category:   (d.category as string) ?? "",
            license:    (d.license as string) ?? "unknown",
            duration:   d.duration,
            trendScore: (d.trendScore as number) ?? 0,
            views:      ((d.stats as { views?: number })?.views) ?? 0,
            visibility: d.visibility,
            createdAt:  (d.createdAt as Date).getTime(),
        }));

        await index.addDocuments(meiliDocs, { primaryKey: "s_id" });

        indexed += docs.length;
        page++;
        if (docs.length < BATCH) break;
    }

    const ms = Date.now() - startedAt;
    console.log(`[cron/sync-meili] indexed=${indexed}/${total} ms=${ms}`);

    return Response.json({ ok: true, indexed, total, ms, timestamp: new Date().toISOString() });
}
