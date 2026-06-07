import type { Metadata } from "next";
import Link from "next/link";
import { Flame, TrendingUp, Sparkles, ArrowRight, Search } from "lucide-react";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import SoundCard from "@/app/components/SoundCard";
import { Badge } from "@/app/components/ui/badge";
import { getWeekStart } from "@/app/lib/statsPeriod";
import LatestSounds from "@/app/components/LatestSounds";
import AdBanner from "@/app/components/AdBanner";

export const revalidate = 300;

export const metadata: Metadata = {
    title: "SoundEffectPro — Free Meme & Viral Sound Effects",
    description: "200K+ free sound effects — meme sounds, gaming clips, anime audio, viral sounds. Download royalty-free MP3 for YouTube, TikTok, Twitch & Discord. No copyright. Updated daily.",
    keywords: [
        "free sound effects",
        "meme sound effects",
        "royalty free sound effects",
        "no copyright sounds",
        "sound effects for YouTube",
        "TikTok sounds",
        "Discord soundboard",
        "Twitch sound effects",
        "gaming sound effects",
        "anime sound effects",
        "MP3 sound effects download",
        "viral audio clips",
        "meme soundboard",
        "free MP3 download",
        "content creator sounds",
    ],
    alternates: { canonical: "/" },
    openGraph: {
        title: "SoundEffectPro — Free Meme & Viral Sound Effects",
        description: "200K+ free royalty-free sound effects for YouTube, TikTok, Twitch & Discord. Download MP3 instantly.",
        url: "/",
    },
};

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://soundeffectpro.com").replace(/\/$/, "");

