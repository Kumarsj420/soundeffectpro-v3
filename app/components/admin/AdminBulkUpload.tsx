"use client";

import { useState, useRef, useCallback, useId } from "react";
import { CATEGORIES, LICENSE_VALUES } from "@/app/lib/constants";
import { cn } from "@/app/lib/utils";
import { Upload, X, CheckCircle2, AlertCircle, Loader2, Music2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type FileStatus = "detecting" | "queued" | "uploading" | "done" | "error";

interface FileEntry {
    id: string;
    file: File;
    title: string;
    duration: string;
    status: FileStatus;
    error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function titleFromFilename(name: string): string {
    return name
        .replace(/\.[^.]+$/, "")         // strip extension
        .replace(/[-_]+/g, " ")           // – and _ → space
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, c => c.toUpperCase()); // Title Case
}

function detectDuration(file: File): Promise<string> {
    return new Promise(resolve => {
        const audio = document.createElement("audio");
        audio.preload = "metadata";
        audio.onloadedmetadata = () => {
            const s = Math.round(audio.duration);
            URL.revokeObjectURL(audio.src);
            resolve(`${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`);
        };
        audio.onerror = () => { URL.revokeObjectURL(audio.src); resolve("00:00"); };
        audio.src = URL.createObjectURL(file);
    });
}

const AUDIO_ACCEPT = ".mp3,.wav,.ogg,.webm,audio/mpeg,audio/wav,audio/ogg,audio/webm";

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, error }: { status: FileStatus; error?: string }) {
    if (status === "detecting" || status === "uploading") return (
        <span className="flex items-center gap-1.5 text-xs text-white/40">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {status === "detecting" ? "detecting…" : "uploading…"}
        </span>
    );
    if (status === "done") return (
        <span className="flex items-center gap-1.5 text-xs text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> done
        </span>
    );
    if (status === "error") return (
        <span className="flex items-center gap-1.5 text-xs text-red-400" title={error}>
            <AlertCircle className="h-3.5 w-3.5" /> {error?.slice(0, 28) ?? "error"}
        </span>
    );
    return <span className="text-xs text-white/30">queued</span>;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminBulkUpload() {
    const uid = useId();

    // Files list
    const [entries, setEntries]     = useState<FileEntry[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Shared fields
    const [category,    setCategory]    = useState<string>("Meme");
    const [license,     setLicense]     = useState<string>("copyrighted");
    const [tags,        setTags]        = useState("");
    const [description, setDescription] = useState("");

    // ── File handling ─────────────────────────────────────────────────────────

    const addFiles = useCallback((fileList: FileList | File[]) => {
        const incoming = Array.from(fileList).filter(f =>
            f.type.startsWith("audio/") || /\.(mp3|wav|ogg|webm)$/i.test(f.name)
        );
        if (incoming.length === 0) return;

        const newEntries: FileEntry[] = incoming.map(f => ({
            id:       crypto.randomUUID(),
            file:     f,
            title:    titleFromFilename(f.name),
            duration: "…",
            status:   "detecting",
        }));

        setEntries(prev => [...prev, ...newEntries]);

        // Detect durations concurrently (update each row when ready)
        for (const entry of newEntries) {
            detectDuration(entry.file).then(duration => {
                setEntries(prev => prev.map(e =>
                    e.id === entry.id ? { ...e, duration, status: "queued" } : e
                ));
            });
        }
    }, []);

    const removeEntry = (id: string) =>
        setEntries(prev => prev.filter(e => e.id !== id));

    const clearFinished = () =>
        setEntries(prev => prev.filter(e => e.status === "queued" || e.status === "uploading"));

    const updateTitle = (id: string, title: string) =>
        setEntries(prev => prev.map(e => e.id === id ? { ...e, title } : e));

    // ── Drag & drop ───────────────────────────────────────────────────────────

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        addFiles(e.dataTransfer.files);
    }, [addFiles]);

    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = () => setIsDragging(false);

    // ── Upload all queued files sequentially ──────────────────────────────────

    async function uploadAll() {
        const queued = entries.filter(e => e.status === "queued");
        if (queued.length === 0) return;
        setIsUploading(true);

        for (const entry of queued) {
            setEntries(prev => prev.map(e =>
                e.id === entry.id ? { ...e, status: "uploading" } : e
            ));

            try {
                const fd = new FormData();
                fd.append("file",        entry.file);
                fd.append("title",       entry.title.trim() || titleFromFilename(entry.file.name));
                fd.append("category",    category);
                fd.append("license",     license);
                fd.append("tags",        tags);
                fd.append("description", description);
                fd.append("duration",    entry.duration === "…" ? "00:00" : entry.duration);

                const res  = await fetch("/api/admin/bulk-upload", { method: "POST", body: fd });
                const data = await res.json() as { ok?: boolean; error?: string };

                if (!res.ok) throw new Error(data.error ?? "Upload failed");

                setEntries(prev => prev.map(e =>
                    e.id === entry.id ? { ...e, status: "done", error: undefined } : e
                ));
            } catch (err) {
                setEntries(prev => prev.map(e =>
                    e.id === entry.id ? { ...e, status: "error", error: (err as Error).message } : e
                ));
            }
        }

        setIsUploading(false);
    }

    // ── Derived counts ────────────────────────────────────────────────────────

    const counts = {
        queued:    entries.filter(e => e.status === "queued").length,
        uploading: entries.filter(e => e.status === "uploading").length,
        done:      entries.filter(e => e.status === "done").length,
        error:     entries.filter(e => e.status === "error").length,
    };
    const hasFinished = counts.done > 0 || counts.error > 0;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold">Bulk Upload</h1>
                <p className="text-white/40 text-sm mt-1">
                    Drop multiple audio files — titles are auto-detected from filenames.
                    All files in a batch share the same category, tags, and license.
                </p>
            </div>

            {/* ── Drop zone ── */}
            <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                    "relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all",
                    isDragging
                        ? "border-orange-500 bg-orange-500/8 scale-[1.01]"
                        : "border-white/15 hover:border-orange-500/50 hover:bg-white/2"
                )}
            >
                <input
                    ref={fileInputRef}
                    id={`${uid}-files`}
                    type="file"
                    multiple
                    accept={AUDIO_ACCEPT}
                    className="sr-only"
                    onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                />
                <Upload className={cn(
                    "mx-auto h-10 w-10 mb-3 transition-colors",
                    isDragging ? "text-orange-400" : "text-white/20"
                )} />
                <p className="font-semibold text-white/70">
                    {isDragging ? "Drop files here" : "Drop audio files or click to browse"}
                </p>
                <p className="text-sm text-white/30 mt-1">MP3, WAV, OGG, WebM · Max 50 MB each</p>
            </div>

            {/* ── Shared fields ── */}
            <div className="rounded-2xl border border-white/8 bg-[#111113] p-5 space-y-4">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                    Shared for all files in this batch
                </p>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-1.5">Category</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full bg-[#0d0d0f] border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500/50 transition-colors"
                        >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-1.5">License</label>
                        <select
                            value={license}
                            onChange={e => setLicense(e.target.value)}
                            className="w-full bg-[#0d0d0f] border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500/50 transition-colors"
                        >
                            {LICENSE_VALUES.map(l => (
                                <option key={l} value={l}>{l.replace(/-/g, " ")}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">
                        Tags <span className="text-white/30">(comma separated, applied to all)</span>
                    </label>
                    <input
                        type="text"
                        value={tags}
                        onChange={e => setTags(e.target.value)}
                        placeholder="bruh, meme, funny, tiktok"
                        className="w-full bg-[#0d0d0f] border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500/50 transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">
                        Description <span className="text-white/30">(optional, applied to all)</span>
                    </label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Sound origin, usage context…"
                        rows={2}
                        maxLength={600}
                        className="w-full bg-[#0d0d0f] border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500/50 transition-colors resize-none"
                    />
                </div>
            </div>

            {/* ── File list ── */}
            {entries.length > 0 && (
                <div className="rounded-2xl border border-white/8 bg-[#111113] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
                        <div className="flex items-center gap-3 text-sm text-white/50">
                            <Music2 className="h-4 w-4" />
                            <span>
                                {counts.queued > 0 && <span className="text-white">{counts.queued} queued</span>}
                                {counts.uploading > 0 && <span className="text-orange-400 ml-2">{counts.uploading} uploading</span>}
                                {counts.done > 0 && <span className="text-green-400 ml-2">{counts.done} done</span>}
                                {counts.error > 0 && <span className="text-red-400 ml-2">{counts.error} failed</span>}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {hasFinished && (
                                <button
                                    onClick={clearFinished}
                                    className="text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-1"
                                >
                                    Clear done/errors
                                </button>
                            )}
                            <button
                                onClick={uploadAll}
                                disabled={isUploading || counts.queued === 0}
                                className="flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white transition-colors"
                            >
                                {isUploading
                                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
                                    : <><Upload className="h-4 w-4" /> Upload {counts.queued > 0 ? `${counts.queued} files` : "All"}</>
                                }
                            </button>
                        </div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
                        {entries.map((entry) => (
                            <div key={entry.id} className="flex items-center gap-3 px-5 py-3">
                                {/* Editable title */}
                                <input
                                    type="text"
                                    value={entry.title}
                                    onChange={e => updateTitle(entry.id, e.target.value)}
                                    disabled={entry.status === "uploading" || entry.status === "done"}
                                    className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-orange-500/50 outline-none text-sm py-0.5 transition-colors disabled:opacity-50"
                                />

                                {/* Duration */}
                                <span className="text-xs text-white/30 shrink-0 w-10 text-right tabular-nums">
                                    {entry.duration}
                                </span>

                                {/* Status */}
                                <div className="w-32 shrink-0 text-right">
                                    <StatusBadge status={entry.status} error={entry.error} />
                                </div>

                                {/* Remove (only when queued/error) */}
                                {(entry.status === "queued" || entry.status === "error" || entry.status === "done") && (
                                    <button
                                        onClick={() => removeEntry(entry.id)}
                                        className="shrink-0 p-1 rounded-full text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                        aria-label="Remove"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                                {(entry.status === "uploading" || entry.status === "detecting") && (
                                    <div className="w-6 shrink-0" /> /* placeholder to keep alignment */
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
