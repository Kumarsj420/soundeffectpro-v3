import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { connectDB } from "@/app/lib/db";
import Board from "@/app/lib/models/Board";
import SbModel from "@/app/lib/models/Sb";
import File from "@/app/lib/models/File";
import SoundCard from "@/app/components/SoundCard";
import { LayoutGrid, Lock, Globe } from "lucide-react";
import { auth } from "@/auth";
import MyBoardsLink from "./MyBoardsLink";

// NOTE: this route can't use generateStaticParams/ISR like the other pages —
// the private-board access check below conditionally calls the Dynamic API
// (auth()) only when a board is private, and Next.js's static-generation
// engine rejects any Dynamic API call, even a conditional one, inside a
// route enrolled in static generation (throws DYNAMIC_SERVER_USAGE).
// Confirmed via local testing. No `revalidate` export either — it has no
// effect on a fully dynamic route and (also confirmed locally) left stale
// notFound() responses returning HTTP 200 instead of 404. The auth-skip
// below still saves the JWT-decode CPU cost on every public-board view,
// which is most of this route's traffic.
const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://soundeffectpro.com").replace(/\/$/, "");

export async function generateMetadata({
    params,
}: {
    params: Promise<{ sbId: string }>;
}): Promise<Metadata> {
    const { sbId } = await params;
    try {
        await connectDB();
        const board = await Board.findOne({ sb_id: sbId }).select("name visibility").lean();
        if (!board || !board.visibility) return { title: "Soundboard", robots: { index: false, follow: false } };
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

    try { await connectDB(); } catch { notFound(); }

    const board = await Board.findOne({ sb_id: sbId }).lean();
    if (!board) notFound();

    // Only decode the session JWT for private boards — the vast majority of
    // traffic here is public boards linked from the /soundboard browse page,
    // and those don't need auth at all. Skipping it for the common case lets
    // this route stay ISR-cacheable instead of fully dynamic on every visit.
    // The owner-only "My Boards" shortcut for public boards is handled by a
    // client component below instead (same session, no server round-trip).
    if (!board.visibility) {
        const session = await auth().catch(() => null);
        const isOwner = session?.user.uid === board.user.uid;
        if (!isOwner) notFound();
    }

    const links  = await SbModel.find({ sb_id: sbId }).sort({ createdAt: 1 }).lean();
    const s_ids  = links.map(l => l.s_id);

    const sounds = s_ids.length
        ? await File.find({ s_id: { $in: s_ids }, visibility: true })
            .select("s_id slug title duration tags category btnColor stats")
            .lean()
        : [];

    const soundMap = new Map(sounds.map(s => [s.s_id, s]));
    const ordered  = s_ids.map(id => soundMap.get(id)).filter(Boolean) as typeof sounds;

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
                            {board.visibility
                                ? <><Globe className="h-3.5 w-3.5" /> Public</>
                                : <><Lock className="h-3.5 w-3.5" /> Private</>
                            }
                            <span>·</span>
                            <span>{ordered.length} sounds</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        data-share-url={shareUrl}
                        className="share-btn rounded-full border border-white/15 hover:border-orange-500/40 hover:text-orange-400 px-4 py-2 text-sm transition-colors"
                        id="sb-share-btn"
                    >
                        Share
                    </button>
                    <MyBoardsLink ownerUid={board.user.uid} />
                </div>
            </div>

            {/* Embed snippet */}
            {board.visibility && (
                <details className="rounded-xl border border-white/8 bg-[#111113]">
                    <summary className="px-4 py-3 text-sm text-white/50 cursor-pointer hover:text-white transition-colors select-none">
                        Embed this soundboard
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
