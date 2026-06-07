"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import SoundCard from "@/app/components/SoundCard";

interface Sound {
    s_id: string; slug: string; title: string; duration: string;
    tags: string[]; category: string; btnColor: string;
    stats: { views: number; downloads: number; likes: number };
}

interface Props {
    slug:     string;
    category: string;
    tags:     string[];
    initial:  Sound[];
    total:    number;
}

export default function RelatedSounds({ slug, category, tags, initial, total }: Props) {
    const [sounds,  setSounds]  = useState<Sound[]>(initial);
    const [page,    setPage]    = useState(1);
    const [loading, setLoading] = useState(false);

    const hasMore = sounds.length < total;

    async function loadMore() {
        if (loading) return;
        setLoading(true);
        const nextPage = page + 1;
        const params = new URLSearchParams({
            page:     String(nextPage),
            category,
            tags:     tags.slice(0, 3).join(","),
        });
        const res = await fetch(`/api/sound/${slug}/related?${params}`).catch(() => null);
        if (res?.ok) {
            const data = await res.json() as { sounds: Sound[] };
            setSounds(prev => [...prev, ...data.sounds]);
            setPage(nextPage);
        }
        setLoading(false);
    }

    if (sounds.length === 0) return null;

    return (
        <section className="space-y-4">
            <h2 className="font-semibold text-white/80 text-lg">Related Sounds</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sounds.map(s => <SoundCard key={s.s_id} {...s} />)}
            </div>
            {hasMore && (
                <button
                    onClick={loadMore}
                    disabled={loading}
                    className="w-full py-3 rounded-xl border border-white/8 text-sm text-white/40 hover:text-white hover:border-white/20 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                    {loading
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading…</>
                        : `Load more (${total - sounds.length} remaining)`
                    }
                </button>
            )}
        </section>
    );
}
