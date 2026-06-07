"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Trash2, Send, Loader2, ChevronDown } from "lucide-react";

interface Comment {
    id:        string;
    userId:    string;
    userName:  string;
    userImage: string | null;
    text:      string;
    createdAt: string;
}

interface CommentsData {
    comments: Comment[];
    total:    number;
    page:     number;
    pages:    number;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hrs   = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return "just now";
    if (mins < 60)  return `${mins}m ago`;
    if (hrs  < 24)  return `${hrs}h ago`;
    if (days < 30)  return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

function CommentAvatar({ image, name }: { image: string | null; name: string }) {
    if (image) {
        return (
            <Image
                src={image} alt={name} width={36} height={36}
                className="rounded-full object-cover shrink-0 w-9 h-9"
            />
        );
    }
    return (
        <div className="h-9 w-9 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-sm font-bold shrink-0 aspect-square">
            {name[0]?.toUpperCase() ?? "?"}
        </div>
    );
}

export default function Comments({ s_id }: { s_id: string }) {
    const { data: session } = useSession();

    const [data,    setData]    = useState<CommentsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [text,    setText]    = useState("");
    const [error,   setError]   = useState("");
    const [page,    setPage]    = useState(1);
    const MAX = 500;

    const load = useCallback(async (p = 1) => {
        setLoading(true);
        const res = await fetch(`/api/comments/${s_id}?page=${p}`).catch(() => null);
        if (res?.ok) {
            const json = await res.json();
            setData(prev =>
                p === 1
                    ? json
                    : { ...json, comments: [...(prev?.comments ?? []), ...json.comments] }
            );
            setPage(p);
        }
        setLoading(false);
    }, [s_id]);

    useEffect(() => { load(1); }, [load]);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!text.trim() || posting) return;
        setPosting(true);
        setError("");

        const res = await fetch(`/api/comments/${s_id}`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ text: text.trim() }),
        }).catch(() => null);

        if (res?.ok) {
            const { comment } = await res.json();
            setText("");
            setData(prev => prev
                ? {
                    ...prev,
                    total:    prev.total + 1,
                    comments: [comment, ...prev.comments],
                  }
                : null
            );
        } else {
            const body = await res?.json().catch(() => null);
            setError(body?.error ?? "Failed to post comment");
        }
        setPosting(false);
    }

    async function deleteComment(id: string) {
        const res = await fetch(`/api/comments/${s_id}/${id}`, { method: "DELETE" }).catch(() => null);
        if (res?.ok) {
            setData(prev => prev
                ? { ...prev, total: prev.total - 1, comments: prev.comments.filter(c => c.id !== id) }
                : null
            );
        }
    }

    const [open, setOpen] = useState(true);
    const isAdmin = session?.user.role === "admin" || session?.user.role === "moderator";

    return (
        <section className="space-y-4">
            {/* Header — accordion toggle */}
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center justify-between w-full group"
            >
                <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-white/50" />
                    <h2 className="font-semibold text-white/80">
                        Comments {data ? <span className="text-white/40 font-normal text-sm">({data.total})</span> : null}
                    </h2>
                </div>
                <ChevronDown className={`h-4 w-4 text-white/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (<>
            {/* Post form */}
            {session ? (
                <form onSubmit={submit} className="space-y-2">
                    <div className="flex gap-3">
                        <CommentAvatar image={session.user.image ?? null} name={session.user.name ?? "You"} />
                        <div className="flex-1 space-y-2">
                            <textarea
                                value={text}
                                onChange={e => { setText(e.target.value); setError(""); }}
                                placeholder="Add a comment…"
                                maxLength={MAX}
                                rows={2}
                                className="w-full rounded-xl bg-white/6 border border-white/10 focus:border-orange-500/40 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none resize-none transition-colors"
                            />
                            <div className="flex items-center justify-between gap-2">
                                <span className={`text-xs ${text.length > MAX * 0.9 ? "text-orange-400" : "text-white/25"}`}>
                                    {text.length}/{MAX}
                                </span>
                                <button
                                    type="submit"
                                    disabled={!text.trim() || posting}
                                    className="flex items-center gap-1.5 rounded-full bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 text-sm font-semibold text-white transition-all"
                                >
                                    {posting
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <Send className="h-3.5 w-3.5" />
                                    }
                                    Post
                                </button>
                            </div>
                        </div>
                    </div>
                    {error && <p className="text-xs text-red-400 pl-12">{error}</p>}
                </form>
            ) : (
                <div className="rounded-xl border border-white/8 bg-white/3 px-5 py-4 text-sm text-white/40 text-center">
                    <Link href="/login" className="text-orange-400 hover:text-orange-300 transition-colors font-medium">Sign in</Link>
                    {" "}to leave a comment
                </div>
            )}

            {/* Comment list */}
            {loading && !data && (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-white/30" />
                </div>
            )}

            {data?.comments.length === 0 && !loading && (
                <p className="text-sm text-white/30 text-center py-6">
                    No comments yet. Be the first!
                </p>
            )}

            {data && data.comments.length > 0 && (
                <ul className="space-y-4">
                    {data.comments.map(c => (
                        <li key={c.id} className="flex gap-3 group">
                            <CommentAvatar image={c.userImage} name={c.userName} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-white/80">{c.userName}</span>
                                    <span className="text-xs text-white/30">{timeAgo(c.createdAt)}</span>
                                </div>
                                <p className="text-sm text-white/60 mt-1 wrap-break-word leading-relaxed">{c.text}</p>
                            </div>
                            {/* Delete — own comment or mod */}
                            {(session?.user.uid === c.userId || isAdmin) && (
                                <button
                                    onClick={() => deleteComment(c.id)}
                                    aria-label="Delete comment"
                                    className="opacity-0 group-hover:opacity-100 shrink-0 p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all self-start mt-0.5"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {/* Load more */}
            {data && page < data.pages && (
                <button
                    onClick={() => load(page + 1)}
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl border border-white/8 text-sm text-white/40 hover:text-white hover:border-white/20 transition-colors disabled:opacity-40"
                >
                    {loading ? "Loading…" : `Load more (${data.total - data.comments.length} remaining)`}
                </button>
            )}
            </>)}
        </section>
    );
}
