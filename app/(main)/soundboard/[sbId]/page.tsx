import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { connectDB } from "@/app/lib/db";
import Soundboard from "@/app/lib/models/Soundboard";
import File from "@/app/lib/models/File";
import SoundCard from "@/app/components/SoundCard";
import Link from "next/link";
import { LayoutGrid, Lock, Globe } from "lucide-react";
import { auth } from "@/auth";

export const revalidate = 60;

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://soundeffectpro.com").replace(/\/$/, "");

export async function generateMetadata({
    params,
}: {
    params: Promise<{ sbId: string }>;
}): Promise<Metadata> {
    const { sbId } = await params;
    try {
        await connectDB();
        const board = await Soundboard.findOne({ sbId }).select("name isPublic").lean();
        if (!board || !board.isPublic) return { title: "Soundboard", robots: { index: false, follow: false } };
        return {
            title: `${board.name} — Soundboard on SoundEffectPro`,
            description: `Listen to this custom soundboard on SoundEffectPro.`,
            alternates: { canonical: `${BASE}/soundboard/${sbId}` },
        };
    } catch {
        return { title: "Soundboard" };
    }
}

function toPlain(doc: unknown) {
    const d     = doc as Record<string, unknown>;
    const stats = (d.stats ?? {}) as Record<string, number>;
    return {
        s_id:     d.s_id as string,
        slug:     d.slug as string,
        title:    d.title as string,
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

export default async function SoundboardPage({
    params,
}: {
    params: Promise<{ sbId: string }>;
}) {
    const { sbId }  = await params;
    const session   = await auth().catch(() => null);

    try { await connectDB(); } catch { notFound(); }

    const board = await Soundboard.findOne({ sbId }).lean();
    if (!board) notFound();

    const isOwner = session?.user.uid === board.userId;
    if (!board.isPublic && !isOwner) notFound();

    const sounds = board.sounds.length
        ? await File.find({ s_id: { $in: board.sounds }, visibility: true })
            .select("s_id slug title duration tags category btnColor stats")
            .lean()
        : [];

    // Preserve board ordering
    const soundMap = new Map(sounds.map(s => [s.s_id, s]));
    const ordered  = board.sounds
        .map(id => soundMap.get(id))
        .filter(Boolean) as typeof sounds;

    const shareUrl = `${BASE}/soundboard/${sbId}`;

    return (
        <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-12 w-12 rounded-2xl bg-orange-500/15 flex items-center justify-center shrink-0">
                        <LayoutGrid className="h-6 w-6 text-orange-400" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold truncate">{board.name}</h1>
                        <div className="flex items-center gap-2 text-sm text-white/40 mt-0.5">
                            {board.isPublic
                                ? <><Globe className="h-3.5 w-3.5" /> Public</>
                                : <><Lock className="h-3.5 w-3.5" /> Private</>
                            }
                            <span>·</span>
                            <span>{ordered.length} sounds</span>
                        </div>
                    </div>
                </div>

                {/* Share / embed actions */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={undefined}
                        data-share-url={shareUrl}
                        className="share-btn rounded-full border border-white/15 hover:border-orange-500/40 hover:text-orange-400 px-4 py-2 text-sm transition-colors"
                        id="sb-share-btn"
                    >
                        Share
                    </button>
                    {isOwner && (
                        <Link
                            href="/my/soundboards"
                            className="rounded-full border border-white/15 hover:border-white/30 px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
                        >
                            My Boards
                        </Link>
                    )}
                </div>
            </div>

            {/* Embed snippet */}
            {board.isPublic && (
                <details className="rounded-xl border border-white/8 bg-[#111113]">
                    <summary className="px-4 py-3 text-sm text-white/50 cursor-pointer hover:text-white transition-colors select-none">
                        🔗 Embed this soundboard
                    </summary>
                    <div className="px-4 pb-4 space-y-2">
                        <p className="text-xs text-white/30">Copy this iframe to embed the soundboard on any website:</p>
                        <code className="block bg-white/5 rounded-lg px-3 py-2 text-xs text-white/70 break-all">
                            {`<iframe src="${BASE}/soundboard/${sbId}" width="100%" height="600" frameborder="0" allow="autoplay" style="border-radius:12px"></iframe>`}
                        </code>
                    </div>
                </details>
            )}

            {/* Sound grid */}
            {ordered.length === 0 ? (
                <div className="text-center py-20 text-white/30">
                    <LayoutGrid className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>This soundboard is empty</p>
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {ordered.map(s => (
                        <SoundCard key={s.s_id} {...toPlain(s as unknown as Record<string, unknown>)} />
                    ))}
                </div>
            )}

            {/* Share script — copy URL to clipboard on click */}
            <script dangerouslySetInnerHTML={{ __html: `
                const btn = document.getElementById('sb-share-btn');
                if (btn) btn.addEventListener('click', () => {
                    navigator.clipboard?.writeText(btn.dataset.shareUrl ?? '').then(() => {
                        const orig = btn.textContent;
                        btn.textContent = 'Copied!';
                        setTimeout(() => { btn.textContent = orig; }, 1500);
                    });
                });
            `}} />
        </div>
    );
}
