"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LayoutGrid, Trash2, Globe, Lock, Plus, Loader2, ExternalLink } from "lucide-react";

interface Board { sb_id: string; name: string; sounds: string[]; visibility: boolean; createdAt: string }

export default function MySoundboards() {
    const [boards,   setBoards]   = useState<Board[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [newName,  setNewName]  = useState("");
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetch("/api/soundboard")
            .then(r => r.json())
            .then(d => setBoards(d.boards ?? []))
            .catch(() => null)
            .finally(() => setLoading(false));
    }, []);

    async function create() {
        if (!newName.trim() || creating) return;
        setCreating(true);
        const res = await fetch("/api/soundboard", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newName.trim() }),
        }).catch(() => null);
        if (res?.ok) {
            const { board } = await res.json();
            setBoards(prev => [board, ...prev]);
            setNewName("");
        }
        setCreating(false);
    }

    async function togglePublic(sb_id: string, current: boolean) {
        const res = await fetch(`/api/soundboard/${sb_id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visibility: !current }),
        }).catch(() => null);
        if (res?.ok) {
            setBoards(prev => prev.map(b => b.sb_id === sb_id ? { ...b, visibility: !current } : b));
        }
    }

    async function remove(sb_id: string) {
        if (!confirm("Delete this soundboard?")) return;
        const res = await fetch(`/api/soundboard/${sb_id}`, { method: "DELETE" }).catch(() => null);
        if (res?.ok) setBoards(prev => prev.filter(b => b.sb_id !== sb_id));
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <LayoutGrid className="h-6 w-6 text-orange-400" />
                <h1 className="text-2xl font-bold">My Soundboards</h1>
            </div>

            {/* Create */}
            <div className="flex gap-2">
                <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && create()}
                    placeholder="New soundboard name…"
                    maxLength={60}
                    className="flex-1 rounded-full bg-white/6 border border-white/10 focus:border-orange-500/40 px-5 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors"
                />
                <button
                    onClick={create}
                    disabled={!newName.trim() || creating}
                    className="flex items-center gap-1.5 rounded-full bg-orange-500 hover:bg-orange-400 disabled:opacity-40 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
                >
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Create
                </button>
            </div>

            {/* List */}
            {loading && (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-white/30" />
                </div>
            )}

            {!loading && boards.length === 0 && (
                <div className="text-center py-16 space-y-2">
                    <LayoutGrid className="h-10 w-10 mx-auto text-white/20" />
                    <p className="text-white/40">No soundboards yet</p>
                    <p className="text-sm text-white/25">Create one above, or add sounds from any sound page</p>
                </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {boards.map(b => (
                    <div key={b.sb_id} className="rounded-2xl border border-white/8 bg-[#111113] p-4 space-y-3 hover:border-white/14 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="font-semibold truncate">{b.name}</p>
                                <p className="text-xs text-white/35 mt-0.5">{b.sounds.length} / 30 sounds</p>
                            </div>
                            <button
                                onClick={() => remove(b.sb_id)}
                                className="shrink-0 p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors"
                                aria-label="Delete"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => togglePublic(b.sb_id, b.visibility)}
                                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                    b.visibility
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        : "bg-white/6 text-white/40 border border-white/10"
                                }`}
                            >
                                {b.visibility ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                {b.visibility ? "Public" : "Private"}
                            </button>

                            <Link
                                href={`/soundboard/${b.sb_id}`}
                                className="flex items-center gap-1 text-xs text-white/40 hover:text-orange-400 transition-colors ml-auto"
                            >
                                Open <ExternalLink className="h-3 w-3" />
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
