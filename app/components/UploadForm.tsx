"use client";

import { useState, useRef } from "react";
import { CATEGORIES } from "@/app/lib/constants";

interface UploadFormProps {
    userName: string;
}

function getDuration(file: File): Promise<string> {
    return new Promise((resolve) => {
        const audio = document.createElement("audio");
        audio.preload = "metadata";
        audio.onloadedmetadata = () => {
            const secs = Math.round(audio.duration);
            const m = String(Math.floor(secs / 60)).padStart(2, '0');
            const s = String(secs % 60).padStart(2, '0');
            URL.revokeObjectURL(audio.src);
            resolve(`${m}:${s}`);
        };
        audio.onerror = () => { URL.revokeObjectURL(audio.src); resolve("00:00"); };
        audio.src = URL.createObjectURL(file);
    });
}

export default function UploadForm({ userName }: UploadFormProps) {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<string>("Meme");
    const [tags, setTags] = useState("");
    const [duration, setDuration] = useState("00:00");
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState("");
    const [successSlug, setSuccessSlug] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
        const d = await getDuration(f);
        setDuration(d);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!file) return;

        setStatus('uploading');
        setErrorMsg('');

        const fd = new FormData();
        fd.append("file", file);
        fd.append("title", title);
        fd.append("description", description);
        fd.append("category", category);
        fd.append("tags", tags);
        fd.append("duration", duration);

        try {
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            const data = await res.json();

            if (!res.ok) {
                setErrorMsg(data.error ?? "Upload failed. Please try again.");
                setStatus('error');
                return;
            }

            setStatus('success');
            setSuccessSlug(data.slug);
        } catch {
            setErrorMsg("Network error. Please check your connection.");
            setStatus('error');
        }
    }

    if (status === 'success') {
        return (
            <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-8 text-center space-y-4">
                <div className="text-4xl">🎉</div>
                <h2 className="text-xl font-bold text-green-400">Sound Uploaded!</h2>
                <p className="text-white/60 text-sm">
                    Your sound is under review. It will appear on the platform within 24 hours once approved.
                </p>
                <div className="flex justify-center gap-3">
                    <button
                        onClick={() => {
                            setStatus('idle');
                            setFile(null);
                            setTitle('');
                            setDescription('');
                            setTags('');
                            setDuration('00:00');
                            if (fileRef.current) fileRef.current.value = '';
                        }}
                        className="rounded-xl bg-white/8 hover:bg-white/12 px-4 py-2 text-sm transition-colors"
                    >
                        Upload Another
                    </button>
                    <a
                        href={`/sound/${successSlug}`}
                        className="rounded-xl bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 text-sm transition-colors"
                    >
                        View Sound Page
                    </a>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* File drop zone */}
            <div
                onClick={() => fileRef.current?.click()}
                className="relative border-2 border-dashed border-white/15 hover:border-orange-500/50 rounded-2xl p-8 text-center cursor-pointer transition-colors group"
            >
                <input
                    ref={fileRef}
                    type="file"
                    accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm,.mp3,.wav,.ogg,.webm"
                    onChange={handleFileChange}
                    className="sr-only"
                    aria-label="Choose audio file"
                />
                {file ? (
                    <div className="space-y-1">
                        <p className="font-semibold text-orange-400">{file.name}</p>
                        <p className="text-sm text-white/40">{(file.size / 1024 / 1024).toFixed(2)} MB · {duration}</p>
                    </div>
                ) : (
                    <>
                        <svg className="mx-auto h-10 w-10 text-white/20 group-hover:text-orange-500/50 mb-3 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                        </svg>
                        <p className="font-medium text-white/60">Click to select audio file</p>
                        <p className="text-sm text-white/30 mt-1">MP3, WAV, OGG, WebM · Max 10 MB</p>
                    </>
                )}
            </div>

            {/* Title */}
            <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5" htmlFor="title">
                    Title <span className="text-red-400">*</span>
                </label>
                <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Bruh Sound Effect"
                    required
                    minLength={3}
                    maxLength={100}
                    className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-500/50 transition-colors"
                />
                <p className="text-xs text-white/30 mt-1">{title.length}/100</p>
            </div>

            {/* Category */}
            <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5" htmlFor="category">
                    Category <span className="text-red-400">*</span>
                </label>
                <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-500/50 transition-colors"
                >
                    {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            {/* Tags */}
            <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5" htmlFor="tags">
                    Tags <span className="text-white/30">(comma separated)</span>
                </label>
                <input
                    id="tags"
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="bruh, meme, funny, tiktok"
                    className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-500/50 transition-colors"
                />
                <p className="text-xs text-white/30 mt-1">Max 10 tags, each up to 15 characters</p>
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5" htmlFor="description">
                    Description <span className="text-white/30">(optional but helps SEO)</span>
                </label>
                <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Where is this sound from? What's the meme origin? What's it used for?"
                    maxLength={600}
                    rows={3}
                    className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-500/50 transition-colors resize-none"
                />
                <p className="text-xs text-white/30 mt-1">{description.length}/600</p>
            </div>

            {/* Error */}
            {status === 'error' && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
                    {errorMsg}
                </div>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={!file || !title || status === 'uploading'}
                className="w-full rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 transition-colors"
            >
                {status === 'uploading' ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                        </svg>
                        Uploading...
                    </span>
                ) : (
                    'Submit for Review'
                )}
            </button>
        </form>
    );
}
