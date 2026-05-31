"use client";

import { useState, useRef } from "react";
import { Loader2, Check, X, Play, Pause, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { getR2Url } from "@/app/lib/r2/r2Url";

interface PendingSound {
    _id: string;
    s_id: string;
    slug: string;
    title: string;
    category: string;
    duration: string;
    tags: string[];
    description: string;
    user: { uid: string; name: string };
    createdAt: string;
    moderationStatus: string;
}

function AudioPreview({ s_id }: { s_id: string }) {
    const [playing, setPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    function toggle() {
        const url = getR2Url(`store/${s_id}.mp3`) ?? "";
        if (!audioRef.current) {
            audioRef.current = new Audio(url);
            audioRef.current.onended = () => setPlaying(false);
            audioRef.current.onerror = () => { setPlaying(false); setLoading(false); toast.error("Audio load failed"); };
        }
        if (playing) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setPlaying(false);
            return;
        }
        setLoading(true);
        audioRef.current.play()
            .then(() => setPlaying(true))
            .catch(() => toast.error("Playback blocked"))
            .finally(() => setLoading(false));
    }

    return (
        <button
            onClick={toggle}
            title={playing ? "Stop preview" : "Preview audio"}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 hover:bg-orange-500/20 text-white/40 hover:text-orange-400 transition-colors shrink-0"
        >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : playing ? <Pause className="h-3.5 w-3.5" />
                : <Play className="h-3.5 w-3.5" />}
        </button>
    );
}

export default function ModerationActions({ sounds: initial }: { sounds: PendingSound[] }) {
    const [sounds, setSounds] = useState(initial);
    const [processing, setProcessing] = useState<string | null>(null);

    async function moderate(id: string, action: "approve" | "reject") {
        setProcessing(id);
        try {
            const res = await fetch("/api/admin/moderate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, action }),
            });
            if (res.ok) {
                setSounds(prev => prev.filter(s => s._id !== id));
                toast.success(action === "approve" ? "Sound approved and published" : "Sound rejected");
            } else {
                toast.error("Action failed");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setProcessing(null);
        }
    }

    if (sounds.length === 0) {
        return (
            <div className="rounded-2xl border border-white/8 bg-[#111113] py-10 text-center text-white/30 text-sm">
                All caught up!
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <p className="text-xs text-white/30 flex items-center gap-1.5 pb-1">
                <Volume2 className="h-3.5 w-3.5" />
                Click the play button to preview audio before approving
            </p>
            {sounds.map(s => (
                <div key={s._id} className="rounded-2xl border border-white/8 bg-[#111113] p-4">
                    <div className="flex items-start justify-between gap-3">
                        {/* Inline audio preview — plays directly from R2, no visibility check needed */}
                        <AudioPreview s_id={s.s_id} />

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-semibold text-sm truncate">{s.title}</span>
                                <span className="text-xs border border-white/10 rounded-full px-2 py-0.5 text-white/40 shrink-0">{s.category}</span>
                                <span className="text-xs text-white/30 font-mono shrink-0">{s.duration}</span>
                            </div>
                            {s.description && <p className="text-xs text-white/40 mb-1.5 line-clamp-1">{s.description}</p>}
                            {s.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-1.5">
                                    {s.tags.slice(0, 5).map(t => (
                                        <span key={t} className="text-[10px] text-white/25 bg-white/4 rounded-full px-1.5 py-0.5">#{t}</span>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-xs text-white/25">
                                <span>by {s.user?.name ?? "Unknown"}</span>
                                <span>·</span>
                                <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div className="flex gap-1.5 shrink-0">
                            <button
                                onClick={() => moderate(s._id, "approve")}
                                disabled={processing === s._id}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/25 text-green-400 text-xs font-medium disabled:opacity-40 transition-colors"
                            >
                                {processing === s._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                Approve
                            </button>
                            <button
                                onClick={() => moderate(s._id, "reject")}
                                disabled={processing === s._id}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-medium disabled:opacity-40 transition-colors"
                            >
                                {processing === s._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
