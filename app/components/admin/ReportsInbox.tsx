"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Loader2, Flag, CheckCheck, Trash2, EyeOff, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/app/lib/utils";
import { REPORT_TYPES } from "@/app/lib/constants";

interface Report {
    _id: string; senderEmail: string; type: string;
    target: { from: string; id: string };
    content: string; read: boolean; createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
    "hate speech":          "bg-red-500/20 text-red-400",
    "sexual content":       "bg-pink-500/20 text-pink-400",
    "copyright violation":  "bg-yellow-500/20 text-yellow-400",
    "spam and scams":       "bg-orange-500/20 text-orange-400",
    "harassment and bullying": "bg-purple-500/20 text-purple-400",
    "inappropriate content":"bg-orange-500/15 text-orange-300",
    "misinformation":       "bg-blue-500/15 text-blue-400",
    other:                  "bg-white/8 text-white/50",
};

export default function ReportsInbox() {
    const [reports,   setReports]   = useState<Report[]>([]);
    const [total,     setTotal]     = useState(0);
    const [pages,     setPages]     = useState(1);
    const [page,      setPage]      = useState(1);
    const [loading,   setLoading]   = useState(false);
    const [readFilter,setReadFilter]= useState("");
    const [typeFilter,setTypeFilter]= useState("");
    const [expanded,  setExpanded]  = useState<string | null>(null);
    const [acting,    setActing]    = useState<string | null>(null);

    const fetch_ = useCallback(async () => {
        setLoading(true);
        const sp = new URLSearchParams({ page: String(page), ...(readFilter && { read: readFilter }), ...(typeFilter && { type: typeFilter }) });
        try {
            const res  = await fetch(`/api/admin/reports?${sp}`);
            const data = await res.json() as { reports: Report[]; total: number; pages: number };
            setReports(data.reports); setTotal(data.total); setPages(data.pages);
        } finally { setLoading(false); }
    }, [page, readFilter, typeFilter]);

    useEffect(() => { fetch_(); }, [fetch_]);
    useEffect(() => { setPage(1); }, [readFilter, typeFilter]);

    async function act(id: string, action: "dismiss" | "hide_sound", read = true) {
        setActing(id);
        try {
            const res = await fetch(`/api/admin/reports/${id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ read, action }),
            });
            if (!res.ok) throw new Error("Failed");
            if (action === "hide_sound") toast.success("Sound hidden");
            setReports(prev => prev.map(r => r._id === id ? { ...r, read: true } : r));
        } catch { toast.error("Action failed"); }
        finally { setActing(null); }
    }

    async function markRead(id: string, read: boolean) {
        setActing(id);
        try {
            const res = await fetch(`/api/admin/reports/${id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ read }),
            });
            if (!res.ok) throw new Error("Failed");
            setReports(prev => prev.map(r => r._id === id ? { ...r, read } : r));
        } catch { toast.error("Action failed"); }
        finally { setActing(null); }
    }

    async function deleteReport(id: string) {
        if (!confirm("Delete this report permanently?")) return;
        setActing(id);
        try {
            const res = await fetch(`/api/admin/reports/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed");
            setReports(prev => prev.filter(r => r._id !== id));
            setTotal(prev => prev - 1);
            toast.success("Report deleted");
        } catch { toast.error("Delete failed"); }
        finally { setActing(null); }
    }

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold">Reports</h1>
                <p className="text-white/40 text-sm mt-0.5">{total.toLocaleString()} total</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <select value={readFilter} onChange={e => setReadFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500/50 transition-colors">
                    <option value="">All reports</option>
                    <option value="false">Unread only</option>
                    <option value="true">Resolved only</option>
                </select>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500/50 transition-colors">
                    <option value="">All types</option>
                    {REPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button onClick={fetch_} className="ml-auto text-xs text-white/40 hover:text-white transition-colors">↻ Refresh</button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-white/30" /></div>
            ) : reports.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-[#111113] py-16 text-center">
                    <CheckCheck className="h-8 w-8 text-green-400/40 mx-auto mb-2" />
                    <p className="text-white/30 text-sm">No reports found</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {reports.map(r => (
                        <div key={r._id}
                            className={cn("rounded-2xl border transition-colors", r.read ? "border-white/6 bg-[#0e0e10]" : "border-red-500/20 bg-[#111113]")}>
                            {/* Header */}
                            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                                onClick={() => { setExpanded(expanded === r._id ? null : r._id); if (!r.read) markRead(r._id, true); }}>
                                <div className={cn("h-2 w-2 rounded-full shrink-0", r.read ? "bg-transparent" : "bg-red-400")} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Flag className={cn("h-3.5 w-3.5 shrink-0", r.read ? "text-white/20" : "text-red-400")} />
                                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", TYPE_COLORS[r.type] ?? TYPE_COLORS.other)}>{r.type}</span>
                                        <span className="text-xs text-white/30">{r.target.from}</span>
                                        {r.target.from === "sound" && (
                                            <Link href={`/sound/${r.target.id}`} target="_blank" onClick={e => e.stopPropagation()}
                                                className="flex items-center gap-0.5 text-xs text-orange-400/70 hover:text-orange-400 transition-colors">
                                                <ExternalLink className="h-3 w-3" /> view
                                            </Link>
                                        )}
                                    </div>
                                    <p className={cn("text-xs mt-0.5 line-clamp-1", r.read ? "text-white/30" : "text-white/50")}>{r.content}</p>
                                </div>
                                <span className="text-xs text-white/20 shrink-0">{new Date(r.createdAt).toLocaleDateString()}</span>
                            </div>

                            {/* Expanded */}
                            {expanded === r._id && (
                                <div className="border-t border-white/6 px-4 py-4">
                                    <div className="mb-3 text-xs text-white/30 flex gap-3">
                                        <span>From: <span className="text-white/50">{r.senderEmail}</span></span>
                                        <span>·</span>
                                        <span>Target ID: <code className="text-white/50">{r.target.id}</code></span>
                                    </div>
                                    <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap mb-4">{r.content}</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {r.target.from === "sound" && (
                                            <button
                                                onClick={() => act(r._id, "hide_sound")}
                                                disabled={acting === r._id}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-medium transition-colors disabled:opacity-40">
                                                {acting === r._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
                                                Hide Sound
                                            </button>
                                        )}
                                        <button
                                            onClick={() => act(r._id, "dismiss")}
                                            disabled={acting === r._id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-medium transition-colors disabled:opacity-40">
                                            <CheckCheck className="h-3.5 w-3.5" /> Dismiss
                                        </button>
                                        <button
                                            onClick={() => markRead(r._id, !r.read)}
                                            disabled={acting === r._id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white/50 hover:text-white text-xs font-medium transition-colors disabled:opacity-40">
                                            Mark as {r.read ? "unread" : "read"}
                                        </button>
                                        <button
                                            onClick={() => deleteReport(r._id)}
                                            disabled={acting === r._id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors disabled:opacity-40 ml-auto">
                                            <Trash2 className="h-3.5 w-3.5" /> Delete
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pages > 1 && (
                <div className="flex items-center justify-between text-sm text-white/40">
                    <span>Page {page} of {pages} · {total} total</span>
                    <div className="flex gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 hover:border-orange-500/40 hover:text-orange-400 disabled:opacity-30 transition-colors">
                            <ChevronLeft className="h-4 w-4" /> Prev
                        </button>
                        <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                            className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 hover:border-orange-500/40 hover:text-orange-400 disabled:opacity-30 transition-colors">
                            Next <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