// WebSite schema tells Google to show a sitelinks search box in results
const websiteLd = {
    "@context": "https://schema.org",
    "@type":    "WebSite",
    name:       "SoundEffectPro",
    url:        BASE,
    description: "The best free meme sound effects, viral audio clips, and soundboard sounds.",
    potentialAction: {
        "@type":       "SearchAction",
        target: {
            "@type":       "EntryPoint",
            urlTemplate:   `${BASE}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
    },
};

const CATEGORIES = [
    { label: "Meme", slug: "meme", emoji: "😂", variant: "meme" as const, href: "/sounds/meme" },
    { label: "Anime", slug: "anime", emoji: "🎌", variant: "anime" as const, href: "/sounds/anime" },
    { label: "Gaming", slug: "gaming", emoji: "🎮", variant: "gaming" as const, href: "/search?q=gaming" },
    { label: "Music", slug: "music", emoji: "🎵", variant: "music" as const, href: "/search?q=music" },
    { label: "Movies", slug: "movies", emoji: "🎬", variant: "movies" as const, href: "/search?q=movies" },
    { label: "Sports", slug: "sports", emoji: "⚽", variant: "sports" as const, href: "/search?q=sports" },
    { label: "Series", slug: "series", emoji: "📺", variant: "series" as const, href: "/search?q=series" },
    { label: "Comedy", slug: "comedy", emoji: "🤣", variant: "comedy" as const, href: "/search?q=comedy" },
    { label: "Politics", slug: "politics", emoji: "🏛️", variant: "politics" as const, href: "/search?q=politics" },
    { label: "Random", slug: "random", emoji: "🎲", variant: "random" as const, href: "/sounds/random" },
];

function toPlain(doc: unknown) {
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

async function getData() {
    try {
        await connectDB();
    } catch {
        return { trending: [], weekly: [], latest: [], latestTotal: 0 };
    }

    const base = { visibility: true };

    try {
        const [trending, weekly, latest, latestTotal] = await Promise.all([
            File.find(base).sort({ trendScore: -1 }).limit(12)
                .select('s_id slug title duration tags category btnColor stats').lean(),
            File.find({ ...base, 'stats.weekly.periodStart': { $gte: getWeekStart() } })
                .sort({ 'stats.weekly.views': -1 }).limit(8)
                .select('s_id slug title duration tags category btnColor stats').lean(),
            File.find(base).sort({ createdAt: -1 }).limit(12)
                .select('s_id slug title duration tags category btnColor stats').lean(),
            File.countDocuments(base),
        ]);

        return {
            trending: trending.map(toPlain),
            weekly: weekly.length ? weekly.map(toPlain) : trending.slice(0, 8).map(toPlain),
            latest: latest.map(toPlain),
            latestTotal,
        };
    } catch {
        return { trending: [], weekly: [], latest: [], latestTotal: 0 };
    }
}

export default async function HomePage() {
    const { trending, weekly, latest, latestTotal } = await getData();

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12 space-y-14 sm:space-y-16">
            {/* WebSite JSON-LD — enables sitelinks search box in Google */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }} />

            {/* -- Hero -- */}
            <section className="relative text-center py-10 overflow-hidden">
                {/* Background glow blobs */}
                <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-64 w-64 rounded-full bg-orange-500/8 blur-3xl" />
                    <div className="h-48 w-48 rounded-full bg-amber-500/6 blur-3xl -translate-x-20" />
                </div>

                <div className="relative space-y-5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-orange-500/8 px-3 py-1 text-xs font-medium text-orange-400 mb-2">
                        <Sparkles className="h-3 w-3" />
                        Free &amp; Instant Play
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
                        The Internet's Best<br />
                        <span className="gradient-text">Meme Sound Effects</span>
                    </h1>

                    <p className="text-[#71717a] max-w-md mx-auto text-base sm:text-lg">
                        Thousands of viral sounds. Play instantly, download free. Updated daily.
                    </p>

                    {/* Hero search */}
                    <form action="/search" method="GET" className="mx-auto max-w-lg">
                        <div className="relative flex items-center rounded-full border border-white/10 bg-white/5 hover:border-white/16 focus-within:border-orange-500/50 focus-within:bg-white/7 transition-all shadow-xl shadow-black/20">
                            <Search className="absolute left-4 h-5 w-5 text-[#52525b] pointer-events-none" />
                            <input
                                name="q"
                                type="search"
                                placeholder='Try "bruh", "vine boom", "anime wow"…'
                                className="flex-1 bg-transparent pl-11 pr-4 py-3.5 text-sm text-white placeholder-[#52525b] outline-none"
                                aria-label="Search sounds"
                            />
                            <button
                                type="submit"
                                className="m-1.5 rounded-full bg-orange-500 hover:bg-orange-400 px-5 py-2 text-sm font-semibold text-white transition-all shadow-lg shadow-orange-500/30 hover:-translate-y-px"
                            >
                                Search
                            </button>
                        </div>
                    </form>
                </div>
            </section>

            {/* -- Category grid -- */}
            <section aria-label="Browse by category">
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-3">
                    {CATEGORIES.map(cat => (
                        <Link
                            key={cat.slug}
                            href={cat.href}
                            prefetch={cat.href.startsWith("/search") ? false : undefined}
                            className="group flex flex-col items-center gap-1.5 rounded-2xl border border-white/7 bg-[#111113] hover:border-white/14 hover:bg-[#18181b] p-3 transition-all hover:-translate-y-0.5"
                        >
                            <span className="text-2xl">{cat.emoji}</span>
                            <Badge variant={cat.variant} className="text-[10px] px-1.5">{cat.label}</Badge>
                        </Link>
                    ))}
                </div>
            </section>

            {/* -- Trending -- */}
            <Section
                icon={<Flame className="h-5 w-5 text-orange-500" />}
                title="Trending Now"
                href="/sounds/meme"
            >
                <SoundGrid sounds={trending} />
            </Section>

            <AdBanner
                type="display"
                format="horizontal"
                slot={process.env.NEXT_PUBLIC_BETWEEN_SECTIONS_HOME_PAGE ?? ""}
                className="rounded-xl"
            />

            {/* -- This Week -- */}
            <Section
                icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
                title="Hot This Week"
            >
                <SoundGrid sounds={weekly} cols={4} />
            </Section>

            {/* -- Latest -- */}
            <Section
                icon={<Sparkles className="h-5 w-5 text-violet-400" />}
                title="Just Uploaded"
            >
                <LatestSounds initial={latest} total={latestTotal} />
            </Section>

            {/* -- SEO text -- */}
            <section className="rounded-2xl border border-white/7 bg-[#111113] p-6 sm:p-8">
                <h2 className="font-bold text-lg mb-3 text-white/90">About <span className="text-transparent bg-clip-text bg-linear-to-r from-orange-400 via-amber-400 to-amber-300">Sound Effect Pro</span></h2>
                <div className="text-sm text-[#71717a] leading-relaxed space-y-2">
                    <p>
                        Sound Effect Pro is a fast-growing meme soundboard platform featuring 200K + of viral sound effects,
                        meme audio clips, gaming sounds, anime reactions, TikTok trends, Discord soundboard effects,
                        and internet-famous audio buttons. Instantly play, share, or download free MP3 sound effects directly
                        from your browser with no software required.
                    </p>

                    <p>
                        Explore trending meme sounds updated daily by the community and reviewed through our moderation system
                        to maintain high-quality, safe, and advertiser-friendly content. Whether you're creating videos,
                        streaming on Twitch, building Discord bots, making YouTube content, or searching for funny sound effects,
                        Sound Effect Pro makes discovering and using viral audio simple, fast, and accessible.
                    </p>
                </div>
            </section>
        </div>
    );
}

/* -- Sub-components -- */

function Section({
    icon, title, href, children,
}: {
    icon: React.ReactNode;
    title: string;
    href?: string;
    children: React.ReactNode;
}) {
    return (
        <section>
            <div className="flex items-center justify-between mb-5">
                <h2 className="flex items-center gap-2.5 text-xl font-bold">
                    {icon}
                    {title}
                </h2>
                {href && (
                    <Link
                        href={href}
                        prefetch={href.startsWith("/search") ? false : undefined}
                        className="flex items-center gap-1 text-sm text-[#71717a] hover:text-orange-400 transition-colors"
                    >
                        View all <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                )}
            </div>
            {children}
        </section>
    );
}

function SoundGrid({ sounds, cols = 3 }: { sounds: ReturnType<typeof toPlain>[]; cols?: 3 | 4 }) {
    if (!sounds.length) {
        return (
            <div className="rounded-2xl border border-white/7 bg-[#111113] py-16 text-center text-[#52525b] text-sm">
                No sounds yet — <Link href="/upload" className="text-orange-400 hover:text-orange-300">be the first to upload</Link>.
            </div>
        );
    }
    return (
        <div className={`grid gap-3 sm:grid-cols-2 ${cols === 4 ? 'md:grid-cols-3 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
            {sounds.map(s => <SoundCard key={s.s_id} {...s} />)}
        </div>
    );
}
