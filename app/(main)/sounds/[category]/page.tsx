import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import { CATEGORY_SLUGS, CATEGORIES } from "@/app/lib/constants";
import SoundCard from "@/app/components/SoundCard";
import AdBanner from "@/app/components/AdBanner";

export const revalidate = 600;
export const dynamicParams = false;

export function generateStaticParams() {
    return Object.keys(CATEGORY_SLUGS).map((slug) => ({ category: slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ category: string }>;
}): Promise<Metadata> {
    const { category } = await params;
    const cat = CATEGORY_SLUGS[category];
    if (!cat) return { title: "Not Found" };

    return {
        title: `${cat} Sound Effects`,
        description: `Browse and play the best ${cat.toLowerCase()} sound effects, meme sounds, and viral audio clips. Free to play and download.`,
        keywords: [`${cat} sounds`, `${cat} sound effects`, `${cat} meme sounds`, 'free sounds'],
        alternates: { canonical: `/sounds/${category}` },
        openGraph: {
            title: `${cat} Sound Effects — SoundEffectPro`,
            description: `Discover the best ${cat.toLowerCase()} sounds and audio clips.`,
            url: `/sounds/${category}`,
        },
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

export default async function CategoryPage({
    params,
    searchParams,
}: {
    params: Promise<{ category: string }>;
    searchParams: Promise<{ sort?: string; page?: string }>;
}) {
    const { category } = await params;
    const { sort = 'popular', page = '1' } = await searchParams;

    const cat = CATEGORY_SLUGS[category];
    if (!cat) notFound();

    const pageNum = Math.max(1, parseInt(page, 10));
    const limit = 24;
    const skip = (pageNum - 1) * limit;

    await connectDB();

    const sortMap: Record<string, [string, 1 | -1][]> = {
        popular: [['stats.views', -1]],
        newest: [['createdAt', -1]],
        downloads: [['stats.downloads', -1]],
    };
    const sortQuery = sortMap[sort] ?? sortMap.popular;

    const [sounds, total] = await Promise.all([
        File.find({ visibility: true, category: cat })
            .sort(sortQuery)
            .skip(skip)
            .limit(limit)
            .select('s_id slug title duration tags category btnColor stats')
            .lean(),
        File.countDocuments({ visibility: true, category: cat }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <nav aria-label="Breadcrumb" className="text-sm text-white/40 mb-3 flex items-center gap-1.5">
                    <Link href="/" className="hover:text-white transition-colors">Home</Link>
                    <span>/</span>
                    <span className="text-white/70">{cat} Sounds</span>
                </nav>
                <h1 className="text-3xl font-bold mb-2">{cat} Sound Effects</h1>
                <p className="text-white/50">
                    {total.toLocaleString()} sounds · Browse and play the best {cat.toLowerCase()} sounds for free.
                </p>
            </div>

            {/* Sort tabs */}
            <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
                {[
                    { label: 'Most Popular', value: 'popular' },
                    { label: 'Newest', value: 'newest' },
                    { label: 'Most Downloaded', value: 'downloads' },
                ].map((opt) => (
                    <Link
                        key={opt.value}
                        href={`/sounds/${category}?sort=${opt.value}`}
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

            {/* Ad 1: Display leaderboard between sort tabs and grid */}
            <AdBanner
                type="display"
                slot={process.env.NEXT_PUBLIC_GOOGLE_AD_SLOT_DISPLAY ?? ""}
                format="horizontal"
                className="rounded-xl mb-6"
            />

            {/* Grid */}
            {sounds.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {sounds.slice(0, 8).map((s) => (
                        <SoundCard key={(s as { s_id: string }).s_id} {...toPlainSound(s as unknown as Record<string, unknown>)} />
                    ))}
                    {/* Ad 2: In-feed after 8 cards — native blend */}
                    {sounds.length > 8 && (
                        <div className="sm:col-span-2 lg:col-span-3">
                            <AdBanner
                                type="in-feed"
                                slot={process.env.NEXT_PUBLIC_GOOGLE_AD_SLOT_IN_FEED ?? ""}
                            />
                        </div>
                    )}
                    {sounds.slice(8).map((s) => (
                        <SoundCard key={(s as { s_id: string }).s_id} {...toPlainSound(s as unknown as Record<string, unknown>)} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 text-white/30">
                    <p className="text-xl mb-2">No {cat} sounds yet</p>
                    <Link href="/upload" className="text-orange-400 hover:text-orange-300 text-sm">Be the first to upload one →</Link>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-10">
                    {pageNum > 1 && (
                        <Link href={`/sounds/${category}?sort=${sort}&page=${pageNum - 1}`} className="px-4 py-2 rounded-full border border-white/10 hover:border-white/30 text-sm transition-colors">
                            ← Previous
                        </Link>
                    )}
                    <span className="px-4 py-2 text-sm text-white/50">
                        Page {pageNum} of {totalPages}
                    </span>
                    {pageNum < totalPages && (
                        <Link href={`/sounds/${category}?sort=${sort}&page=${pageNum + 1}`} className="px-4 py-2 rounded-full border border-white/10 hover:border-white/30 text-sm transition-colors">
                            Next →
                        </Link>
                    )}
                </div>
            )}

            {/* Ad 3: Multiplex before SEO block — catches users at bottom */}
            <AdBanner
                type="multiplex"
                slot={process.env.NEXT_PUBLIC_GOOGLE_AD_SLOT_MULTIPLEX ?? ""}
                className="mt-10 rounded-xl"
            />

            {/* SEO text */}
            <div className="mt-8 rounded-2xl border border-white/8 bg-[#141414] p-6 text-sm text-white/50 leading-relaxed">
                <h2 className="font-semibold text-white/80 text-base mb-2">{cat} Sounds on SoundEffectPro</h2>
                <p>
                    Explore our collection of {cat.toLowerCase()} sound effects — from classic viral clips to the latest trending audio.
                    All sounds are free to play in your browser or download as MP3.
                    Perfect for Discord bots, streaming, gaming, and content creation.
                </p>
            </div>

            {/* Other categories */}
            <div className="mt-8">
                <h2 className="font-semibold mb-3 text-white/60">Browse Other Categories</h2>
                <div className="flex flex-wrap gap-2">
                    {CATEGORIES.filter((c) => c !== cat).map((c) => {
                        const catSlug = Object.entries(CATEGORY_SLUGS).find(([, v]) => v === c)?.[0];
                        if (!catSlug) return null;
                        return (
                            <Link
                                key={catSlug}
                                href={`/sounds/${catSlug}`}
                                className="text-sm border border-white/10 hover:border-orange-500/50 hover:text-orange-400 rounded-full px-3 py-1 transition-colors text-white/50"
                            >
                                {c}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
