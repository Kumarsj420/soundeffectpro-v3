"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { CATEGORIES, LICENSE_VALUES } from "@/app/lib/constants";
import type { Category, License } from "@/app/lib/constants";
import {
    Link2, Download, CheckCircle2, XCircle, AlertCircle,
    ChevronDown, ChevronUp, Loader2, Play, Pause, Trash2,
    Settings2, Globe, BookmarkIcon, ExternalLink, ImagePlus, X as XIcon,
} from "lucide-react";

// ── External site quick links ─────────────────────────────────────────────────
const SITES = [
    { label: "myinstants",     url: "https://www.myinstants.com/en/index/in/" },
    { label: "freesound.org",  url: "https://freesound.org/browse/tags/meme/" },
    { label: "tuna.voicemod",  url: "https://tuna.voicemod.net/" },
    { label: "pixabay sounds", url: "https://pixabay.com/sound-effects/" },
    { label: "101soundboards", url: "https://www.101soundboards.com/" },
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────
interface SoundCard {
    id: string;
    url: string;
    status: "fetching" | "ready" | "error" | "importing" | "done" | "failed";
    error?: string;
    title: string;
    audioUrl?: string;
    tags: string[];
    category: Category;
    license: License;
    description?: string;
    duration?: string;
    sourceName?: string;
    duplicate?: boolean;
    selected: boolean;
    resultSlug?: string;
    resultSid?: string;
}

interface GlobalId3 {
    artist: string;
    copyright: string;
    year: string;
    genre: string;
    thumbnailUrl?: string;      // R2 URL — persisted in localStorage, sent to server
    thumbnailPreview?: string;  // data URL or R2 URL for <img>, not sent to server
}

const DEFAULT_ID3: GlobalId3 = {
    artist: "SoundEffectPro",
    copyright: `© ${new Date().getFullYear()} SoundEffectPro`,
    year: String(new Date().getFullYear()),
    genre: "Sound Effect",
};

function uid() { return Math.random().toString(36).slice(2, 10); }

// ── Shared audio player ───────────────────────────────────────────────────────
function useAudioPlayer() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playing, setPlaying] = useState<string | null>(null);

    const toggle = useCallback((url: string, id: string) => {
        if (playing === id) { audioRef.current?.pause(); setPlaying(null); return; }
        if (!audioRef.current) audioRef.current = new Audio();
        audioRef.current.pause();
        audioRef.current.src = url;
        audioRef.current.play().then(() => setPlaying(id)).catch(() => setPlaying(null));
        audioRef.current.onended = () => setPlaying(null);
    }, [playing]);

    return { playing, toggle };
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ImportPage() {
    const [urlInput, setUrlInput]   = useState("");
    const [cards, setCards]         = useState<SoundCard[]>([]);
    const [fetching, setFetching]   = useState(false);
    const [importing, setImporting] = useState(false);
    const [globalId3, setGlobalId3] = useState<GlobalId3>(DEFAULT_ID3);
    const [showId3, setShowId3]     = useState(false);
    const [showBookmarklet, setShowBookmarklet] = useState(false);
    const { playing, toggle } = useAudioPlayer();
    const thumbInputRef = useRef<HTMLInputElement>(null);

    // Restore text fields from sessionStorage; restore thumbnail URL from localStorage
    useEffect(() => {
        const saved = sessionStorage.getItem("sfx_import_id3");
        if (saved) try {
            const { thumbnailPreview: _, ...rest } = JSON.parse(saved);
            setGlobalId3(g => ({ ...g, ...rest }));
        } catch { /* ignore */ }
        const thumbUrl = localStorage.getItem("sfx_import_thumb_url");
        if (thumbUrl) setGlobalId3(g => ({ ...g, thumbnailUrl: thumbUrl, thumbnailPreview: thumbUrl }));
    }, []);
    useEffect(() => {
        const { thumbnailPreview: _, ...rest } = globalId3;
        sessionStorage.setItem("sfx_import_id3", JSON.stringify(rest));
    }, [globalId3]);

    // Pre-fill from bookmarklet ?url= param
    useEffect(() => {
        const u = new URLSearchParams(window.location.search).get("url");
        if (u) { setUrlInput(u); window.history.replaceState({}, "", window.location.pathname); }
    }, []);

    // ── Thumbnail upload ──────────────────────────────────────────────────────
    const handleThumbUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = async () => {
            const MAX = 500;
            const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
            const canvas = document.createElement("canvas");
            canvas.width  = Math.round(img.width  * ratio);
            canvas.height = Math.round(img.height * ratio);
            canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            const base64  = dataUrl.split(",")[1];
            URL.revokeObjectURL(objectUrl);

            // Show preview immediately while upload happens
            setGlobalId3(g => ({ ...g, thumbnailPreview: dataUrl }));

            // Upload to R2 for persistence across page refreshes
            try {
                const resp = await fetch("/api/admin/import-thumbnail", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ base64 }),
                });
                const data = await resp.json();
                if (data.url) {
                    setGlobalId3(g => ({ ...g, thumbnailUrl: data.url }));
                    localStorage.setItem("sfx_import_thumb_url", data.url);
                }
            } catch { /* continue without R2 persistence */ }
        };
        img.src = objectUrl;
        e.target.value = "";
    }, []);

    const clearThumb = useCallback(() => {
        setGlobalId3(g => ({ ...g, thumbnailUrl: undefined, thumbnailPreview: undefined }));
        localStorage.removeItem("sfx_import_thumb_url");
    }, []);

    // ── Fetch metadata ────────────────────────────────────────────────────────
    const handleFetch = useCallback(async () => {
        const urls = urlInput.split(/[\n,]+/).map(u => u.trim()).filter(u => u.startsWith("http"));
        if (urls.length === 0) { toast.error("Paste at least one valid URL"); return; }

        const placeholders: SoundCard[] = urls.map(url => ({
            id: uid(), url, status: "fetching",
            title: "", tags: [], category: "Random", license: "unknown", selected: true,
        }));
        setCards(prev => [...prev, ...placeholders]);
        setUrlInput("");
        setFetching(true);

        try {
            const resp = await fetch("/api/admin/import-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "fetch", urls }),
            });
            const data = await resp.json();

            setCards(prev => prev.map(c => {
                const r = (data.results as Array<Record<string, unknown>>).find(x => x.url === c.url);
                if (!r || !placeholders.find(p => p.id === c.id)) return c;
                if (r.status === "error") return { ...c, status: "error" as const, error: r.error as string };
                return {
                    ...c, status: "ready" as const,
                    title:      (r.title      as string) ?? "",
                    audioUrl:   (r.audioUrl   as string) ?? "",
                    tags:       (r.tags       as string[]) ?? [],
                    category:   (r.category   as Category) ?? "Random",
                    license:    (r.license    as License) ?? "unknown",
                    description:(r.description as string) ?? undefined,
                    duration:   (r.duration   as string) ?? undefined,
                    sourceName: (r.sourceName as string) ?? undefined,
                    duplicate:  (r.duplicate  as boolean) ?? false,
                };
            }));
        } catch {
            toast.error("Fetch failed");
            setCards(prev => prev.map(c =>
                placeholders.find(p => p.id === c.id)
                    ? { ...c, status: "error" as const, error: "Network error" } : c
            ));
        } finally { setFetching(false); }
    }, [urlInput]);

    const updateCard = useCallback(<K extends keyof SoundCard>(id: string, k: K, v: SoundCard[K]) => {
        setCards(prev => prev.map(c => c.id === id ? { ...c, [k]: v } : c));
    }, []);

    const removeCard = useCallback((id: string) => setCards(prev => prev.filter(c => c.id !== id)), []);
    const toggleAll  = useCallback((sel: boolean) => setCards(prev => prev.map(c => c.status === "ready" ? { ...c, selected: sel } : c)), []);

    // ── Import selected ───────────────────────────────────────────────────────
    const handleImport = useCallback(async () => {
        const selected = cards.filter(c => c.selected && c.status === "ready" && c.audioUrl);
        if (selected.length === 0) { toast.error("No sounds selected"); return; }

        setImporting(true);
        setCards(prev => prev.map(c => selected.find(s => s.id === c.id) ? { ...c, status: "importing" as const } : c));

        const { thumbnailPreview: _, ...id3ToSend } = globalId3;

        try {
            const resp = await fetch("/api/admin/import-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "save",
                    items: selected.map(c => ({
                        url: c.url, audioUrl: c.audioUrl,
                        title: c.title, tags: c.tags,
                        category: c.category, license: c.license,
                        description: c.description || undefined,
                    })),
                    globalId3: id3ToSend,
                }),
            });
            const data = await resp.json();
            const results: Array<{ url: string; status: string; s_id?: string; slug?: string; error?: string }> = data.results ?? [];

            let ok = 0, fail = 0;
            setCards(prev => prev.map(c => {
                const r = results.find(x => x.url === c.url);
                if (!r) return c;
                if (r.status === "ok") { ok++; return { ...c, status: "done" as const, resultSid: r.s_id, resultSlug: r.slug }; }
                fail++;
                return { ...c, status: "failed" as const, error: r.error };
            }));

            if (ok > 0) toast.success(`${ok} sound${ok > 1 ? "s" : ""} published`);
            if (fail > 0) toast.error(`${fail} import${fail > 1 ? "s" : ""} failed`);
        } catch {
            toast.error("Import failed");
            setCards(prev => prev.map(c =>
                c.status === "importing" ? { ...c, status: "failed" as const, error: "Network error" } : c
            ));
        } finally { setImporting(false); }
    }, [cards, globalId3]);

    const selectedCount = cards.filter(c => c.selected && c.status === "ready").length;
    const bookmarkletHref = `javascript:(function(){window.open('${typeof window !== "undefined" ? window.location.origin : ""}/admin/import?url='+encodeURIComponent(location.href),'_blank')})()`;

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-lg sm:text-xl font-bold text-white">Import from URL</h1>
                <p className="text-xs sm:text-sm text-white/40 mt-1">
                    Fetch from any supported site, edit metadata, then publish directly.
                </p>
            </div>

            {/* External site quick links */}
            <div className="flex flex-wrap gap-2">
                {SITES.map(s => (
                    <a
                        key={s.label}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/3 hover:bg-white/[0.07] hover:border-orange-500/30 px-3 py-1.5 text-xs text-white/50 hover:text-orange-400 transition-all"
                    >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        {s.label}
                    </a>
                ))}
                <button
                    onClick={() => setShowBookmarklet(v => !v)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/3 hover:bg-white/[0.07] px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-all"
                >
                    <BookmarkIcon className="h-3 w-3 shrink-0" />
                    Bookmarklet
                </button>
            </div>

            {showBookmarklet && (
                <div className="rounded-xl border border-white/8 bg-black/20 p-4 space-y-2">
                    <p className="text-xs text-white/50">Drag to bookmarks bar — click on any sound page to open import tool pre-filled:</p>
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                    <a
                        href={bookmarkletHref}
                        onClick={e => e.preventDefault()}
                        className="inline-block rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-mono text-orange-400 hover:bg-orange-500/20 transition-colors cursor-grab select-all"
                    >
                        📥 Import to SFX
                    </a>
                    <p className="text-xs text-white/25">Right-click → Bookmark link / drag to toolbar</p>
                </div>
            )}

            {/* URL input */}
            <div className="rounded-2xl border border-white/8 bg-white/2 p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-white/60">
                    <Link2 className="h-4 w-4 shrink-0" />
                    Paste URLs — one per line
                </div>
                <textarea
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 resize-none outline-none focus:border-orange-500/50 font-mono leading-relaxed"
                    rows={3}
                    placeholder={"https://www.myinstants.com/en/instant/...\nhttps://freesound.org/people/.../sounds/..."}
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleFetch(); }}
                />
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={handleFetch}
                        disabled={fetching || !urlInput.trim()}
                        className="flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white transition-colors"
                    >
                        {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                        Fetch Metadata
                    </button>
                    <span className="text-xs text-white/25 hidden sm:inline">Ctrl+Enter</span>
                </div>
            </div>

            {/* Global ID3 / metadata settings */}
            <div className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
                <button
                    onClick={() => setShowId3(v => !v)}
                    className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 text-sm font-medium text-white/60 hover:text-white transition-colors"
                >
                    <span className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4 shrink-0" />
                        Audio Metadata (applied to all imported sounds)
                    </span>
                    {showId3 ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                </button>

                {showId3 && (
                    <div className="px-4 sm:px-5 pb-5 border-t border-white/6 space-y-4 pt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {([
                                ["artist",    "Artist"],
                                ["copyright", "Copyright"],
                                ["year",      "Year"],
                                ["genre",     "Genre"],
                            ] as const).map(([key, label]) => (
                                <div key={key}>
                                    <label className="block text-xs text-white/40 mb-1">{label}</label>
                                    <input
                                        className="input-field"
                                        value={globalId3[key]}
                                        onChange={e => setGlobalId3(g => ({ ...g, [key]: e.target.value }))}
                                        placeholder={label}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Cover art upload */}
                        <div>
                            <label className="block text-xs text-white/40 mb-2">Cover Art (embedded in MP3)</label>
                            {globalId3.thumbnailPreview ? (
                                <div className="flex items-center gap-3">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={globalId3.thumbnailPreview}
                                        alt="Cover art"
                                        className="h-16 w-16 rounded-xl object-cover border border-white/10 shrink-0"
                                    />
                                    <div className="space-y-1.5">
                                        <p className="text-xs text-white/50">Image will be embedded in all imported MP3s</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => thumbInputRef.current?.click()}
                                                className="text-xs text-orange-400 hover:text-orange-300 underline underline-offset-2"
                                            >
                                                Replace
                                            </button>
                                            <button
                                                onClick={clearThumb}
                                                className="text-xs text-white/30 hover:text-red-400 underline underline-offset-2"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => thumbInputRef.current?.click()}
                                    className="flex items-center gap-2 rounded-xl border border-dashed border-white/15 hover:border-orange-500/40 bg-white/2 hover:bg-orange-500/5 px-4 py-3 text-sm text-white/30 hover:text-orange-400 transition-all w-full sm:w-auto"
                                >
                                    <ImagePlus className="h-4 w-4 shrink-0" />
                                    Upload cover image
                                    <span className="text-xs text-white/20">(JPG, PNG, WebP)</span>
                                </button>
                            )}
                            <input
                                ref={thumbInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleThumbUpload}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk action bar */}
            {cards.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-white/40">{cards.length} sound{cards.length !== 1 ? "s" : ""}</span>
                    <button onClick={() => toggleAll(true)}  className="text-xs text-white/35 hover:text-white underline underline-offset-2">All</button>
                    <button onClick={() => toggleAll(false)} className="text-xs text-white/35 hover:text-white underline underline-offset-2">None</button>
                    <div className="flex-1" />
                    <button
                        onClick={handleImport}
                        disabled={importing || selectedCount === 0}
                        className="flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white transition-colors"
                    >
                        {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Import {selectedCount > 0 ? `(${selectedCount})` : "Selected"}
                    </button>
                </div>
            )}

            {/* Sound cards */}
            <div className="space-y-2.5">
                {cards.map(card => (
                    <SoundCardRow
                        key={card.id}
                        card={card}
                        playing={playing}
                        onTogglePlay={toggle}
                        onUpdate={updateCard}
                        onRemove={removeCard}
                    />
                ))}
            </div>

            {cards.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/8 py-12 sm:py-16 text-center">
                    <Globe className="h-7 w-7 text-white/10 mx-auto mb-3" />
                    <p className="text-sm text-white/30">Paste URLs above and click Fetch Metadata</p>
                    <p className="text-xs text-white/15 mt-1">myinstants · freesound · tuna.voicemod · pixabay · 101soundboards</p>
                </div>
            )}
        </div>
    );
}

