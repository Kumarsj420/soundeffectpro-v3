"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { CATEGORIES } from "@/app/lib/constants";
import type { Category } from "@/app/lib/constants";
import {
    Film, Search, ImagePlus, CheckCircle2, XCircle,
    Loader2, Download, RefreshCw, X as XIcon, Play, Pause,
    ChevronDown, ChevronUp, Maximize2, Minimize2,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Sound {
    s_id: string;
    title: string;
    slug: string;
    duration: string;
    tags: string[];
    category: string;
}

interface SelectedSound extends Sound {
    videoTitle: string; // editable, defaults to title.toUpperCase()
}

type VideoStatus = "queued" | "processing" | "done" | "failed";

interface VideoProgress {
    s_id: string;
    title: string;
    status: VideoStatus;
    progress: number;
    error?: string;
    filename?: string;
}

// ── Shared audio preview player ───────────────────────────────────────────────
function useAudioPlayer() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playing, setPlaying] = useState<string | null>(null);

    const toggle = useCallback((s_id: string, url: string) => {
        if (playing === s_id) {
            audioRef.current?.pause();
            setPlaying(null);
            return;
        }
        if (!audioRef.current) audioRef.current = new Audio();
        audioRef.current.pause();
        audioRef.current.src = url;
        audioRef.current.play().then(() => setPlaying(s_id)).catch(() => setPlaying(null));
        audioRef.current.onended = () => setPlaying(null);
    }, [playing]);

    return { playing, toggle };
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VideoCreatorPage() {
    const [phase, setPhase] = useState<"setup" | "generating">("setup");

    // Setup state
    const [query, setQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [searchResults, setSearchResults] = useState<Sound[]>([]);
    const [searching, setSearching] = useState(false);
    const [selected, setSelected] = useState<SelectedSound[]>([]);
    const [format, setFormat] = useState<"landscape" | "portrait">("landscape");
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [coverBase64, setCoverBase64] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const { playing, toggle } = useAudioPlayer();

    // Generating state
    const [jobId, setJobId] = useState<string | null>(null);
    const [videoProgress, setVideoProgress] = useState<VideoProgress[]>([]);
    const [zipReady, setZipReady] = useState(false);
    const [zipFilename, setZipFilename] = useState<string | null>(null);

    // ── Sound search ──────────────────────────────────────────────────────────
    const searchSounds = useCallback(async (q: string, cat: string) => {
        setSearching(true);
        try {
            const params = new URLSearchParams({ limit: "20" });
            if (q) params.set("q", q);
            if (cat && cat !== "all") params.set("category", cat);
            const res = await fetch(`/api/admin/video-creator/sounds?${params}`);
            const data = await res.json();
            setSearchResults(data.sounds ?? []);
        } catch {
            toast.error("Search failed");
        } finally {
            setSearching(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => searchSounds(query, categoryFilter), 300);
        return () => clearTimeout(t);
    }, [query, categoryFilter, searchSounds]);

    // Load initial results
    useEffect(() => { searchSounds("", "all"); }, [searchSounds]);

    // ── Select / deselect sounds ──────────────────────────────────────────────
    const toggleSound = useCallback((sound: Sound) => {
        setSelected(prev => {
            const exists = prev.find(s => s.s_id === sound.s_id);
            if (exists) return prev.filter(s => s.s_id !== sound.s_id);
            if (prev.length >= 15) { toast.error("Max 15 sounds"); return prev; }
            return [...prev, { ...sound, videoTitle: sound.title.toUpperCase() }];
        });
    }, []);

    const removeSelected = useCallback((s_id: string) => {
        setSelected(prev => prev.filter(s => s.s_id !== s_id));
    }, []);

    const updateTitle = useCallback((s_id: string, title: string) => {
        setSelected(prev => prev.map(s => s.s_id === s_id ? { ...s, videoTitle: title } : s));
    }, []);

    // ── Cover image upload ────────────────────────────────────────────────────
    const handleCoverUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const img = new Image();
        const objUrl = URL.createObjectURL(file);
        img.onload = () => {
            const MAX = 1920;
            const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
            const canvas = document.createElement("canvas");
            canvas.width  = Math.round(img.width  * ratio);
            canvas.height = Math.round(img.height * ratio);
            canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
            setCoverPreview(dataUrl);
            setCoverBase64(dataUrl.split(",")[1]);
            URL.revokeObjectURL(objUrl);
        };
        img.src = objUrl;
        e.target.value = "";
    }, []);

    // ── SSE subscription ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!jobId) return;
        const es = new EventSource(`/api/admin/video-creator/progress/${jobId}`);

        es.onmessage = (e) => {
            const event = JSON.parse(e.data) as Record<string, unknown>;

            if (event.type === "init") {
                const vids = event.videos as VideoProgress[];
                setVideoProgress(vids);
                if (event.zipReady) { setZipReady(true); setZipFilename(event.zipFilename as string); }
            } else if (event.type === "video_update") {
                setVideoProgress(prev => prev.map(v =>
                    v.s_id === event.s_id ? { ...v, ...event } : v
                ));
            } else if (event.type === "zip_ready") {
                setZipReady(true);
                setZipFilename(event.zipFilename as string);
            }
        };

        es.onerror = () => es.close();
        return () => es.close();
    }, [jobId]);

    // ── Generate ──────────────────────────────────────────────────────────────
    const handleGenerate = useCallback(async () => {
        if (!coverBase64) { toast.error("Upload a cover image first"); return; }
        if (selected.length === 0) { toast.error("Select at least one sound"); return; }

        setGenerating(true);
        try {
            const res = await fetch("/api/admin/video-creator", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    format,
                    coverBase64,
                    videos: selected.map(s => ({
                        s_id: s.s_id,
                        title: s.videoTitle || s.title.toUpperCase(),
                        duration: s.duration,
                    })),
                }),
            });
            const data = await res.json();
            if (!res.ok) { toast.error(data.error ?? "Failed to start"); return; }

            // Optimistic init — SSE will confirm
            setVideoProgress(selected.map(s => ({
                s_id: s.s_id,
                title: s.videoTitle || s.title.toUpperCase(),
                status: "queued",
                progress: 0,
            })));
            setZipReady(false);
            setZipFilename(null);
            setJobId(data.jobId);
            setPhase("generating");
        } catch {
            toast.error("Network error");
        } finally {
            setGenerating(false);
        }
    }, [coverBase64, selected, format]);

    // ── Retry a failed video ──────────────────────────────────────────────────
    const handleRetry = useCallback(async (s_id: string) => {
        if (!jobId) return;
        setVideoProgress(prev => prev.map(v =>
            v.s_id === s_id ? { ...v, status: "queued", progress: 0, error: undefined } : v
        ));
        await fetch("/api/admin/video-creator", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "retry", jobId, s_id }),
        });
    }, [jobId]);

    const doneCount = videoProgress.filter(v => v.status === "done").length;
    const failedCount = videoProgress.filter(v => v.status === "failed").length;
    const allSettled = videoProgress.length > 0 &&
        videoProgress.every(v => v.status === "done" || v.status === "failed");

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                        <Film className="h-5 w-5 text-orange-400 shrink-0" />
                        Video Creator
                    </h1>
                    <p className="text-xs text-white/40 mt-1">
                        Select sounds, add a cover image, generate MP4 videos for YouTube.
                    </p>
                </div>
                {phase === "generating" && (
                    <button
                        onClick={() => { setPhase("setup"); setJobId(null); setVideoProgress([]); setZipReady(false); }}
                        className="text-xs text-white/40 hover:text-white underline underline-offset-2"
                    >
                        ← New batch
                    </button>
                )}
            </div>

            {phase === "setup" ? (
                <SetupPhase
                    query={query} setQuery={setQuery}
                    categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
                    searchResults={searchResults} searching={searching}
                    selected={selected}
                    format={format} setFormat={setFormat}
                    coverPreview={coverPreview}
                    coverInputRef={coverInputRef}
                    generating={generating}
                    playing={playing}
                    onToggleSound={toggleSound}
                    onRemoveSelected={removeSelected}
                    onUpdateTitle={updateTitle}
                    onCoverUpload={handleCoverUpload}
                    onClearCover={() => { setCoverPreview(null); setCoverBase64(null); }}
                    onGenerate={handleGenerate}
                    onTogglePlay={toggle}
                />
            ) : (
                <GeneratingPhase
                    jobId={jobId!}
                    videoProgress={videoProgress}
                    zipReady={zipReady}
                    zipFilename={zipFilename}
                    doneCount={doneCount}
                    failedCount={failedCount}
                    allSettled={allSettled}
                    format={format}
                    onRetry={handleRetry}
                />
            )}
        </div>
    );
}

