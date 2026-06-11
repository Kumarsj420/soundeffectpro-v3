"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Music, Loader2, LayoutGrid } from "lucide-react";

interface BoardCard {
    sb_id:      string;
    name:       string;
    thumb:      string;
    soundCount: number;
    userName:   string;
}

interface Props {
    initial:        BoardCard[];
    initialHasMore: boolean;
}

export default function SoundboardGrid({ initial, initialHasMore }: Props) {
    const [boards,  setBoards]  = useState<BoardCard[]>(initial);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [page,    setPage]    = useState(2);
    const [loading, setLoading] = useState(false);

    async function loadMore() {
        if (loading || !hasMore) return;
        setLoading(true);
        try {
            const res  = await fetch(`/api/soundboard/browse?page=${page}`);
            const data = await res.json() as { boards: BoardCard[]; hasMore: boolean };
            setBoards(prev => [...prev, ...data.boards]);
            setHasMore(data.hasMore);
            setPage(p => p + 1);
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    }

    if (boards.length === 0) {
        return (
            <div className="text-center py-24 space-y-3">
                <LayoutGrid className="h-12 w-12 mx-auto text-white/10" />
                <p className="text-white/30">No public soundboards yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {boards.map(b => (
                    <Link
                        key={b.sb_id}
                        href={`/soundboard/${b.sb_id}`}
                        className="group rounded-2xl border border-white/8 bg-[#111113] overflow-hidden hover:border-white/16 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 transition-all duration-200"
                    >
                        {/* Thumbnail */}
                        <div className="relative aspect-video bg-white/4 overflow-hidden">
                            <Image
                                src={b.thumb}
                                alt={b.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            />
                            <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/70 backdrop-blur-sm px-2 py-0.5 text-xs text-white/80">
                                <Music className="h-3 w-3" />
                                {b.soundCount}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="p-3">
                            <p className="font-semibold text-sm text-white truncate group-hover:text-orange-400 transition-colors">
                                {b.name}
                            </p>
                            <div className="flex items-center justify-between mt-0.5">
                                <p className="text-xs text-white/35">
                                    {b.soundCount} sound{b.soundCount !== 1 ? "s" : ""}
                                </p>
                                {b.userName && (
                                    <p className="text-xs text-white/25 truncate max-w-[100px] text-right">
                                        {b.userName}
                                    </p>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Load More */}
            {hasMore && (
                <div className="flex justify-center">
                    <button
                        onClick={loadMore}
                        disabled={loading}
                        className="flex items-center gap-2 rounded-full border border-white/15 hover:border-orange-500/40 hover:text-orange-400 disabled:opacity-50 px-8 py-2.5 text-sm transition-colors"
                    >
                        {loading
                            ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading…</>
                            : "Load more"
                        }
                    </button>
                </div>
            )}
        </div>
    );
}
