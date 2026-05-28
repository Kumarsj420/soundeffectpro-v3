"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { LayoutGrid, Plus, Check, Loader2, ChevronDown, X } from "lucide-react";

interface Board { sbId: string; name: string; sounds: string[] }

export default function AddToSoundboard({ s_id }: { s_id: string }) {
    const { data: session } = useSession();
    const [open,     setOpen]     = useState(false);
    const [boards,   setBoards]   = useState<Board[]>([]);
    const [loading,  setLoading]  = useState(false);
    const [creating, setCreating] = useState(false);
    const [newName,  setNewName]  = useState("");
    const [busy,     setBusy]     = useState<string | null>(null); // sbId being acted on
    const [added,    setAdded]    = useState<Set<string>>(new Set());
    const panelRef = useRef<HTMLDivElement>(null);

    // Load boards when opening
    useEffect(() => {
        if (!open || !session) return;
        setLoading(true);
        fetch("/api/soundboard")
            .then(r => r.json())
            .then(d => {
                setBoards(d.boards ?? []);
                // Mark which boards already contain this sound
                const inBoards = new Set<string>(
                    (d.boards ?? [])
                        .filter((b: Board) => b.sounds.includes(s_id))
                        .map((b: Board) => b.sbId)
                );
                setAdded(inBoards);
            })
            .catch(() => null)
            .finally(() => setLoading(false));
    }, [open, session, s_id]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        function handler(e: MouseEvent) {
            if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    async function toggle(sbId: string, isAdded: boolean) {
        setBusy(sbId);
        const res = await fetch(`/api/soundboard/${sbId}`, {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ action: isAdded ? "remove" : "add", s_id }),
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
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ name: newName.trim(), s_id }),
        }).catch(() => null);

        if (res?.ok) {
            const { board } = await res.json();
            setBoards(prev => [board, ...prev]);
            setAdded(prev => new Set([...prev, board.sbId]));
            setNewName("");
        }
        setCreating(false);
    }

    if (!session) {
        return (
            <Link
                href="/login"
                className="flex items-center gap-2 rounded-full border border-white/15 hover:border-orange-500/50 hover:text-orange-400 px-4 py-2 text-sm transition-colors"
            >
                <LayoutGrid className="h-4 w-4" /> Soundboard
            </Link>
        );
    }

    const inAny = boards.some(b => added.has(b.sbId));

    return (
        <div ref={panelRef} className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
                    inAny
                        ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/8"
                        : "border-white/15 hover:border-orange-500/50 hover:text-orange-400"
                }`}
            >
                <LayoutGrid className="h-4 w-4" />
                {inAny ? "In Soundboard" : "Soundboard"}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute left-0 top-full mt-2 z-50 w-72 rounded-2xl border border-white/10 bg-[#111113] shadow-2xl shadow-black/40 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
                        <span className="text-sm font-semibold">Add to Soundboard</span>
                        <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Board list */}
                    <div className="max-h-52 overflow-y-auto">
                        {loading && (
                            <div className="flex justify-center py-6">
                                <Loader2 className="h-4 w-4 animate-spin text-white/30" />
                            </div>
                        )}
                        {!loading && boards.length === 0 && (
                            <p className="text-xs text-white/30 px-4 py-4 text-center">
                                No soundboards yet — create one below
                            </p>
                        )}
                        {boards.map(b => {
                            const isAdded  = added.has(b.sbId);
                            const isBusy   = busy === b.sbId;
                            return (
                                <button
                                    key={b.sbId}
                                    onClick={() => toggle(b.sbId, isAdded)}
                                    disabled={isBusy}
                                    className="flex w-full items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left disabled:opacity-50"
                                >
                                    <div className={`h-5 w-5 rounded flex items-center justify-center shrink-0 border transition-colors ${
                                        isAdded
                                            ? "border-emerald-500 bg-emerald-500"
                                            : "border-white/20 bg-transparent"
                                    }`}>
                                        {isAdded && <Check className="h-3 w-3 text-white" />}
                                        {isBusy && <Loader2 className="h-3 w-3 animate-spin text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white/80 truncate">{b.name}</p>
                                        <p className="text-xs text-white/30">{b.sounds.length} sounds</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Create new */}
                    <div className="border-t border-white/6 p-3 space-y-2">
                        <p className="text-xs text-white/30 font-medium">New soundboard</p>
                        <div className="flex gap-2">
                            <input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && createBoard()}
                                placeholder="My soundboard…"
                                maxLength={60}
                                className="flex-1 rounded-lg bg-white/6 border border-white/8 px-3 py-1.5 text-sm text-white placeholder-white/25 outline-none focus:border-orange-500/40 transition-colors"
                            />
                            <button
                                onClick={createBoard}
                                disabled={!newName.trim() || creating}
                                className="shrink-0 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 p-1.5 transition-colors"
                            >
                                {creating
                                    ? <Loader2 className="h-4 w-4 animate-spin text-white" />
                                    : <Plus className="h-4 w-4 text-white" />
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