// ── Sound card row ────────────────────────────────────────────────────────────
function SoundCardRow({
    card, playing, onTogglePlay, onUpdate, onRemove,
}: {
    card: SoundCard;
    playing: string | null;
    onTogglePlay: (url: string, id: string) => void;
    onUpdate: <K extends keyof SoundCard>(id: string, k: K, v: SoundCard[K]) => void;
    onRemove: (id: string) => void;
}) {
    const isPlaying = playing === card.id;
    const [expanded, setExpanded] = useState(false);
    const [rawTags, setRawTags] = useState(() => card.tags.join(", "));

    const statusIcon = {
        fetching:  <Loader2 className="h-4 w-4 animate-spin text-white/30 shrink-0" />,
        ready:     null,
        error:     <XCircle className="h-4 w-4 text-red-400 shrink-0" />,
        importing: <Loader2 className="h-4 w-4 animate-spin text-orange-400 shrink-0" />,
        done:      <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />,
        failed:    <XCircle className="h-4 w-4 text-red-400 shrink-0" />,
    }[card.status];

    const border = {
        fetching:  "border-white/8",
        ready:     card.duplicate ? "border-yellow-500/30" : "border-white/8",
        error:     "border-red-500/20",
        importing: "border-orange-500/30",
        done:      "border-green-500/20",
        failed:    "border-red-500/20",
    }[card.status];

    return (
        <div className={`rounded-2xl border ${border} bg-white/2 overflow-hidden`}>
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3">
                {/* Checkbox */}
                {(card.status === "ready") && (
                    <input
                        type="checkbox"
                        checked={card.selected}
                        onChange={e => onUpdate(card.id, "selected", e.target.checked)}
                        className="h-4 w-4 rounded accent-orange-500 cursor-pointer shrink-0"
                    />
                )}

                {statusIcon}

                {/* Source badge */}
                {card.sourceName && (
                    <span className="hidden sm:inline text-[10px] font-mono text-white/25 bg-white/5 rounded px-1.5 py-0.5 shrink-0">
                        {card.sourceName}
                    </span>
                )}

                {/* Title */}
                <div className="flex-1 min-w-0">
                    {card.status === "ready" ? (
                        <input
                            className="w-full bg-transparent text-sm font-medium text-white outline-none border-b border-transparent focus:border-orange-500/40 transition-colors py-0.5 min-w-0"
                            value={card.title}
                            onChange={e => onUpdate(card.id, "title", e.target.value)}
                            placeholder="Title"
                        />
                    ) : (
                        <span className="text-sm font-medium text-white/70 truncate block">
                            {card.status === "fetching" ? "Fetching..." :
                             card.status === "error" || card.status === "failed" ? (card.error ?? card.url) :
                             card.title || card.url.replace(/^https?:\/\//, "").slice(0, 40)}
                        </span>
                    )}
                </div>

                {card.duration && (
                    <span className="text-xs text-white/25 shrink-0 font-mono hidden sm:inline">{card.duration}</span>
                )}

                {card.duplicate && (
                    <span title="Already imported" className="shrink-0">
                        <AlertCircle className="h-4 w-4 text-yellow-400" />
                    </span>
                )}

                {card.audioUrl && card.status === "ready" && (
                    <button
                        onClick={() => onTogglePlay(card.audioUrl!, card.id)}
                        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-white/8 hover:bg-orange-500/20 hover:text-orange-400 text-white/40 transition-colors"
                    >
                        {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                )}

                {/* Done: link to public sound page */}
                {card.status === "done" && card.resultSlug && card.resultSid && (
                    <a
                        href={`/sound/${card.resultSlug}-${card.resultSid}`}
                        target="_blank"
                        className="text-xs text-green-400 hover:underline shrink-0 whitespace-nowrap"
                    >
                        View ↗
                    </a>
                )}

                {card.status === "ready" && (
                    <button onClick={() => setExpanded(v => !v)} className="shrink-0 text-white/20 hover:text-white/60">
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                )}

                <button onClick={() => onRemove(card.id)} className="shrink-0 text-white/15 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>

            {expanded && card.status === "ready" && (
                <div className="px-3 sm:px-4 pb-4 border-t border-white/6 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-white/40 mb-1">Category</label>
                        <select className="input-field" value={card.category}
                            onChange={e => onUpdate(card.id, "category", e.target.value as Category)}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-white/40 mb-1">License</label>
                        <select className="input-field" value={card.license}
                            onChange={e => onUpdate(card.id, "license", e.target.value as License)}>
                            {LICENSE_VALUES.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-xs text-white/40 mb-1">Tags (comma-separated)</label>
                        <input className="input-field"
                            value={rawTags}
                            onChange={e => setRawTags(e.target.value)}
                            onBlur={() => onUpdate(card.id, "tags", rawTags.split(",").map(t => t.trim()).filter(Boolean))}
                            placeholder="tag1, tag2, tag3"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-xs text-white/40 mb-1">Description</label>
                        <textarea className="input-field resize-none" rows={2}
                            value={card.description ?? ""}
                            onChange={e => onUpdate(card.id, "description", e.target.value)}
                            placeholder="Optional description"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <p className="text-xs text-white/20 font-mono truncate">
                            <a href={card.url} target="_blank" className="hover:text-white/40 underline underline-offset-2">{card.url}</a>
                        </p>
                        {card.duplicate && (
                            <p className="text-xs text-yellow-400/70 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> This URL was already imported
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
