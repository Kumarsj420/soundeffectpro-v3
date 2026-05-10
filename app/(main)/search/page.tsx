import type { Metadata } from "next";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import NotFound from "@/app/lib/models/NotFound";
import SoundCard from "@/app/components/SoundCard";
import Link from "next/link";
import AdBanner from "@/app/components/AdBanner";

export const revalidate = 60;

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
    const { q } = await searchParams;
    if (!q) return { title: "Search Sounds" };
    return {
        title: `"${q}" Sound Effects`,
        description: `Search results for "${q}" — play and download free sound effects.`,
        robots: { index: false, follow: true },
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
    searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
}) {
    const { q = '', sort = 'relevant', page = '1' } = await searchParams;
    const query = q.trim();
    const pageNum = Math.max(1, parseInt(page, 10));
    const limit = 20;
    const skip = (pageNum - 1) * limit;

    await connectDB();

    let sounds: Record<string, unknown>[] = [];
    let total = 0;

    if (query) {
        const isRelevant = sort === 'relevant' || !['popular', 'newest'].includes(sort);

        const [results, count] = await Promise.all([
            File.find(
                { $text: { $search: query }, visibility: true },
                isRelevant ? { score: { $meta: 'textScore' } } : undefined
            )
                .sort(
                    isRelevant
                        ? { score: { $meta: 'textScore' } }
                        : sort === 'popular'
                        ? { 'stats.views': -1 }
                        : { createdAt: -1 }
                )
                .skip(skip)
                .limit(limit)
                .select('s_id slug title duration tags category btnColor stats')
                .lean(),

            File.countDocuments({ $text: { $search: query }, visibility: true }),
        ]);

        sounds = results as unknown as Record<string, unknown>[];
        total = count;

        // Track zero-result searches for future curation
        if (total === 0 && query.length >= 2) {
            NotFound.findOneAndUpdate(
                { searchTerm: query.toLowerCase() },
                { $inc: { count: 1 } },
                { upsert: true }
            ).catch(() => null);
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
                <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {sounds.slice(0, 6).map((s) => (
                            <SoundCard key={s.s_id as string} {...toPlainSound(s)} />
                        ))}
                        {/* Ad: In-feed after 6 results — native blend mid-results */}
                        {sounds.length > 6 && (
                            <div className="sm:col-span-2 lg:col-span-3">
                                <AdBanner
                                    type="in-feed"
                                    slot={process.env.NEXT_PUBLIC_GOOGLE_AD_SLOT_IN_FEED ?? ""}
                                />
                            </div>
                        )}
                        {sounds.slice(6).map((s) => (
                            <SoundCard key={s.s_id as string} {...toPlainSound(s)} />
                        ))}
                    </div>

                    {/* Ad: Display leaderboard after all results */}
                    <AdBanner
                        type="display"
                        slot={process.env.NEXT_PUBLIC_GOOGLE_AD_SLOT_DISPLAY ?? ""}
                        format="horizontal"
                        className="rounded-xl mt-6"
                    />
                </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-10">
                    {pageNum > 1 && (
                        <Link href={`/search?q=${encodeURIComponent(query)}&sort=${sort}&page=${pageNum - 1}`} className="px-4 py-2 rounded-full border border-white/10 hover:border-white/30 text-sm transition-colors">
                            ← Previous
                        </Link>
                    )}
                    <span className="px-4 py-2 text-sm text-white/50">Page {pageNum} of {totalPages}</span>
                    {pageNum < totalPages && (
                        <Link href={`/search?q=${encodeURIComponent(query)}&sort=${sort}&page=${pageNum + 1}`} className="px-4 py-2 rounded-full border border-white/10 hover:border-white/30 text-sm transition-colors">
                            Next →
                        </Link>
                    )}
                </div>
            )}

            {/* No query state */}
            {!query && (
                <div className="text-center py-10 text-white/30">
                    <p>Enter a search term above to find sounds</p>
                </div>
            )}

            {/* Ad: Multiplex at bottom */}
            <AdBanner
                type="multiplex"
                slot={process.env.NEXT_PUBLIC_GOOGLE_AD_SLOT_MULTIPLEX ?? ""}
                className="mt-10 rounded-xl"
            />
        </div>
    );
}
