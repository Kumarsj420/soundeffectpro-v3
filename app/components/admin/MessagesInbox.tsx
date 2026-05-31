"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2, Mail, MailOpen, Trash2, ChevronLeft, ChevronRight, Reply } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/app/lib/utils";

interface Message {
    _id: string; name: string; senderEmail: string;
    type: string; content: string; read: boolean; createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
    contact:        "bg-blue-500/15 text-blue-400",
    feedback:       "bg-green-500/15 text-green-400",
    inquiry:        "bg-yellow-500/15 text-yellow-400",
    support:        "bg-orange-500/15 text-orange-400",
    "technical issue": "bg-red-500/15 text-red-400",
    other:          "bg-white/8 text-white/50",
};

export default function MessagesInbox() {
    const [messages,  setMessages]  = useState<Message[]>([]);
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
            const res  = await fetch(`/api/admin/messages?${sp}`);
            const data = await res.json() as { messages: Message[]; total: number; pages: number };
            setMessages(data.messages); setTotal(data.total); setPages(data.pages);
        } finally { setLoading(false); }
    }, [page, readFilter, typeFilter]);

    useEffect(() => { fetch_(); }, [fetch_]);
    useEffect(() => { setPage(1); }, [readFilter, typeFilter]);

    async function markRead(id: string, read: boolean) {
        setActing(id);
        try {
            const res = await fetch(`/api/admin/messages/${id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ read }),
            });
            if (!res.ok) throw new Error("Failed");
            setMessages(prev => prev.map(m => m._id === id ? { ...m, read } : m));
        } catch { toast.error("Action failed"); }
        finally { setActing(null); }
    }

    async function deleteMsg(id: string) {
        if (!confirm("Delete this message permanently?")) return;
        setActing(id);
        try {
            const res = await fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed");
            setMessages(prev => prev.filter(m => m._id !== id));
            setTotal(prev => prev - 1);
            toast.success("Message deleted");
        } catch { toast.error("Delete failed"); }
        finally { setActing(null); }
    }

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold">Messages</h1>
                <p className="text-white/40 text-sm mt-0.5">{total.toLocaleString()} total</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <select value={readFilter} onChange={e => setReadFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500/50 transition-colors">
                    <option value="">All messages</option>
                    <option value="false">Unread only</option>
                    <option value="true">Read only</option>
                </select>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500/50 transition-colors">
                    <option value="">All types</option>
                    {["contact","feedback","inquiry","support","technical issue","other"].map(t => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>
                <button onClick={fetch_} className="ml-auto text-xs text-white/40 hover:text-white transition-colors">↻ Refresh</button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-white/30" /></div>
            ) : messages.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-[#111113] py-16 text-center text-white/30 text-sm">
                    No messages found
                </div>
            ) : (
                <div className="space-y-2">
                    {messages.map(m => (
                        <div key={m._id}
                            className={cn("rounded-2xl border transition-colors", m.read ? "border-white/6 bg-[#0e0e10]" : "border-white/12 bg-[#111113]")}>
                            {/* Header row */}
                            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                                onClick={() => { setExpanded(expanded === m._id ? null : m._id); if (!m.read) markRead(m._id, true); }}>
                                <div className={cn("h-2 w-2 rounded-full shrink-0", m.read ? "bg-transparent" : "bg-orange-400")} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={cn("text-sm font-semibold", m.read ? "text-white/60" : "text-white")}>{m.name}</span>
                                        <a href={`mailto:${m.senderEmail}`} onClick={e => e.stopPropagation()}
                                            className="text-xs text-orange-400/70 hover:text-orange-400 transition-colors">{m.senderEmail}</a>
                                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize shrink-0", TYPE_COLORS[m.type] ?? TYPE_COLORS.other)}>{m.type}</span>
                                    </div>
                                    <p className={cn("text-xs mt-0.5 line-clamp-1", m.read ? "text-white/30" : "text-white/50")}>{m.content}</p>
                                </div>
                                <span className="text-xs text-white/20 shrink-0">{new Date(m.createdAt).toLocaleDateString()}</span>
                            </div>

                            {/* Expanded content */}
                            {expanded === m._id && (
                                <div className="border-t border-white/6 px-4 py-4">
                                    <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap mb-4">{m.content}</p>
                                    <div className="flex items-center gap-2">
                                        <a href={`mailto:${m.senderEmail}?subject=Re: Your message&body=Hi ${m.name},%0A%0A`}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-xs font-medium transition-colors">
                                            <Reply className="h-3.5 w-3.5" /> Reply via Email
                                        </a>
                                        <button onClick={() => markRead(m._id, !m.read)} disabled={acting === m._id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white/50 hover:text-white text-xs font-medium transition-colors disabled:opacity-40">
                                            {acting === m._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : m.read ? <Mail className="h-3.5 w-3.5" /> : <MailOpen className="h-3.5 w-3.5" />}
                                            Mark as {m.read ? "unread" : "read"}
                                        </button>
                                        <button onClick={() => deleteMsg(m._id)} disabled={acting === m._id}
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
