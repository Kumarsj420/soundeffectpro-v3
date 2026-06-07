import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import { CATEGORY_SLUGS, CATEGORIES } from "@/app/lib/constants";
import AdBanner from "@/app/components/AdBanner";
import CategorySounds from "@/app/components/CategorySounds";

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://soundeffectpro.com").replace(/\/$/, "");

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
        title: `Free ${cat} Sound Effects — Download MP3 for YouTube & TikTok`,
        description: `Download free ${cat.toLowerCase()} sound effects — royalty-free MP3s for YouTube, TikTok, Twitch, Discord, and meme content. ${cat} sounds updated daily, no copyright, instant download.`,
        keywords: [
            `${cat} sound effects`,
            `${cat} sounds free download`,
            `${cat} MP3 download`,
            `${cat} sounds for YouTube`,
            `${cat} sounds for TikTok`,
            `free ${cat} sound effects`,
            `royalty free ${cat} sounds`,
            `${cat} meme sounds`,
            `no copyright ${cat} sounds`,
            "free sound effects download",
            "royalty free sound effects",
            "YouTube sound effects",
            "TikTok sounds",
        ],
        alternates: { canonical: `${BASE}/sounds/${category}` },
        openGraph: {
            title: `Free ${cat} Sound Effects — SoundEffectPro`,
            description: `Download free ${cat.toLowerCase()} sound effects — royalty-free MP3s for YouTube, TikTok, Twitch, and Discord.`,
            url: `${BASE}/sounds/${category}`,
            type: "website",
            siteName: "SoundEffectPro",
        },
        twitter: {
            card: "summary_large_image",
            title: `Free ${cat} Sound Effects`,
            description: `Download free ${cat.toLowerCase()} sound effects — royalty-free MP3 for YouTube, TikTok & Discord.`,
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
    searchParams: Promise<{ sort?: string }>;
}) {
    const { category } = await params;
    const { sort = 'popular' } = await searchParams;

    const cat = CATEGORY_SLUGS[category];
    if (!cat) notFound();

    const limit = 24;

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
            .limit(limit)
            .select('s_id slug title duration tags category btnColor stats')
            .lean(),
        File.countDocuments({ visibility: true, category: cat }),
    ]);

    const breadcrumbLd = {
        "@context": "https://schema.org",
        "@type":    "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home",               item: BASE },
            { "@type": "ListItem", position: 2, name: `${cat} Sound Effects`, item: `${BASE}/sounds/${category}` },
        ],
    };

    const itemListLd = {
        "@context": "https://schema.org",
        "@type":    "ItemList",
        name:       `Top ${cat} Sound Effects`,
        description: `Best free ${cat.toLowerCase()} sound effects on SoundEffectPro`,
        url:        `${BASE}/sounds/${category}`,
        numberOfItems: total,
        itemListElement: sounds.slice(0, 6).map((s, i) => ({
            "@type":    "ListItem",
            position:  i + 1,
            url:       `${BASE}/sound/${(s as { slug: string; s_id: string }).slug}-${(s as { slug: string; s_id: string }).s_id}`,
            name:      `${(s as { title: string }).title} Sound Effect`,
        })),
    };

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
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

            {/* Grid with load more */}
            {sounds.length > 0 ? (
                <CategorySounds
                    key={sort}
                    initial={sounds.map(s => toPlainSound(s as unknown as Record<string, unknown>))}
                    total={total}
                    category={cat}
                    sort={sort}
                />
            ) : (
                <div className="text-center py-20 text-white/30">
                    <p className="text-xl mb-2">No {cat} sounds yet</p>
                    <Link href="/upload" className="text-orange-400 hover:text-orange-300 text-sm">Be the first to upload one →</Link>
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
