import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import AudioPlayer from "@/app/components/AudioPlayer";
import ReportButton from "@/app/components/ReportButton";
import RelatedSounds from "@/app/components/RelatedSounds";
import AdBanner from "@/app/components/AdBanner";
import ShareButton from "@/app/components/ShareButton";
import Comments from "@/app/components/Comments";
import AddToSoundboard from "@/app/components/AddToSoundboard";
import { parseSoundParam } from "@/app/lib/utils";

// 5 min revalidation — keeps content fresh without ISR write spikes
export const revalidate = 300;
export const dynamicParams = true;

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://soundeffectpro.com").replace(/\/$/, "");

/** Convert MM:SS → ISO 8601 duration (PT14S, PT1M30S, PT2M) */
function toIsoDuration(mmss: string): string {
    const [m, s] = mmss.split(":").map(Number);
    if (!m) return `PT${s}S`;
    if (!s) return `PT${m}M`;
    return `PT${m}M${s}S`;
}

/** Keyword-rich auto-description when a sound has no manual description */
function autoDescription(
    title: string,
    category: string,
    tags: string[],
    duration: string,
    views: number,
    downloads: number
): string {
    const topTags = tags.slice(0, 3).join(", ");
    const plays = views >= 1000 ? `${Math.round(views / 1000)}K` : String(views);
    const dl = downloads >= 1000 ? `${Math.round(downloads / 1000)}K` : String(downloads);
    return (
        `Download "${title}" — free ${category.toLowerCase()} sound effect MP3. ` +
        `${duration} · ${plays} plays · ${dl} downloads. ` +
        `Royalty-free, no copyright. Use in YouTube videos, TikTok clips, Twitch streams, Discord bots, and meme content.` +
        (topTags ? ` Tags: ${topTags}.` : "")
    );
}

export async function generateStaticParams() {
    try {
        await connectDB();
        const sounds = await File.find({ visibility: true })
            .sort({ "stats.views": -1 })
            .limit(500)
            .select("slug s_id")
            .lean();
        return sounds.map((s) => ({ slug: `${s.slug}-${s.s_id}` }));
    } catch {
        return [];
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug: urlParam } = await params;
    const { s_id, slug } = parseSoundParam(urlParam);

    try { await connectDB(); } catch { return { title: "Sound Not Found" }; }

    const sound = s_id
        ? await File.findOne({ s_id, visibility: true })
            .select("title description tags category slug s_id duration stats")
            .lean()
        : await File.findOne({ slug, visibility: true })
            .select("title description tags category slug s_id duration stats")
            .lean();

    if (!sound) return { title: "Sound Not Found" };

    const category   = sound.category ?? "Random";
    const canonicalParam = `${sound.slug}-${sound.s_id}`;
    const canonicalUrl   = `${BASE}/sound/${canonicalParam}`;
    const stats      = (sound.stats ?? {}) as unknown as Record<string, number>;
    const views      = stats.views ?? 0;
    const downloads  = stats.downloads ?? 0;

    const description = sound.description ||
        autoDescription(sound.title, category, sound.tags, sound.duration, views, downloads);

    // Title: "<Name> Sound Effect — Free MP3 Download" → template adds "| SoundEffectPro"
    const title = `${sound.title} Sound Effect — Free MP3 Download`;

    return {
        title,
        description,
        keywords: [
            `${sound.title} sound effect`,
            `${sound.title} mp3 download`,
            `${sound.title} free download`,
            `${sound.title} for YouTube`,
            `${sound.title} royalty free`,
            `${sound.title} no copyright`,
            `${sound.title} meme sound`,
            ...sound.tags,
            category,
            "free sound effect download",
            "royalty free sound effect",
            "no copyright sound",
            "YouTube sound effect",
            "TikTok sound effect",
            "MP3 download free",
        ],
        alternates: { canonical: canonicalUrl },
        openGraph: {
            title: `${sound.title} Sound Effect — SoundEffectPro`,
            description,
            url: canonicalUrl,
            type: "website",
            siteName: "SoundEffectPro",
        },
        twitter: {
            card: "summary",
            title: `${sound.title} Sound Effect`,
            description,
        },
    };
}

function toPlainSound(doc: unknown) {
    const d    = doc as Record<string, unknown>;
    const stats = (d.stats ?? {}) as Record<string, number>;
    return {
        s_id:     d.s_id     as string,
        slug:     d.slug     as string,
        title:    d.title    as string,
        duration: d.duration as string,
        tags:     (d.tags as string[]) ?? [],
        category: (d.category as string) ?? "Random",
        btnColor: (d.btnColor as string) ?? "0",
        stats: {
            views:     stats.views     ?? 0,
            downloads: stats.downloads ?? 0,
            likes:     stats.likes     ?? 0,
        },
    };
}

