"use client";

import { useState } from "react";
import Link from "next/link";

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

interface PendingReport {
    _id: string;
    senderEmail: string;
    type: string;
    target: { from: string; id: string };
    content: string;
    createdAt: string;
}

interface Props {
    sounds: PendingSound[];
    reports: PendingReport[];
}

type Tab = 'sounds' | 'reports';

export default function ModerationQueue({ sounds: initialSounds, reports }: Props) {
    const [tab, setTab] = useState<Tab>('sounds');
    const [sounds, setSounds] = useState(initialSounds);
    const [processing, setProcessing] = useState<string | null>(null);

    async function moderate(id: string, action: 'approve' | 'reject') {
        setProcessing(id);
        try {
            const res = await fetch('/api/admin/moderate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action }),
            });
            if (res.ok) {
                setSounds((prev) => prev.filter((s) => s._id !== id));
            }
        } catch {
            // silent fail — user can refresh
        } finally {
            setProcessing(null);
        }
    }

    return (
        <div>
            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10 mb-6">
                <button
                    onClick={() => setTab('sounds')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${tab === 'sounds' ? 'border-orange-500 text-orange-400' : 'border-transparent text-white/50 hover:text-white'}`}
                >
                    Pending Sounds ({sounds.length})
                </button>
                <button
                    onClick={() => setTab('reports')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${tab === 'reports' ? 'border-orange-500 text-orange-400' : 'border-transparent text-white/50 hover:text-white'}`}
                >
                    Reports ({reports.length})
                </button>
            </div>

            {/* Pending sounds */}
            {tab === 'sounds' && (
                <div className="space-y-3">
                    {sounds.length === 0 && (
                        <div className="text-center py-16 text-white/30">
                            <p className="text-4xl mb-3">✅</p>
                            <p>All caught up! No pending sounds.</p>
                        </div>
                    )}
                    {sounds.map((s) => (
                        <div key={s._id} className="rounded-2xl border border-white/10 bg-[#141414] p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <h3 className="font-semibold">{s.title}</h3>
                                        <span className="text-xs border border-white/10 rounded-full px-2 py-0.5 text-white/40">{s.category}</span>
                                        <span className="text-xs text-white/30">{s.duration}</span>
                                    </div>
                                    {s.description && (
                                        <p className="text-sm text-white/50 mb-2 line-clamp-2">{s.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {s.tags.map((tag) => (
                                            <span key={tag} className="text-xs text-white/30 bg-white/5 rounded-full px-2 py-0.5">#{tag}</span>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-white/30">
                                        <Link href={`/profile/${s.user.uid}`} className="hover:text-white transition-colors">
                                            by {s.user.name}
                                        </Link>
                                        <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                                        <Link href={`/sound/${s.slug}`} className="text-orange-400 hover:text-orange-300 transition-colors">
                                            Preview →
                                        </Link>
                                    </div>
                                </div>

                                <div className="flex gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => moderate(s._id, 'approve')}
                                        disabled={processing === s._id}
                                        className="px-3 py-1.5 rounded-xl bg-green-500/15 hover:bg-green-500/25 text-green-400 text-sm font-medium disabled:opacity-40 transition-colors"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => moderate(s._id, 'reject')}
                                        disabled={processing === s._id}
                                        className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-sm font-medium disabled:opacity-40 transition-colors"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reports */}
            {tab === 'reports' && (
                <div className="space-y-3">
                    {reports.length === 0 && (
                        <div className="text-center py-16 text-white/30">
                            <p className="text-4xl mb-3">✅</p>
                            <p>No unread reports.</p>
                        </div>
                    )}
                    {reports.map((r) => (
                        <div key={r._id} className="rounded-2xl border border-white/10 bg-[#141414] p-4">
                            <div className="flex items-start gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-xs font-semibold bg-red-500/20 text-red-400 rounded-full px-2 py-0.5 capitalize">{r.type}</span>
                                        <span className="text-xs text-white/30">from {r.target.from} · ID: {r.target.id}</span>
                                    </div>
                                    <p className="text-sm text-white/70 mb-2">{r.content}</p>
                                    <p className="text-xs text-white/30">
                                        Reported by {r.senderEmail} · {new Date(r.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
