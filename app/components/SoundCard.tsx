"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import {
    Flame, Download, MoreVertical, Heart, Share2,
    LayoutGrid, ChevronLeft, Check, Plus, Loader2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { getR2Url } from "@/app/lib/r2/r2Url";
import { Badge, getCategoryVariant } from "@/app/components/ui/badge";
import { cn } from "@/app/lib/utils";

interface SoundCardProps {
    s_id: string;
    slug: string;
    title: string;
    duration: string;
    tags: string[];
    category: string;
    btnColor: string;
    stats: { views: number; downloads: number; likes: number };
}

const HUE_MAP: Record<string, string> = {
    '0': 'hue-rotate-0', '20': 'hue-rotate-[20deg]', '125': 'hue-rotate-[125deg]',
    '145': 'hue-rotate-[145deg]', '195': 'hue-rotate-[195deg]', '225': 'hue-rotate-[225deg]',
    '255': 'hue-rotate-[255deg]', '280': 'hue-rotate-[280deg]', '305': 'hue-rotate-[305deg]',
    '335': 'hue-rotate-[335deg]',
};

function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

// ── Card action menu (3-dot) ──────────────────────────────────────────────────
interface Board { sbId: string; name: string; sounds: string[] }

function CardMenu({ s_id, slug, title, onOpenChange }: { s_id: string; slug: string; title: string; onOpenChange?: (open: boolean) => void }) {
    const { data: session } = useSession();
    const [open,     setOpen]     = useState(false);
    const [view,     setView]     = useState<"menu" | "soundboard">("menu");
    const [liked,    setLiked]    = useState(false);
    const [liking,   setLiking]   = useState(false);
    const [copied,   setCopied]   = useState(false);
    // soundboard
    const [boards,   setBoards]   = useState<Board[]>([]);
    const [loading,  setLoading]  = useState(false);
    const [added,    setAdded]    = useState<Set<string>>(new Set());
    const [busy,     setBusy]     = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [newName,  setNewName]  = useState("");

    const menuRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        function handler(e: MouseEvent) {
            if (!menuRef.current?.contains(e.target as Node)) {
                setOpen(false);
                setView("menu");
            }
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // Load soundboards when entering soundboard view
    useEffect(() => {
        if (view !== "soundboard" || !session) return;
        setLoading(true);
        fetch("/api/soundboard")
            .then(r => r.json())
            .then(d => {
                setBoards(d.boards ?? []);
                setAdded(new Set(
                    (d.boards as Board[] ?? [])
                        .filter(b => b.sounds.includes(s_id))
                        .map(b => b.sbId)
                ));
            })
            .catch(() => null)
            .finally(() => setLoading(false));
    }, [view, session, s_id]);

    function close() { setOpen(false); onOpenChange?.(false); setView("menu"); }

    async function handleLike() {
        if (liking) return;
        if (!session) { toast.error("Sign in to like sounds"); close(); return; }
        setLiking(true);
        const res = await fetch(`/api/sound/${slug}-${s_id}/like`, { method: "POST" }).catch(() => null);
        if (res?.ok) {
            const data = await res.json() as { liked: boolean };
            setLiked(data.liked);
            toast.success(data.liked ? "Added to likes" : "Removed from likes");
        } else {
            toast.error("Couldn't update like");
        }
        setLiking(false);
        close();
    }

    async function handleShare() {
        const url = `${window.location.origin}/sound/${slug}-${s_id}`;
        if (navigator.share) {
            await navigator.share({ title: `${title} Sound Effect`, text: `Play "${title}" for free 🎵`, url }).catch(() => null);
        } else {
            await navigator.clipboard.writeText(url).catch(() => null);
            setCopied(true);
            toast.success("Link copied!");
            setTimeout(() => setCopied(false), 2000);
        }
        close();
    }

    async function toggleBoard(sbId: string, isAdded: boolean) {
        setBusy(sbId);
        const res = await fetch(`/api/soundboard/${sbId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: isAdded ? "remove" : "add", s_id }),
        }).catch(() => null);
        if (res?.ok) {
            setAdded(prev => {
                const next = new Set(prev);
                isAdded ? next.delete(sbId) : next.add(sbId);
                return next;
            });
        }
        setBusy(null);
    }

    async function createBoard() {
        if (!newName.trim() || creating) return;
        setCreating(true);
        const res = await fetch("/api/soundboard", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newName.trim(), s_id }),
        }).catch(() => null);
        if (res?.ok) {
            const { board } = await res.json() as { board: Board };
            setBoards(prev => [board, ...prev]);
            setAdded(prev => new Set([...prev, board.sbId]));
            setNewName("");
        }
        setCreating(false);
    }

    const inAny = boards.some(b => added.has(b.sbId));

    return (
        <div ref={menuRef} className="relative shrink-0">
            <button
                onClick={(e) => { e.stopPropagation(); const next = !open; setOpen(next); onOpenChange?.(next); setView("menu"); }}
                aria-label="More options"
                className="h-7 w-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-colors"
            >
                <MoreVertical className="h-4 w-4" />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-xl border border-white/10 bg-[#111113] shadow-2xl shadow-black/50 overflow-hidden">
                    {view === "menu" ? (
                        <div className="py-1">
                            {/* Like */}
                            <button
                                onClick={handleLike}
                                disabled={liking}
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors disabled:opacity-50"
                            >
                                {liking
                                    ? <Loader2 className="h-4 w-4 animate-spin shrink-0 text-white/40" />
                                    : <Heart className={cn("h-4 w-4 shrink-0 transition-colors", liked ? "fill-red-400 text-red-400" : "text-white/50")} />
                                }
                                <span className={liked ? "text-red-400" : "text-white/70"}>
                                    {liked ? "Liked" : "Like"}
                                </span>
                            </button>

                            {/* Share */}
                            <button
                                onClick={handleShare}
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 transition-colors"
                            >
                                <Share2 className={cn("h-4 w-4 shrink-0", copied ? "text-green-400" : "text-white/50")} />
                                <span className={copied ? "text-green-400" : ""}>{copied ? "Copied!" : "Share"}</span>
                            </button>

                            {/* Soundboard */}
                            <button
                                onClick={() => {
                                    if (!session) { toast.error("Sign in to use soundboards"); close(); return; }
                                    setView("soundboard");
                                }}
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 transition-colors"
                            >
                                <LayoutGrid className={cn("h-4 w-4 shrink-0", inAny ? "text-emerald-400" : "text-white/50")} />
                                <span className={inAny ? "text-emerald-400" : ""}>
                                    {inAny ? "In Soundboard" : "Soundboard"}
                                </span>
                            </button>
                        </div>
                    ) : (
                        /* ── Soundboard picker ───────────────────────────── */
                        <div>
                            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/6">
                                <button
                                    onClick={() => setView("menu")}
                                    className="text-white/40 hover:text-white transition-colors"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="text-sm font-medium text-white/80">Add to Soundboard</span>
                            </div>

                            <div className="max-h-48 overflow-y-auto">
                                {loading && (
                                    <div className="flex justify-center py-5">
                                        <Loader2 className="h-4 w-4 animate-spin text-white/30" />
                                    </div>
                                )}
                                {!loading && boards.length === 0 && (
                                    <p className="text-xs text-white/30 px-4 py-4 text-center">
                                        No soundboards yet
                                    </p>
                                )}
                                {boards.map(b => {
                                    const isAdded = added.has(b.sbId);
                                    const isBusy  = busy === b.sbId;
                                    return (
                                        <button
                                            key={b.sbId}
                                            onClick={() => toggleBoard(b.sbId, isAdded)}
                                            disabled={isBusy}
                                            className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left disabled:opacity-50"
                                        >
                                            <div className={cn(
                                                "h-4 w-4 rounded flex items-center justify-center shrink-0 border transition-colors",
                                                isAdded ? "border-emerald-500 bg-emerald-500" : "border-white/20"
                                            )}>
                                                {isBusy
                                                    ? <Loader2 className="h-2.5 w-2.5 animate-spin text-white" />
                                                    : isAdded && <Check className="h-2.5 w-2.5 text-white" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white/80 truncate">{b.name}</p>
                                                <p className="text-[10px] text-white/30">{b.sounds.length} sounds</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="border-t border-white/6 p-2.5 flex gap-2">
                                <input
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && createBoard()}
                                    placeholder="New soundboard…"
                                    maxLength={60}
                                    className="flex-1 rounded-lg bg-white/6 border border-white/8 px-2.5 py-1.5 text-xs text-white placeholder-white/25 outline-none focus:border-orange-500/40"
                                />
                                <button
                                    onClick={createBoard}
                                    disabled={!newName.trim() || creating}
                                    className="shrink-0 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 p-1.5 transition-colors"
                                >
                                    {creating
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                                        : <Plus className="h-3.5 w-3.5 text-white" />
                                    }
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Sound card ────────────────────────────────────────────────────────────────
export default function SoundCard({ s_id, slug, title, duration, tags, category, btnColor, stats }: SoundCardProps) {
    const [playing, setPlaying]   = useState(false);
    const [loading, setLoading]   = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const hue      = HUE_MAP[btnColor] ?? 'hue-rotate-0';

    async function togglePlay() {
        if (loading) return;
        const url = getR2Url(`store/${s_id}.mp3`) ?? '';

        if (!audioRef.current) {
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => setPlaying(false);
            audio.onerror = () => { setPlaying(false); setLoading(false); };
        }

        if (playing) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setPlaying(false);
            return;
        }

        setLoading(true);
        audioRef.current.src = url;
        try {
            await audioRef.current.play();
            setPlaying(true);
            fetch(`/api/sound/${slug}-${s_id}/play`, { method: "POST" }).catch(() => null);
        } catch {
            // autoplay blocked or network error
        } finally {
            setLoading(false);
        }
    }

    return (
        <article className={cn(
            "group relative flex flex-col gap-3 rounded-2xl border bg-[#111113] p-4 transition-all duration-200",
            "hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30",
            menuOpen ? "z-10" : "z-0",
            playing
                ? "border-orange-500/40 shadow-lg shadow-orange-500/10"
                : "border-white/7 hover:border-white/14"
        )}>
            {/* Top row: sprite btn + title + menu */}
            <div className="flex items-center gap-3 mini-btn">
                <button
                    onClick={togglePlay}
                    aria-label={playing ? `Stop ${title}` : `Play ${title}`}
                    aria-pressed={playing}
                    className={cn(
                        "sound-btn shrink-0 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-lg",
                        hue,
                        playing && "btn-animation",
                        loading && "opacity-50 cursor-wait"
                    )}
                />

                <div className="flex-1 min-w-0 space-y-1">
                    <Link
                        href={`/sound/${slug}-${s_id}`}
                        className="block font-semibold text-sm text-white hover:text-orange-400 transition-colors line-clamp-2 leading-snug"
                    >
                        {title}
                    </Link>
                    <div className="flex items-center gap-2">
                        <Badge variant={getCategoryVariant(category)}>{category}</Badge>
                        <span className="text-xs text-[#a1a1aa]">{duration}</span>
                    </div>
                </div>

                <CardMenu s_id={s_id} slug={slug} title={title} onOpenChange={setMenuOpen} />
            </div>

            {/* Tags */}
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {tags.slice(0, 4).map(tag => (
                        <Link
                            key={tag}
                            href={`/search?q=${encodeURIComponent(tag)}`}
                            prefetch={false}
                            className="text-xs text-[#a1a1aa] bg-white/4 hover:bg-orange-500/15 hover:text-orange-400 rounded-full px-2 py-0.5 transition-colors"
                        >
                            #{tag}
                        </Link>
                    ))}
                </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-[#a1a1aa] mt-auto pt-1 border-t border-white/5">
                <span className="flex items-center gap-1">
                    <Flame className="h-3 w-3 text-orange-500/70" />
                    {fmt(stats.views)}
                </span>
                <span className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {fmt(stats.downloads)}
                </span>
                <Link
                    href={`/sound/${slug}-${s_id}`}
                    className="ml-auto text-[#71717a] hover:text-orange-400 transition-colors font-medium"
                    aria-label={`Open ${title} sound page`}
                >
                    Details →
                </Link>
            </div>
        </article>
    );
}
