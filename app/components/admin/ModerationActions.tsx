"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

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
                toast.success(action === "approve" ? "Sound approved" : "Sound rejected");
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
            {sounds.map(s => (
                <div key={s._id} className="rounded-2xl border border-white/8 bg-[#111113] p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-semibold text-sm truncate">{s.title}</span>
                                <span className="text-xs border border-white/10 rounded-full px-2 py-0.5 text-white/40 shrink-0">{s.category}</span>
                                <span className="text-xs text-white/30 shrink-0">{s.duration}</span>
                            </div>
                            {s.description && <p className="text-xs text-white/40 mb-1.5 line-clamp-1">{s.description}</p>}
                            <div className="flex items-center gap-2 text-xs text-white/30">
                                <span>by {s.user?.name ?? "Unknown"}</span>
                                <span>·</span>
                                <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                                {s.slug && (
                                    <>
                                        <span>·</span>
                                        <Link href={`/sound/${s.slug}-${s.s_id}`} target="_blank" className="text-orange-400 hover:text-orange-300">
                                            Preview
                                        </Link>
                                    </>
                                )}
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
