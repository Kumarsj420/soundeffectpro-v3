import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import { searchSounds } from "@/app/lib/meilisearch";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q     = (searchParams.get("q") ?? "").trim();
    const sort  = searchParams.get("sort") ?? "relevant";
    const page  = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = 20;

    if (!q) return NextResponse.json({ sounds: [], total: 0, page: 1, pages: 0 });

    try {
        await connectDB();

        let sounds: unknown[] = [];
        let total = 0;

        const meili = await searchSounds(q, {
            page, limit, sort: sort as "relevant" | "popular" | "newest",
        }).catch(() => null);

        if (meili) {
            const s_ids = (meili.hits as unknown as { s_id: string }[]).map(h => h.s_id);
            const docs = s_ids.length
                ? await File.find({ s_id: { $in: s_ids }, visibility: true })
                    .select("s_id slug title duration tags category btnColor stats")
                    .lean()
                : [];
            const docMap = new Map(docs.map(d => [d.s_id, d]));
            sounds = s_ids.map(id => docMap.get(id)).filter(Boolean);
            total = (meili as unknown as { totalHits?: number; estimatedTotalHits?: number }).totalHits
                ?? (meili as unknown as { estimatedTotalHits?: number }).estimatedTotalHits
                ?? 0;
        } else {
            const skip = (page - 1) * limit;
            const isRelevant = sort === "relevant";
            const [results, count] = await Promise.all([
                File.find(
                    { $text: { $search: q }, visibility: true },
                    isRelevant ? { score: { $meta: "textScore" } } : undefined
                )
                    .sort(isRelevant ? { score: { $meta: "textScore" } }
                        : sort === "popular" ? { "stats.views": -1 } : { createdAt: -1 })
                    .skip(skip).limit(limit)
                    .select("s_id slug title duration tags category btnColor stats")
                    .lean(),
                File.countDocuments({ $text: { $search: q }, visibility: true }),
            ]);
            sounds = results;
            total = count;
        }

        const mapped = (sounds as Record<string, unknown>[]).map(d => {
            const stats = (d.stats as unknown as Record<string, number>) ?? {};
            return {
                s_id:     d.s_id as string,
                slug:     d.slug as string,
                title:    d.title as string,
                duration: d.duration as string,
                tags:     (d.tags as string[]) ?? [],
                category: (d.category as string) ?? "Random",
                btnColor: (d.btnColor as string) ?? "0",
                stats: { views: stats.views ?? 0, downloads: stats.downloads ?? 0, likes: stats.likes ?? 0 },
            };
        });

        return NextResponse.json({ sounds: mapped, total, page, pages: Math.ceil(total / limit) });
    } catch {
        return NextResponse.json({ sounds: [], total: 0, page: 1, pages: 0 }, { status: 500 });
    }
}