// ── Setup Phase ───────────────────────────────────────────────────────────────
function SetupPhase({
    query, setQuery, categoryFilter, setCategoryFilter,
    searchResults, searching, selected, format, setFormat,
    coverPreview, coverInputRef, generating, playing,
    onToggleSound, onRemoveSelected, onUpdateTitle,
    onCoverUpload, onClearCover, onGenerate, onTogglePlay,
}: {
    query: string; setQuery: (v: string) => void;
    categoryFilter: string; setCategoryFilter: (v: string) => void;
    searchResults: Sound[]; searching: boolean;
    selected: SelectedSound[];
    format: "landscape" | "portrait"; setFormat: (v: "landscape" | "portrait") => void;
    coverPreview: string | null;
    coverInputRef: React.RefObject<HTMLInputElement | null>;
    generating: boolean;
    playing: string | null;
    onToggleSound: (s: Sound) => void;
    onRemoveSelected: (id: string) => void;
    onUpdateTitle: (id: string, title: string) => void;
    onCoverUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClearCover: () => void;
    onGenerate: () => void;
    onTogglePlay: (s_id: string, url: string) => void;
}) {
    const R2_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
    const [showSearch, setShowSearch] = useState(true);
    const selectedIds = new Set(selected.map(s => s.s_id));

    return (
        <div className="space-y-5">
            {/* Format + Cover in one row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Format */}
                <div className="rounded-2xl border border-white/8 bg-white/2 p-4 space-y-3">
                    <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Format</p>
                    <div className="flex gap-2">
                        {(["landscape", "portrait"] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFormat(f)}
                                className={cn(
                                    "flex-1 flex flex-col items-center gap-2 rounded-xl border px-3 py-3 text-xs font-medium transition-all",
                                    format === f
                                        ? "border-orange-500/60 bg-orange-500/10 text-orange-400"
                                        : "border-white/8 text-white/40 hover:text-white hover:border-white/20"
                                )}
                            >
                                <span className={cn(
                                    "border-2 rounded bg-white/5",
                                    f === "landscape"
                                        ? "w-12 h-7 border-current"
                                        : "w-7 h-12 border-current"
                                )} />
                                {f === "landscape" ? "Landscape 16:9" : "Portrait 9:16"}
                                <span className="text-[10px] text-white/25">
                                    {f === "landscape" ? "1920×1080" : "1080×1920"}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cover image */}
                <div className="rounded-2xl border border-white/8 bg-white/2 p-4 space-y-3">
                    <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Cover Image</p>
                    {coverPreview ? (
                        <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={coverPreview} alt="Cover" className="h-16 w-16 rounded-xl object-cover border border-white/10 shrink-0" />
                            <div className="space-y-1.5">
                                <p className="text-xs text-white/40">Will be applied to all videos</p>
                                <div className="flex gap-3">
                                    <button onClick={() => coverInputRef.current?.click()} className="text-xs text-orange-400 hover:text-orange-300 underline underline-offset-2">Replace</button>
                                    <button onClick={onClearCover} className="text-xs text-white/30 hover:text-red-400 underline underline-offset-2">Remove</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => coverInputRef.current?.click()}
                            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 hover:border-orange-500/40 bg-white/2 hover:bg-orange-500/5 px-4 py-4 text-sm text-white/30 hover:text-orange-400 transition-all"
                        >
                            <ImagePlus className="h-4 w-4 shrink-0" />
                            Upload cover image
                        </button>
                    )}
                    <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={onCoverUpload} />
                </div>
            </div>

            {/* Sound search */}
            <div className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
                <button
                    onClick={() => setShowSearch(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/60 hover:text-white transition-colors"
                >
                    <span className="flex items-center gap-2">
                        <Search className="h-4 w-4 shrink-0" />
                        Search Sounds
                        <span className="text-xs text-white/25 font-normal">{selected.length}/15 selected</span>
                    </span>
                    {showSearch ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                </button>

                {showSearch && (
                    <div className="border-t border-white/6 px-4 pb-4 pt-3 space-y-3">
                        <div className="flex gap-2">
                            <input
                                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-orange-500/50"
                                placeholder="Search by title..."
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                            />
                            <select
                                className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/60 outline-none focus:border-orange-500/50 shrink-0"
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                            >
                                <option value="all">All</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                            {searching && (
                                <div className="flex items-center gap-2 py-3 text-xs text-white/30">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching...
                                </div>
                            )}
                            {!searching && searchResults.length === 0 && (
                                <p className="py-3 text-xs text-white/25">No sounds found</p>
                            )}
                            {searchResults.map(sound => {
                                const isSelected = selectedIds.has(sound.s_id);
                                const isPlaying = playing === sound.s_id;
                                return (
                                    <div
                                        key={sound.s_id}
                                        className={cn(
                                            "flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition-all",
                                            isSelected
                                                ? "bg-orange-500/10 border border-orange-500/30"
                                                : "hover:bg-white/4 border border-transparent"
                                        )}
                                        onClick={() => onToggleSound(sound)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            readOnly
                                            className="h-4 w-4 accent-orange-500 shrink-0 pointer-events-none"
                                        />
                                        <span className="flex-1 min-w-0 text-sm text-white truncate">{sound.title}</span>
                                        <span className="text-xs text-white/25 font-mono shrink-0">{sound.duration}</span>
                                        <span className="text-[10px] text-white/20 shrink-0 hidden sm:inline">{sound.category}</span>
                                        <button
                                            onClick={e => { e.stopPropagation(); onTogglePlay(sound.s_id, `${R2_BASE}/store/${sound.s_id}.mp3`); }}
                                            className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-white/8 hover:bg-orange-500/20 hover:text-orange-400 text-white/40 transition-colors"
                                        >
                                            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Selected sounds + title editing */}
            {selected.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-white/50 uppercase tracking-wider px-1">
                        Video Titles — {selected.length} video{selected.length !== 1 ? "s" : ""}
                    </p>
                    {selected.map(s => (
                        <div key={s.s_id} className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/2 px-3 py-2">
                            <div className="flex-1 min-w-0">
                                <input
                                    className="w-full bg-transparent text-sm font-medium text-white outline-none border-b border-transparent focus:border-orange-500/40 transition-colors py-0.5 truncate"
                                    value={s.videoTitle}
                                    onChange={e => onUpdateTitle(s.s_id, e.target.value)}
                                    placeholder="Video title"
                                />
                                <p className="text-[10px] text-white/20 mt-0.5 font-mono">{s.duration} · {s.category}</p>
                            </div>
                            <button onClick={() => onRemoveSelected(s.s_id)} className="shrink-0 text-white/15 hover:text-red-400 transition-colors">
                                <XIcon className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Generate button */}
            <div className="flex items-center gap-4 pt-2">
                <button
                    onClick={onGenerate}
                    disabled={generating || selected.length === 0 || !coverPreview}
                    className="flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2.5 text-sm font-semibold text-white transition-colors"
                >
                    {generating
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting...</>
                        : <><Film className="h-4 w-4" /> Generate {selected.length > 0 ? `${selected.length} ` : ""}Video{selected.length !== 1 ? "s" : ""}</>
                    }
                </button>
                {!coverPreview && selected.length > 0 && (
                    <p className="text-xs text-white/30">Upload a cover image to continue</p>
                )}
            </div>
        </div>
    );
}

// ── Generating Phase ──────────────────────────────────────────────────────────
function GeneratingPhase({
    jobId, videoProgress, zipReady, zipFilename,
    doneCount, failedCount, allSettled, format, onRetry,
}: {
    jobId: string;
    videoProgress: VideoProgress[];
    zipReady: boolean;
    zipFilename: string | null;
    doneCount: number;
    failedCount: number;
    allSettled: boolean;
    format: "landscape" | "portrait";
    onRetry: (s_id: string) => void;
}) {
    const total = videoProgress.length;
    const inProgress = videoProgress.filter(v => v.status === "processing").length;

    return (
        <div className="space-y-4">
            {/* Status banner */}
            <div className="rounded-2xl border border-white/8 bg-white/2 px-4 py-3 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-white/60">
                    <Film className="h-4 w-4 text-orange-400 shrink-0" />
                    {allSettled
                        ? `Done — ${doneCount} succeeded${failedCount > 0 ? `, ${failedCount} failed` : ""}`
                        : inProgress > 0
                            ? `Processing... ${doneCount + failedCount}/${total} complete`
                            : `Starting... ${doneCount + failedCount}/${total} complete`
                    }
                </div>
                <span className="text-xs text-white/25">
                    {format === "landscape" ? "Landscape 16:9 · 1920×1080" : "Portrait 9:16 · 1080×1920"}
                </span>
                <div className="flex-1" />
                {zipReady && zipFilename && (
                    <a
                        href={`/api/admin/video-creator/download?job=${jobId}&zip=true`}
                        download={zipFilename}
                        className="flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-400 px-4 py-2 text-sm font-semibold text-white transition-colors"
                    >
                        <Download className="h-4 w-4 shrink-0" />
                        Download All ZIP
                    </a>
                )}
            </div>

            {/* Video progress cards */}
            <div className="space-y-2.5">
                {videoProgress.map(v => (
                    <VideoProgressCard
                        key={v.s_id}
                        video={v}
                        jobId={jobId}
                        onRetry={onRetry}
                    />
                ))}
            </div>

            {allSettled && !zipReady && doneCount === 0 && (
                <p className="text-xs text-red-400/70 text-center py-4">All videos failed. Retry individual videos or start a new batch.</p>
            )}
        </div>
    );
}

// ── Single video progress card ────────────────────────────────────────────────
function VideoProgressCard({
    video, jobId, onRetry,
}: {
    video: VideoProgress;
    jobId: string;
    onRetry: (s_id: string) => void;
}) {
    const borderColor = {
        queued:     "border-white/8",
        processing: "border-orange-500/30",
        done:       "border-green-500/20",
        failed:     "border-red-500/20",
    }[video.status];

    const bgColor = {
        queued:     "bg-white/2",
        processing: "bg-orange-500/3",
        done:       "bg-green-500/3",
        failed:     "bg-red-500/3",
    }[video.status];

    return (
        <div className={`rounded-2xl border ${borderColor} ${bgColor} overflow-hidden`}>
            <div className="flex items-center gap-3 px-4 py-3">
                {/* Status icon */}
                <span className="shrink-0">
                    {video.status === "queued"     && <div className="h-4 w-4 rounded-full border-2 border-white/20" />}
                    {video.status === "processing" && <Loader2 className="h-4 w-4 animate-spin text-orange-400" />}
                    {video.status === "done"       && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                    {video.status === "failed"     && <XCircle className="h-4 w-4 text-red-400" />}
                </span>

                {/* Title */}
                <span className={cn(
                    "flex-1 min-w-0 text-sm font-medium truncate",
                    video.status === "done" ? "text-white" :
                    video.status === "failed" ? "text-red-300" : "text-white/70"
                )}>
                    {video.title}
                </span>

                {/* Status text */}
                <span className="text-xs text-white/30 shrink-0 hidden sm:inline">
                    {video.status === "queued"     && "Queued"}
                    {video.status === "processing" && `${video.progress}%`}
                    {video.status === "done"       && "Done"}
                    {video.status === "failed"     && "Failed"}
                </span>

                {/* Actions */}
                {video.status === "done" && video.filename && (
                    <a
                        href={`/api/admin/video-creator/download?job=${jobId}&file=${encodeURIComponent(video.filename)}`}
                        download={video.filename}
                        className="shrink-0 flex items-center gap-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Download MP4
                    </a>
                )}
                {video.status === "failed" && (
                    <button
                        onClick={() => onRetry(video.s_id)}
                        className="shrink-0 flex items-center gap-1.5 rounded-lg border border-white/10 hover:border-orange-500/30 hover:text-orange-400 px-3 py-1.5 text-xs font-medium text-white/40 transition-colors"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry
                    </button>
                )}
            </div>

            {/* Progress bar */}
            {(video.status === "processing" || (video.status === "queued" && video.progress > 0)) && (
                <div className="h-0.5 bg-white/5">
                    <div
                        className="h-full bg-orange-500 transition-all duration-500"
                        style={{ width: `${video.progress}%` }}
                    />
                </div>
            )}
            {video.status === "processing" && video.progress === 0 && (
                <div className="h-0.5 bg-orange-500/30 overflow-hidden">
                    <div className="h-full w-1/3 bg-orange-500 animate-[shimmer_1.5s_ease-in-out_infinite]" />
                </div>
            )}

            {/* Error detail */}
            {video.status === "failed" && video.error && (
                <p className="px-4 pb-3 text-xs text-red-400/60 font-mono">{video.error}</p>
            )}
        </div>
    );
}
