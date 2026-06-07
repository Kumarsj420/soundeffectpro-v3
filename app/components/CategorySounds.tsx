"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import SoundCard from "@/app/components/SoundCard";
import AdBanner from "@/app/components/AdBanner";

interface Sound {
    s_id: string; slug: string; title: string; duration: string;
    tags: string[]; category: string; btnColor: string;
    stats: { views: number; downloads: number; likes: number };
}

interface Props {
    initial:  Sound[];
    total:    number;
    category: string;
    sort:     string;
}

export default function CategorySounds({ initial, total, category, sort }: Props) {
    const [sounds,  setSounds]  = useState<Sound[]>(initial);
    const [page,    setPage]    = useState(1);
    const [loading, setLoading] = useState(false);
    const hasMore = sounds.length < total;

    async function loadMore() {
        if (loading) return;
        setLoading(true);
        const next = page + 1;
        const params = new URLSearchParams({ sort, category, page: String(next), limit: "24" });
        const res = await fetch(`/api/sounds?${params}`).catch(() => null);
        if (res?.ok) {
            const data = await res.json() as { sounds: Sound[] };
            setSounds(prev => [...prev, ...data.sounds]);
            setPage(next);
        }
        setLoading(false);
    }

    if (!sounds.length) return null;

    const first8  = sounds.slice(0, 8);
    const rest    = sounds.slice(8);

    return (
        <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {first8.map(s => <SoundCard key={s.s_id} {...s} />)}
                {rest.length > 0 && (
                    <div className="sm:col-span-2 lg:col-span-3">
                        <AdBanner type="in-feed" slot={process.env.NEXT_PUBLIC_IN_FEED_SOUND_CARD_GRID ?? ""} />
                    </div>
                )}
                {rest.map(s => <SoundCard key={s.s_id} {...s} />)}
            </div>
            {hasMore && (
                <div className="flex justify-center">
                    <button
                        onClick={loadMore}
                        disabled={loading}
                        className="max-w-xs w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading…</> : "Load more"}
                    </button>
                </div>
            )}
            <AdBanner type="display" format="horizontal" slot={process.env.NEXT_PUBLIC_BELOW_LOAD_MORE ?? ""} />
        </div>
    );
}