export default async function SoundPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug: urlParam } = await params;
    const { s_id, slug }     = parseSoundParam(urlParam);

    await connectDB();

    let sound;
    let needsCanonicalRedirect = false;

    if (s_id) {
        sound = await File.findOne({ s_id, visibility: true }).lean();

        if (!sound) {
            // Fallback: parseSoundParam may have split a slug word as s_id
            sound =
                await File.findOne({ slug: urlParam, visibility: true }).lean() ??
                await File.findOne({ slug,            visibility: true }).lean();
            if (!sound) notFound();
            needsCanonicalRedirect = true;
        }
    } else {
        sound = await File.findOne({ slug, visibility: true }).lean();
        if (!sound) notFound();
        needsCanonicalRedirect = true;
    }

    const canonical = `${sound.slug}-${sound.s_id}`;
    if (needsCanonicalRedirect || urlParam !== canonical) {
        permanentRedirect(`/sound/${canonical}`);
    }

    const category     = (sound.category as string) ?? "Random";
    const categorySlug = category.toLowerCase();
    const canonicalUrl = `${BASE}/sound/${canonical}`;

    const relatedFilter = {
        visibility: true,
        s_id: { $ne: sound.s_id },
        $or: [
            { category: sound.category },
            { tags: { $in: (sound.tags as string[]).slice(0, 3) } },
        ],
    };
    const [related, relatedTotal] = await Promise.all([
        File.find(relatedFilter)
            .sort({ "stats.views": -1 })
            .limit(12)
            .select("s_id slug title duration tags category btnColor stats")
            .lean(),
        File.countDocuments(relatedFilter),
    ]);

    const s      = toPlainSound(sound as unknown as Record<string, unknown>);
    const stats  = (sound.stats as unknown as Record<string, number>) ?? {};
    const views  = stats.views  ?? 0;
    const dl     = stats.downloads ?? 0;
    const likes  = stats.likes  ?? 0;

    const description = (sound.description as string) ||
        autoDescription(sound.title as string, category, sound.tags as string[], sound.duration as string, views, dl);

    // ── JSON-LD: AudioObject ──────────────────────────────────────────────────
    const audioLd = {
        "@context":      "https://schema.org",
        "@type":         "AudioObject",
        name:            `${sound.title} Sound Effect`,
        description,
        url:             canonicalUrl,
        contentUrl:      `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/store/${sound.s_id}.mp3`,
        encodingFormat:  "audio/mpeg",
        duration:        toIsoDuration(sound.duration as string),
        uploadDate:      (sound.createdAt as Date).toISOString().split("T")[0],
        keywords:        (sound.tags as string[]).join(", "),
        interactionStatistic: [
            {
                "@type": "InteractionCounter",
                interactionType: "https://schema.org/ListenAction",
                userInteractionCount: views,
            },
            {
                "@type": "InteractionCounter",
                interactionType: "https://schema.org/DownloadAction",
                userInteractionCount: dl,
            },
        ],
    };

    // ── JSON-LD: BreadcrumbList ───────────────────────────────────────────────
    const breadcrumbLd = {
        "@context": "https://schema.org",
        "@type":    "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home",               item: BASE },
            { "@type": "ListItem", position: 2, name: `${category} Sounds`, item: `${BASE}/sounds/${categorySlug}` },
            { "@type": "ListItem", position: 3, name: `${sound.title} Sound Effect`, item: canonicalUrl },
        ],
    };

    // ── JSON-LD: FAQPage — drives "People Also Ask" rich results ─────────────
    const faqLd = {
        "@context": "https://schema.org",
        "@type":    "FAQPage",
        mainEntity: [
            {
                "@type": "Question",
                name: `Is the ${sound.title} sound effect free to download?`,
                acceptedAnswer: {
                    "@type": "Answer",
                    text: `Yes, the ${sound.title} sound effect is 100% free to play and download as an MP3 on SoundEffectPro. No account or payment required.`,
                },
            },
            {
                "@type": "Question",
                name: `Can I use the ${sound.title} sound effect in YouTube videos?`,
                acceptedAnswer: {
                    "@type": "Answer",
                    text: `You can use the ${sound.title} sound effect in YouTube videos, TikTok clips, Twitch streams, and other content. Check the license shown on this page for specific terms.`,
                },
            },
            {
                "@type": "Question",
                name: `How long is the ${sound.title} sound effect?`,
                acceptedAnswer: {
                    "@type": "Answer",
                    text: `The ${sound.title} sound effect is ${sound.duration as string} long in MP3 format.`,
                },
            },
        ],
    };

    return (
        <div className="mx-auto max-w-5xl px-4 py-4 sm:py-8 overflow-x-hidden">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="text-sm text-white/40 mb-4 sm:mb-6 flex items-center gap-1.5 min-w-0">
                <Link href="/" className="hover:text-white transition-colors shrink-0">Home</Link>
                <span className="shrink-0">/</span>
                <Link href={`/sounds/${categorySlug}`} className="hover:text-white transition-colors shrink-0">
                    {category}
                </Link>
                <span className="shrink-0">/</span>
                <span className="text-white/70 truncate">{sound.title as string}</span>
            </nav>

            <div className="space-y-4 sm:space-y-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{sound.title as string} Sound Effect</h1>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-white/40">
                            <span>{sound.duration as string}</span>
                            <Link href={`/sounds/${categorySlug}`} className="hover:text-orange-400 transition-colors">
                                {category}
                            </Link>
                            <span>{views.toLocaleString()} plays</span>
                            <span>{dl.toLocaleString()} downloads</span>
                        </div>
                    </div>

                    {/* Player */}
                    <AudioPlayer
                        s_id={s.s_id}
                        slug={canonical}
                        title={s.title}
                        duration={s.duration}
                        btnColor={s.btnColor}
                        license={sound.license as string}
                    />

                    {/* Actions — directly below player */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <LikeButton urlParam={canonical} likes={likes} />
                        <ShareButton title={sound.title as string} url={canonicalUrl} />
                        <AddToSoundboard s_id={s.s_id} />
                        <ReportButton slug={canonical} />
                    </div>

                    {/* Ad: in-article */}
                    <AdBanner
                        type="in-article"
                        slot={process.env.NEXT_PUBLIC_GOOGLE_AD_SLOT_IN_ARTICLE ?? ""}
                    />

                    {/* Description */}
                    {sound.description && (
                        <div className="rounded-2xl border border-white/8 bg-[#141414] p-5">
                            <h2 className="font-semibold mb-2 text-white/80">About this sound</h2>
                            <p className="text-sm text-white/60 leading-relaxed">{sound.description as string}</p>
                        </div>
                    )}

                    {/* Tags */}
                    {(sound.tags as string[]).length > 0 && (
                        <div>
                            <h2 className="font-semibold mb-3 text-white/80">Tags</h2>
                            <div className="flex flex-wrap gap-2">
                                {(sound.tags as string[]).map((tag) => (
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

                    {/* Creator */}
                    {(sound.user as { name?: string })?.name && (
                        <div className="rounded-2xl border border-white/8 bg-[#141414] p-4 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
                                {(sound.user as { name: string }).name[0].toUpperCase()}
                            </div>
                            <div>
                                <p className="text-xs text-white/40">Uploaded by</p>
                                <Link
                                    href={`/profile/${(sound.user as { uid: string }).uid}`}
                                    className="font-semibold hover:text-orange-400 transition-colors text-sm"
                                >
                                    {(sound.user as { name: string }).name}
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Comments */}
                    <div className="rounded-2xl border border-white/8 bg-[#141414] p-5">
                        <Comments s_id={s.s_id} />
                    </div>

                    {/* Related sounds — full-width grid below comments */}
                    <RelatedSounds
                        slug={canonical}
                        category={category}
                        tags={sound.tags as string[]}
                        initial={related.map(r => toPlainSound(r as unknown as Record<string, unknown>))}
                        total={relatedTotal}
                    />

                    {/* Ad: display after related sounds */}
                    <AdBanner
                        type="display"
                        slot={process.env.NEXT_PUBLIC_GOOGLE_AD_SLOT_DISPLAY ?? ""}
                        format="horizontal"
                        className="rounded-xl"
                    />

                    {/* Ad: Multiplex at page bottom */}
                    <AdBanner
                        type="multiplex"
                        slot={process.env.NEXT_PUBLIC_GOOGLE_AD_SLOT_MULTIPLEX ?? ""}
                        className="rounded-xl"
                    />
            </div>

            {/* JSON-LD */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(audioLd) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
        </div>
    );
}

// ── Server action button ─────────────────────────────────────────────────────
function LikeButton({ urlParam, likes }: { urlParam: string; likes: number }) {
    return (
        <form
            action={async () => {
                "use server";
                await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}api/sound/${urlParam}/like`, {
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
