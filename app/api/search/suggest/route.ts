/**
 * GET /api/search/suggest?q=<query>
 *
 * Returns live search suggestions for the dropdown:
 *   { sounds: [...], suggestions: string[] }
 *
 * sounds       — top 5 matching sounds from Meilisearch (MongoDB fallback)
 * suggestions  — top 5 popular past queries that start with `q`
 *
 * Min query length: 2 chars. Returns empty arrays for blank/banned queries.
 * Banned word queries are silently ignored (no results, no tracking).
 */

import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import SearchQuery from "@/app/lib/models/SearchQuery";
import { suggestSounds } from "@/app/lib/meilisearch";
import { containsBannedWord } from "@/app/lib/bannedWords";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";

    // Empty or too short — return blank quickly
    if (q.length < 2) {
        return Response.json({ sounds: [], suggestions: [] });
    }

    // Banned word — silent empty (don't track, don't reflect)
    if (containsBannedWord(q)) {
        return Response.json({ sounds: [], suggestions: [] });
    }

    try {
        await connectDB();

        // Run Meilisearch + popular suggestions concurrently
        const [meiliHits, popularTerms] = await Promise.all([
            // Meilisearch (or MongoDB fallback)
            suggestSounds(q, 5).catch(async () => {
                // Fallback to MongoDB text search
                const docs = await File.find(
                    { $text: { $search: q }, visibility: true },
                    { score: { $meta: "textScore" } }
                )
                    .sort({ score: { $meta: "textScore" } })
                    .limit(5)
                    .select("s_id slug title duration category")
                    .lean();
                return docs as { s_id: string; slug: string; title: string; duration: string; category: string }[];
            }),

            // Popular past queries starting with this prefix
            SearchQuery.find({
                term: { $regex: `^${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, $options: "i" },
            })
                .sort({ count: -1 })
                .limit(5)
                .select("term")
                .lean(),
        ]);

        return Response.json({
            sounds:      meiliHits,
            suggestions: popularTerms.map(t => t.term),
        });
    } catch {
        return Response.json({ sounds: [], suggestions: [] }, { status: 500 });
    }
}
