"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { CATEGORIES, LICENSE_VALUES } from "@/app/lib/constants";
import type { Category, License } from "@/app/lib/constants";
import {
    Link2, Download, CheckCircle2, XCircle, AlertCircle,
    ChevronDown, ChevronUp, Loader2, Play, Pause, Trash2,
    Settings2, Globe, BookmarkIcon,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SoundCard {
    id: string;           // local UUID for react key
    url: string;          // original pasted URL
    status: "fetching" | "ready" | "error" | "importing" | "done" | "failed";
    error?: string;
    title: string;
    audioUrl?: string;
    thumbnailUrl?: string;
    tags: string[];       // editable, comma-joined
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
    thumbnailUrl: string;
}

const DEFAULT_ID3: GlobalId3 = {
    artist: "SoundEffectPro",
    copyright: `© ${new Date().getFullYear()} SoundEffectPro`,
    year: String(new Date().getFullYear()),
    genre: "Sound Effect",
    thumbnailUrl: "",
};

function uid() {
    return Math.random().toString(36).slice(2, 10);
}

// ── Audio preview hook ────────────────────────────────────────────────────────
function useAudioPlayer() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playing, setPlaying] = useState<string | null>(null);

    const toggle = useCallback((url: string, id: string) => {
        if (playing === id) {
            audioRef.current?.pause();
            setPlaying(null);
            return;
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = url;
        } else {
            audioRef.current = new Audio(url);
        }
        audioRef.current.src = url;
        audioRef.current.play().then(() => setPlaying(id)).catch(() => setPlaying(null));
        audioRef.current.onended = () => setPlaying(null);
    }, [playing]);

    return { playing, toggle };
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ImportPage() {
    const [urlInput, setUrlInput] = useState("");
    const [cards, setCards] = useState<SoundCard[]>([]);
    const [fetching, setFetching] = useState(false);
    const [importing, setImporting] = useState(false);
    const [globalId3, setGlobalId3] = useState<GlobalId3>(DEFAULT_ID3);
    const [showId3, setShowId3] = useState(false);
    const [showBookmarklet, setShowBookmarklet] = useState(false);
    const { playing, toggle } = useAudioPlayer();

    // Persist globalId3 in sessionStorage
    useEffect(() => {
        const saved = sessionStorage.getItem("sfx_import_id3");
        if (saved) try { setGlobalId3(JSON.parse(saved)); } catch { /* ignore */ }
    }, []);
    useEffect(() => {
        sessionStorage.setItem("sfx_import_id3", JSON.stringify(globalId3));
    }, [globalId3]);

    // Pre-fill URL from ?url= query param (bookmarklet)
    useEffect(() => {
        const sp = new URLSearchParams(window.location.search);
        const u = sp.get("url");
        if (u) { setUrlInput(u); window.history.replaceState({}, "", window.location.pathname); }
    }, []);

    const handleFetch = useCallback(async () => {
        const urls = urlInput
            .split(/[\n,]+/)
            .map(u => u.trim())
            .filter(u => u.startsWith("http"));

        if (urls.length === 0) { toast.error("Paste at least one valid URL"); return; }

        // Add placeholder cards immediately
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
                const result = (data.results as Array<Record<string, unknown>>).find(r => r.url === c.url);
                if (!result || !placeholders.find(p => p.id === c.id)) return c;
                if (result.status === "error") {
                    return { ...c, status: "error" as const, error: result.error as string };
                }
                return {
                    ...c,
                    status: "ready" as const,
                    title: result.title as string ?? "",
                    audioUrl: result.audioUrl as string ?? "",
                    thumbnailUrl: result.thumbnailUrl as string ?? undefined,
                    tags: (result.tags as string[]) ?? [],
                    category: (result.category as Category) ?? "Random",
                    license: (result.license as License) ?? "unknown",
                    description: result.description as string ?? undefined,
                    duration: result.duration as string ?? undefined,
                    sourceName: result.sourceName as string ?? undefined,
                    duplicate: result.duplicate as boolean ?? false,
                };
            }));
        } catch {
            toast.error("Fetch failed — check console");
            setCards(prev => prev.map(c =>
                placeholders.find(p => p.id === c.id)
                    ? { ...c, status: "error" as const, error: "Network error" }
                    : c
            ));
        } finally {
            setFetching(false);
        }
    }, [urlInput]);

    const updateCard = useCallback(<K extends keyof SoundCard>(id: string, key: K, value: SoundCard[K]) => {
        setCards(prev => prev.map(c => c.id === id ? { ...c, [key]: value } : c));
    }, []);

    const removeCard = useCallback((id: string) => {
        setCards(prev => prev.filter(c => c.id !== id));
    }, []);

    const toggleAll = useCallback((selected: boolean) => {
        setCards(prev => prev.map(c => c.status === "ready" ? { ...c, selected } : c));
    }, []);

    const handleImport = useCallback(async () => {
        const selected = cards.filter(c => c.selected && c.status === "ready" && c.audioUrl);
        if (selected.length === 0) { toast.error("No sounds selected"); return; }

        setImporting(true);
        setCards(prev => prev.map(c =>
            selected.find(s => s.id === c.id) ? { ...c, status: "importing" as const } : c
        ));

        try {
            const resp = await fetch("/api/admin/import-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "save",
                    items: selected.map(c => ({
                        url: c.url,
                        audioUrl: c.audioUrl,
                        title: c.title,
                        tags: c.tags,
                        category: c.category,
                        license: c.license,
                        description: c.description,
                    })),
                    globalId3,
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

            if (ok > 0) toast.success(`${ok} sound${ok > 1 ? "s" : ""} imported — pending moderation`);
            if (fail > 0) toast.error(`${fail} import${fail > 1 ? "s" : ""} failed`);
        } catch {
            toast.error("Import request failed");
            setCards(prev => prev.map(c =>
                c.status === "importing" ? { ...c, status: "failed" as const, error: "Network error" } : c
            ));
        } finally {
            setImporting(false);
        }
    }, [cards, globalId3]);

    const selectedCount = cards.filter(c => c.selected && c.status === "ready").length;
    const bookmarkletHref = `javascript:(function(){window.open('${typeof window !== "undefined" ? window.location.origin : ""}/admin/import?url='+encodeURIComponent(location.href),'_blank')})()`;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-white">Import from URL</h1>
                <p className="text-sm text-white/40 mt-1">
                    Paste URLs from myinstants, freesound.org, tuna.voicemod.net, pixabay, or 101soundboards. Sounds are saved as <span className="text-orange-400">pending</span> for review.
                </p>
            </div>

            {/* URL Input */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-white/60">
                    <Link2 className="h-4 w-4" />
                    Paste URLs (one per line)
                </div>
                <textarea
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 resize-none outline-none focus:border-orange-500/50 font-mono"
                    rows={4}
                    placeholder={"https://www.myinstants.com/en/instant/...\nhttps://freesound.org/people/.../sounds/...\nhttps://tuna.voicemod.net/sound/..."}
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleFetch(); }}
                />
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleFetch}
                        disabled={fetching || !urlInput.trim()}
                        className="flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 text-sm font-semibold text-white transition-colors"
                    >
                        {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                        Fetch Metadata
                    </button>
                    <span className="text-xs text-white/30">Ctrl+Enter to fetch</span>
                    <div className="flex-1" />
                    <button
                        onClick={() => setShowBookmarklet(v => !v)}
                        className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
                    >
                        <BookmarkIcon className="h-3.5 w-3.5" />
                        Bookmarklet
                    </button>
                </div>

                {showBookmarklet && (
                    <div className="rounded-xl border border-white/8 bg-black/20 p-4 space-y-2">
                        <p className="text-xs text-white/50">Drag this link to your bookmarks bar. Click it on any sound page to open the import tool pre-filled with that URL:</p>
                        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                        <a
                            href={bookmarkletHref}
                            className="inline-block rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-mono text-orange-400 hover:bg-orange-500/20 transition-colors cursor-grab"
                            onClick={e => e.preventDefault()}
                        >
                            📥 Import to SFX
                        </a>
                        <p className="text-xs text-white/30">Right-click → Bookmark link / drag to toolbar</p>
                    </div>
                )}
            </div>

            {/* Global ID3 Settings */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
                <button
                    onClick={() => setShowId3(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-white/60 hover:text-white transition-colors"
                >
                    <span className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        Global ID3 / Metadata (applies to all imported sounds)
                    </span>
                    {showId3 ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showId3 && (
                    <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/6">
                        {([
                            ["artist", "Artist"],
                            ["copyright", "Copyright"],
                            ["year", "Year"],
                            ["genre", "Genre"],
                            ["thumbnailUrl", "Thumbnail URL (shared cover art)"],
                        ] as const).map(([key, label]) => (
                            <div key={key} className={key === "thumbnailUrl" ? "sm:col-span-2" : ""}>
                                <label className="block text-xs text-white/40 mb-1">{label}</label>
                                <input
                                    className="input-field"
                                    value={globalId3[key]}
                                    onChange={e => setGlobalId3(g => ({ ...g, [key]: e.target.value }))}
                                    placeholder={key === "thumbnailUrl" ? "https://..." : label}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bulk Actions */}
            {cards.length > 0 && (
                <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-sm text-white/40">{cards.length} sound{cards.length !== 1 ? "s" : ""} fetched</span>
                    <button onClick={() => toggleAll(true)} className="text-xs text-white/40 hover:text-white underline underline-offset-2">Select all</button>
                    <button onClick={() => toggleAll(false)} className="text-xs text-white/40 hover:text-white underline underline-offset-2">Deselect all</button>
                    <div className="flex-1" />
                    <button
                        onClick={handleImport}
                        disabled={importing || selectedCount === 0}
                        className="flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 text-sm font-semibold text-white transition-colors"
                    >
                        {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Import Selected ({selectedCount})
                    </button>
                </div>
            )}

            {/* Sound Cards */}
            <div className="space-y-3">
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
                <div className="rounded-2xl border border-dashed border-white/8 py-16 text-center">
                    <Globe className="h-8 w-8 text-white/10 mx-auto mb-3" />
                    <p className="text-sm text-white/30">Paste URLs above and click Fetch Metadata</p>
                    <p className="text-xs text-white/20 mt-1">Supports: myinstants · freesound · tuna.voicemod · pixabay · 101soundboards</p>
                </div>
            )}
        </div>
    );
}

// ── Sound Card Row ─────────────────────────────────────────────────────────────
function SoundCardRow({
    card,
    playing,
    onTogglePlay,
    onUpdate,
    onRemove,
}: {
    card: SoundCard;
    playing: string | null;
    onTogglePlay: (url: string, id: string) => void;
    onUpdate: <K extends keyof SoundCard>(id: string, key: K, value: SoundCard[K]) => void;
    onRemove: (id: string) => void;
}) {
    const isPlaying = playing === card.id;
    const [expanded, setExpanded] = useState(false);

    const statusIcon = {
        fetching: <Loader2 className="h-4 w-4 animate-spin text-white/30" />,
        ready: null,
        error: <XCircle className="h-4 w-4 text-red-400 shrink-0" />,
        importing: <Loader2 className="h-4 w-4 animate-spin text-orange-400 shrink-0" />,
        done: <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />,
        failed: <XCircle className="h-4 w-4 text-red-400 shrink-0" />,
    }[card.status];

    const borderColor = {
        fetching: "border-white/8",
        ready: card.duplicate ? "border-yellow-500/30" : "border-white/8",
        error: "border-red-500/20",
        importing: "border-orange-500/30",
        done: "border-green-500/20",
        failed: "border-red-500/20",
    }[card.status];

    return (
        <div className={`rounded-2xl border ${borderColor} bg-white/[0.02] overflow-hidden transition-colors`}>
            {/* Card Header */}
            <div className="flex items-center gap-3 px-4 py-3">
                {/* Checkbox */}
                {(card.status === "ready" || card.status === "done" || card.status === "failed") && (
                    <input
                        type="checkbox"
                        checked={card.selected}
                        onChange={e => onUpdate(card.id, "selected", e.target.checked)}
                        className="h-4 w-4 rounded accent-orange-500 cursor-pointer shrink-0"
                        disabled={card.status !== "ready"}
                    />
                )}

                {/* Status icon or loading */}
                {statusIcon}

                {/* Source badge */}
                {card.sourceName && (
                    <span className="text-[10px] font-mono text-white/30 bg-white/5 rounded px-1.5 py-0.5 shrink-0">
                        {card.sourceName}
                    </span>
                )}

                {/* Title (editable) */}
                <div className="flex-1 min-w-0">
                    {card.status === "ready" ? (
                        <input
                            className="w-full bg-transparent text-sm font-medium text-white outline-none border-b border-transparent focus:border-orange-500/40 transition-colors py-0.5"
                            value={card.title}
                            onChange={e => onUpdate(card.id, "title", e.target.value)}
                            placeholder="Title"
                        />
                    ) : (
                        <span className="text-sm font-medium text-white/70 truncate block">
                            {card.status === "fetching" ? "Fetching..." :
                             card.status === "done" ? card.title :
                             card.status === "error" || card.status === "failed" ? (card.error ?? card.url) :
                             card.title}
                        </span>
                    )}
                </div>

                {/* Duration */}
                {card.duration && (
                    <span className="text-xs text-white/30 shrink-0 font-mono">{card.duration}</span>
                )}

                {/* Duplicate warning */}
                {card.duplicate && (
                    <span title="Already imported" className="shrink-0">
                        <AlertCircle className="h-4 w-4 text-yellow-400" />
                    </span>
                )}

                {/* Play button */}
                {card.audioUrl && card.status === "ready" && (
                    <button
                        onClick={() => onTogglePlay(card.audioUrl!, card.id)}
                        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-white/8 hover:bg-orange-500/20 hover:text-orange-400 text-white/50 transition-colors"
                    >
                        {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                )}

                {/* Done: view link */}
                {card.status === "done" && card.resultSlug && (
                    <a
                        href={`/sounds/${card.resultSlug}`}
                        target="_blank"
                        className="text-xs text-green-400 hover:underline shrink-0"
                    >
                        View →
                    </a>
                )}

                {/* Expand/Collapse */}
                {card.status === "ready" && (
                    <button onClick={() => setExpanded(v => !v)} className="shrink-0 text-white/20 hover:text-white/60 transition-colors">
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                )}

                {/* Remove */}
                <button onClick={() => onRemove(card.id)} className="shrink-0 text-white/15 hover:text-red-400 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Expanded edit panel */}
            {expanded && card.status === "ready" && (
                <div className="px-4 pb-4 pt-0 border-t border-white/6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Category */}
                    <div>
                        <label className="block text-xs text-white/40 mb-1">Category</label>
                        <select
                            className="input-field"
                            value={card.category}
                            onChange={e => onUpdate(card.id, "category", e.target.value as Category)}
                        >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {/* License */}
                    <div>
                        <label className="block text-xs text-white/40 mb-1">License</label>
                        <select
                            className="input-field"
                            value={card.license}
                            onChange={e => onUpdate(card.id, "license", e.target.value as License)}
                        >
                            {LICENSE_VALUES.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>

                    {/* Tags */}
                    <div className="sm:col-span-2">
                        <label className="block text-xs text-white/40 mb-1">
                            Tags (comma-separated, max 10)
                        </label>
                        <input
                            className="input-field"
                            value={card.tags.join(", ")}
                            onChange={e => onUpdate(card.id, "tags", e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
                            placeholder="tag1, tag2, tag3"
                        />
                    </div>

                    {/* Description */}
                    <div className="sm:col-span-2">
                        <label className="block text-xs text-white/40 mb-1">Description</label>
                        <textarea
                            className="input-field resize-none"
                            rows={2}
                            value={card.description ?? ""}
                            onChange={e => onUpdate(card.id, "description", e.target.value)}
                            placeholder="Optional description"
                        />
                    </div>

                    {/* Source URL */}
                    <div className="sm:col-span-2">
                        <p className="text-xs text-white/20 font-mono truncate">
                            Source: <a href={card.url} target="_blank" className="text-white/30 hover:text-white underline underline-offset-2">{card.url}</a>
                        </p>
                        {card.duplicate && (
                            <p className="text-xs text-yellow-400/70 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> This URL has already been imported
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
