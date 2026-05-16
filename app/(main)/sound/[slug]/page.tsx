import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import AudioPlayer from "@/app/components/AudioPlayer";
import SoundCard from "@/app/components/SoundCard";
import ReportButton from "@/app/components/ReportButton";
import AdBanner from "@/app/components/AdBanner";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
    // Return empty at build time — dynamicParams=true + ISR handles all pages on demand.
    // Avoids build failures when DB is unreachable during Vercel's build step.
    try {
        await connectDB();
        const sounds = await File.find({ visibility: true })
            .sort({ 'stats.views': -1 })
            .limit(100)
            .select('slug')
            .lean();
        return sounds.map((s) => ({ slug: s.slug }));
    } catch {
        return [];
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    try {
        await connectDB();
    } catch {
        return { title: "Sound Not Found" };
    }
    const sound = await File.findOne({ slug, visibility: true }).select('title description tags category').lean();

    if (!sound) return { title: "Sound Not Found" };

    return {
        title: `${sound.title} Sound Effect`,
        description: sound.description || `Play and download the "${sound.title}" sound effect. Category: ${sound.category}. Tags: ${sound.tags.slice(0, 5).join(', ')}.`,
        keywords: [sound.title, ...sound.tags, sound.category, 'sound effect', 'meme sound'],
        openGraph: {
            title: `${sound.title} — SoundEffectPro`,
            description: sound.description || `Play the "${sound.title}" sound effect for free.`,
            url: `/sound/${slug}`,
            type: 'website',
        },
        alternates: { canonical: `/sound/${slug}` },
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

export default async function SoundPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    await connectDB();

    let sound = await File.findOne({ slug, visibility: true }).lean();
    if (!sound) {
        // Old slugs had a random 4–6 char suffix (e.g., "ahh-its-comming-out-zqlmx").
        // Try stripping it and redirect permanently to the canonical URL.
        const m = slug.match(/^(.+)-([a-z]{4,6})$/);
        if (m) {
            const base = m[1];
            const baseDoc = await File.findOne({ slug: base, visibility: true }).select("slug").lean();
            if (baseDoc) permanentRedirect(`/sound/${base}`);
        }
        notFound();
    }

    const related = await File.find({
        visibility: true,
        slug: { $ne: slug },
        $or: [
            { category: sound.category },
            { tags: { $in: sound.tags.slice(0, 3) } },
        ],
    })
        .sort({ 'stats.views': -1 })
        .limit(6)
        .select('s_id slug title duration tags category btnColor stats')
        .lean();

    const s = toPlainSound(sound as unknown as Record<string, unknown>);
    const stats = (sound.stats as unknown as Record<string, number>) ?? {};

    // JSON-LD structured data
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "AudioObject",
        name: sound.title,
        description: sound.description,
        contentUrl: `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/store/${sound.s_id}.mp3`,
        encodingFormat: "audio/mpeg",
        duration: `PT${sound.duration.replace(':', 'M')}S`,
        uploadDate: sound.createdAt.toISOString(),
        keywords: sound.tags.join(', '),
    };

    return (
        <div className="mx-auto max-w-5xl px-4 py-8">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="text-sm text-white/40 mb-6 flex items-center gap-1.5">
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
                <span>/</span>
                <Link href={`/sounds/${(sound.category ?? 'random').toLowerCase()}`} className="hover:text-white transition-colors">{sound.category ?? 'Random'}</Link>
                <span>/</span>
                <span className="text-white/70 truncate">{sound.title}</span>
            </nav>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main */}
                <div className="lg:col-span-2 space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">{sound.title}</h1>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-white/40">
                            <span>{sound.duration}</span>
                            <Link href={`/sounds/${(sound.category ?? 'random').toLowerCase()}`} className="hover:text-orange-400 transition-colors">
                                {sound.category}
                            </Link>
                            <span>{stats.views?.toLocaleString() ?? 0} plays</span>
                            <span>{stats.downloads?.toLocaleString() ?? 0} downloads</span>
                        </div>
                    </div>

                    {/* Player */}
                    <AudioPlayer
                        s_id={s.s_id}
                        slug={s.slug}
                        title={s.title}
                        duration={s.duration}
                    />

                    {/* Description */}
                    {sound.description && (
                        <div className="rounded-2xl border border-white/8 bg-[#141414] p-5">
                            <h2 className="font-semibold mb-2 text-white/80">About this sound</h2>
                            <p className="text-sm text-white/60 leading-relaxed">{sound.description}</p>
                        </div>
                    )}

                    {/* Tags */}
                    {sound.tags.length > 0 && (
                        <div>
                            <h2 className="font-semibold mb-3 text-white/80">Tags</h2>
                            <div className="flex flex-wrap gap-2">
                                {sound.tags.map((tag: string) => (
                                    <Link
                                        key={tag}
                                        href={`/search?q=${encodeURIComponent(tag)}`}
                                        className="text-sm bg-white/6 hover:bg-orange-500/20 hover:text-orange-400 text-white/50 rounded-full px-3 py-1 transition-colors"
                                    >
                                        #{tag}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <LikeButton slug={slug} likes={stats.likes ?? 0} />
                        <ShareButton title={sound.title} slug={slug} />
                        <ReportButton slug={slug} />
                    </div>

                    {/* Ad: in-article after actions — high attention spot */}
                    <AdBanner
                        type="in-article"
                        slot={process.env.NEXT_PUBLIC_GOOGLE_AD_SLOT_IN_ARTICLE ?? ""}
                    />

                    {/* Creator */}
                    {sound.user?.name && (
                        <div className="rounded-2xl border border-white/8 bg-[#141414] p-4 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
                                {sound.user.name[0].toUpperCase()}
                            </div>
                            <div>
                                <p className="text-xs text-white/40">Uploaded by</p>
                                <Link href={`/profile/${sound.user.uid}`} className="font-semibold hover:text-orange-400 transition-colors text-sm">
                                    {sound.user.name}
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Related sidebar */}
                <aside className="space-y-3">
                    <h2 className="font-semibold text-white/80">Related Sounds</h2>
                    {related.length > 0 ? (
                        related.map((r) => (
                            <SoundCard key={(r as { s_id: string }).s_id} {...toPlainSound(r as unknown as Record<string, unknown>)} />
                        ))
                    ) : (
                        <p className="text-white/30 text-sm">No related sounds found.</p>
                    )}

                    {/* Ad: display rectangle in sidebar */}
                    <AdBanner
                        type="display"
                        slot={process.env.NEXT_PUBLIC_GOOGLE_AD_SLOT_DISPLAY ?? ""}
                        format="rectangle"
                        className="rounded-xl mt-2"
                    />
                </aside>
            </div>

            {/* Ad: Multiplex at page bottom — catches users before they leave */}
            <AdBanner
                type="multiplex"
                slot={process.env.NEXT_PUBLIC_GOOGLE_AD_SLOT_MULTIPLEX ?? ""}
                className="mt-8 rounded-xl"
            />

            {/* JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
        </div>
    );
}

function LikeButton({ slug, likes }: { slug: string; likes: number }) {
    return (
        <form
            action={async () => {
                "use server";
                await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/sound/${slug}/like`, {
                    method: "POST",
                }).catch(() => null);
            }}
        >
            <button
                type="submit"
                className="flex items-center gap-2 rounded-full border border-white/15 hover:border-orange-500/50 hover:text-orange-400 px-4 py-2 text-sm transition-colors"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                </svg>
                {likes.toLocaleString()} Likes
            </button>
        </form>
    );
}

function ShareButton({ title, slug }: { title: string; slug: string }) {
    return (
        <button
            onClick={undefined}
            type="button"
            className="flex items-center gap-2 rounded-full border border-white/15 hover:border-white/30 px-4 py-2 text-sm transition-colors"
            aria-label="Share this sound"
        >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a3 3 0 10-5.716-1.684M9 12a9.002 9.002 0 01-2.348 6.026M9 12A9.003 9.003 0 0112 3" />
            </svg>
            Share
        </button>
    );
}
