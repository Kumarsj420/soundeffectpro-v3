import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import NotFound from "@/app/lib/models/NotFound";
import SearchQuery from "@/app/lib/models/SearchQuery";
import Board from "@/app/lib/models/Board";
import SbModel from "@/app/lib/models/Sb";
import Link from "next/link";
import Image from "next/image";
import SearchResults from "@/app/components/SearchResults";
import { containsBannedWord } from "@/app/lib/bannedWords";
import { searchSounds } from "@/app/lib/meilisearch";
import { LayoutGrid, Music } from "lucide-react";

export const revalidate = 60;

// All /search pages are noindex — query strings create infinite URL variations
// and can reflect user-typed content (including policy-violating terms).
const NO_INDEX: Metadata["robots"] = { index: false, follow: true };

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
    const { q } = await searchParams;

    if (!q || containsBannedWord(q)) {
        return { title: "Search Sounds", robots: NO_INDEX };
    }

    return {
        title: `"${q}" Sound Effects`,
        description: `Search results for "${q}" — play and download free sound effects.`,
        robots: NO_INDEX,
    };
}

function toPlainSound(doc: unknown) {
    const d = doc as Record<string, unknown>;
    const stats = (d.stats ?? {}) as Record<string, number>;
    return {
        s_id: d.s_id as string,
        slug: d.slug as string,
        title: d.title as string,
        duration: d.duration as string,
        tags: (d.tags as string[]) ?? [],
        category: d.category as string,
        btnColor: (d.btnColor as string) ?? '0',
        stats: { views: stats.views ?? 0, downloads: stats.downloads ?? 0, likes: stats.likes ?? 0 },
    };
}

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; sort?: string }>;
}) {
    const { q = '', sort = 'relevant' } = await searchParams;
    const query = q.trim();
    const limit = 20;

    // ── Banned word guard ─────────────────────────────────────────────────────
    // Redirect immediately — the word never appears in the URL or on the page.
    if (query.length > 0 && containsBannedWord(query)) redirect("/search");

    await connectDB();

    let sounds: Record<string, unknown>[] = [];
    let total = 0;
    let soundboards: { sb_id: string; name: string; thumb: string; soundCount: number }[] = [];

    if (query) {
        // ── Try Meilisearch first ─────────────────────────────────────────
        const meili = await searchSounds(query, {
            page: 1, limit, sort: sort as "relevant" | "popular" | "newest",
        }).catch(() => null);

        if (meili) {
            // Meilisearch returned results — fetch full docs from MongoDB for stats/btnColor
            const s_ids = (meili.hits as unknown as { s_id: string }[]).map(h => h.s_id);
            const docs = s_ids.length
                ? await File.find({ s_id: { $in: s_ids }, visibility: true })
                    .select("s_id slug title duration tags category btnColor stats")
                    .lean()
                : [];

            // Preserve Meilisearch ranking order
            const docMap = new Map(docs.map(d => [d.s_id, d]));
            sounds = s_ids.map((id: string) => docMap.get(id)).filter(Boolean) as unknown as Record<string, unknown>[];
            total = (meili as unknown as { totalHits?: number; estimatedTotalHits?: number }).totalHits
                 ?? (meili as unknown as { estimatedTotalHits?: number }).estimatedTotalHits
                 ?? 0;
        } else {
            // ── MongoDB fallback ─────────────────────────────────────────
            const isRelevant = sort === "relevant" || !["popular", "newest"].includes(sort);
            const [results, count] = await Promise.all([
                File.find(
                    { $text: { $search: query }, visibility: true },
                    isRelevant ? { score: { $meta: "textScore" } } : undefined
                )
                    .sort(
                        isRelevant
                            ? { score: { $meta: "textScore" } }
                            : sort === "popular"
                            ? { "stats.views": -1 }
                            : { createdAt: -1 }
                    )
                    .limit(limit)
                    .select("s_id slug title duration tags category btnColor stats")
                    .lean(),
                File.countDocuments({ $text: { $search: query }, visibility: true }),
            ]);
            sounds = results as unknown as Record<string, unknown>[];
            total = count;
        }

        // Track popular search terms (fire-and-forget)
        if (query.length >= 2) {
            SearchQuery.findOneAndUpdate(
                { term: query.toLowerCase() },
                { $inc: { count: 1 } },
                { upsert: true }
            ).catch(() => null);
        }

        // Track zero-result searches for future curation
        if (total === 0 && query.length >= 2) {
            NotFound.findOneAndUpdate(
                { searchTerm: query.toLowerCase() },
                { $inc: { count: 1 } },
                { upsert: true }
            ).catch(() => null);
        }

        // ── Soundboard search ─────────────────────────────────────────────
        if (query.length >= 2) {
            const sbDocs = await Board.find({
                visibility: true,
                thumb:      { $exists: true, $nin: ["", null] },
                $text:      { $search: query },
            })
                .limit(4)
                .select("sb_id name thumb")
                .lean()
                .catch(() => []);

            if (sbDocs.length) {
                const sbIds  = sbDocs.map(b => b.sb_id);
                const counts = await SbModel.aggregate([
                    { $match: { sb_id: { $in: sbIds } } },
                    { $group: { _id: "$sb_id", count: { $sum: 1 } } },
                ]).catch(() => []);
                const countMap = new Map(counts.map((c: { _id: string; count: number }) => [c._id, c.count]));
                soundboards = sbDocs
                    .map(b => ({ sb_id: b.sb_id, name: b.name, thumb: b.thumb ?? "", soundCount: countMap.get(b.sb_id) ?? 0 }))
                    .filter(b => b.soundCount > 0);
            }
        }
    }

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            {/* Header */}
            <div className="mb-6">
                {query ? (
                    <>
                        <h1 className="text-2xl font-bold mb-1">
                            Results for <span className="text-orange-400">"{query}"</span>
                        </h1>
                        <p className="text-white/40 text-sm">{total.toLocaleString()} sounds found</p>
                    </>
                ) : (
                    <h1 className="text-2xl font-bold">Search Sounds</h1>
                )}
            </div>

            {/* Search bar */}
            <form method="GET" action="/search" className="mb-6">
                <div className="relative max-w-xl">
                    <input
                        name="q"
                        type="search"
                        defaultValue={query}
                        placeholder="Search sounds, memes, tags..."
                        autoFocus={!query}
                        className="w-full rounded-full bg-white/8 border border-white/10 px-5 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-orange-500/50 pr-12"
                        aria-label="Search sounds"
                    />
                    <button
                        type="submit"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-orange-500 hover:bg-orange-400 p-2 transition-colors"
                        aria-label="Submit search"
                    >
                        <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                        </svg>
                    </button>
                </div>
            </form>

            {query && total > 0 && (
                <div className="flex gap-2 mb-6">
                    {[
                        { label: 'Most Relevant', value: 'relevant' },
                        { label: 'Most Popular', value: 'popular' },
                        { label: 'Newest', value: 'newest' },
                    ].map((opt) => (
                        <Link
                            key={opt.value}
                            href={`/search?q=${encodeURIComponent(query)}&sort=${opt.value}`}
                            prefetch={false}
                            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                                sort === opt.value
                                    ? 'bg-orange-500 text-white'
                                    : 'text-white/50 hover:text-white'
                            }`}
                        >
                            {opt.label}
                        </Link>
                    ))}
                </div>
            )}

            {/* Results */}
            {query && sounds.length === 0 && (
                <div className="text-center py-16 space-y-3">
                    <p className="text-2xl">🔍</p>
                    <p className="text-white/50">No sounds found for <strong className="text-white">"{query}"</strong></p>
                    <p className="text-sm text-white/30">Try different keywords or browse by category</p>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                        {['meme', 'anime', 'gaming', 'music', 'comedy'].map((cat) => (
                            <Link key={cat} href={`/sounds/${cat}`} className="text-sm border border-white/10 rounded-full px-3 py-1 hover:border-orange-500/50 hover:text-orange-400 transition-colors text-white/50 capitalize">
                                {cat}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {sounds.length > 0 && (
                <SearchResults
                    key={query + sort}
                    initial={sounds.map(toPlainSound)}
                    total={total}
                    query={query}
                    sort={sort}
                />
            )}

            {/* Soundboard results */}
            {soundboards.length > 0 && (
                <div className="mt-10 space-y-4">
                    <div className="flex items-center gap-2">
                        <LayoutGrid className="h-5 w-5 text-orange-400" />
                        <h2 className="font-semibold text-white/80">Soundboards</h2>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                        {soundboards.map(b => (
                            <Link
                                key={b.sb_id}
                                href={`/soundboard/${b.sb_id}`}
                                className="group rounded-2xl border border-white/8 bg-[#111113] overflow-hidden hover:border-white/16 hover:-translate-y-0.5 transition-all duration-200"
                            >
                                <div className="relative aspect-video bg-white/4">
                                    <Image src={b.thumb} alt={b.name} fill className="object-cover" sizes="25vw" />
                                    <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white/80">
                                        <Music className="h-3 w-3" />{b.soundCount}
                                    </div>
                                </div>
                                <div className="p-3">
                                    <p className="font-semibold text-sm truncate group-hover:text-orange-400 transition-colors">{b.name}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* No query state */}
            {!query && (
                <div className="text-center py-10 text-white/30">
                    <p>Enter a search term above to find sounds</p>
                </div>
            )}

        </div>
    );
}
