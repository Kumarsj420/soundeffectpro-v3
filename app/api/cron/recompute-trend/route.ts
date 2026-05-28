/**
 * ── Nightly cron: recompute trendScore for every visible sound ────────────────
 *
 * trendScore = (weeklyViews × 4) + (monthlyViews × 1)
 *
 * Only counts stats from the CURRENT period — stale buckets score 0, so old
 * viral sounds naturally decay out of trending as new ones rise.
 *
 * Call this from a Railway cron / GitHub Actions schedule / any HTTP scheduler:
 *   GET /api/cron/recompute-trend
 *   Header: x-cron-secret: <CRON_SECRET env var>
 *
 * Runs in ~1-2 seconds for thousands of documents via MongoDB bulk pipeline.
 * Safe to call multiple times per day.
 */

import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import { getWeekStart, getMonthStart } from "@/app/lib/statsPeriod";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    // ── Auth: simple shared secret ────────────────────────────────────────────
    const secret =
        req.headers.get('x-cron-secret') ??
        new URL(req.url).searchParams.get('secret');

    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startedAt = Date.now();
    await connectDB();

    const weekStart  = getWeekStart();
    const monthStart = getMonthStart();

    // Single bulk pipeline update — no JS iteration needed.
    // $cond guards ensure only CURRENT-period buckets contribute to the score.
    const result = await File.updateMany(
        { visibility: true },
        [
            {
                $set: {
                    trendScore: {
                        $add: [
                            // Weekly views × 4 — only if bucket is from this week
                            {
                                $multiply: [
                                    {
                                        $cond: {
                                            if:   { $gte: ['$stats.weekly.periodStart', weekStart] },
                                            then: { $ifNull: ['$stats.weekly.views', 0] },
                                            else: 0,
                                        },
                                    },
                                    4,
                                ],
                            },
                            // Monthly views × 1 — only if bucket is from this month
                            {
                                $cond: {
                                    if:   { $gte: ['$stats.monthly.periodStart', monthStart] },
                                    then: { $ifNull: ['$stats.monthly.views', 0] },
                                    else: 0,
                                },
                            },
                        ],
                    },
                },
            },
        ]
    );

    const ms = Date.now() - startedAt;

    console.log(`[cron/recompute-trend] updated=${result.modifiedCount} ms=${ms}`);

    return Response.json({
        ok:      true,
        updated: result.modifiedCount,
        ms,
        timestamp: new Date().toISOString(),
    });
}
