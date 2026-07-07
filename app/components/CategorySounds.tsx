"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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
}

const SORT_OPTIONS = [
    { label: "Most Popular",    value: "popular" },
    { label: "Newest",          value: "newest" },
    { label: "Most Downloaded", value: "downloads" },
];

export default function CategorySounds({ initial, total, category }: Props) {
    const searchParams = useSearchParams();
    const router        = useRouter();
    const pathname       = usePathname();

    const [sort,    setSort]    = useState("popular");
    const [sounds,  setSounds]  = useState<Sound[]>(initial);
    const [count,   setCount]   = useState(total);
    const [page,    setPage]    = useState(1);
    const [loading, setLoading] = useState(false);
    const hasMore = sounds.length < count;

    // Progressive enhancement: server always renders the "popular" sort so the
    // page stays static/ISR-cacheable. If a shared/bookmarked URL requests a
    // different sort, swap the list client-side after mount.
    useEffect(() => {
        const urlSort = searchParams.get("sort");
        if (urlSort && urlSort !== "popular") {
            switchSort(urlSort, true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function switchSort(newSort: string, skipUrlUpdate = false) {
        if (loading || newSort === sort) return;
        setLoading(true);
        const params = new URLSearchParams({ sort: newSort, category, page: "1", limit: "24" });
        const res = await fetch(`/api/sounds?${params}`).catch(() => null);
        if (res?.ok) {
            const data = await res.json() as { sounds: Sound[]; total: number };
            setSounds(data.sounds);
            setCount(data.total);
            setPage(1);
            setSort(newSort);
        }
        setLoading(false);
        if (!skipUrlUpdate) {
            router.replace(newSort === "popular" ? pathname : `${pathname}?sort=${newSort}`, { scroll: false });
        }
    }

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

    const first8 = sounds.slice(0, 8);
    const rest   = sounds.slice(8);

    return (
        <div className="space-y-6">
            {/* Sort tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-4">
                {SORT_OPTIONS.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => switchSort(opt.value)}
                        disabled={loading}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors disabled:opacity-50 ${
                            sort === opt.value
                                ? "bg-orange-500 text-white"
                                : "text-white/50 hover:text-white"
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {!sounds.length ? (
                <div className="text-center py-20 text-white/30">
                    <p className="text-xl mb-2">No {category} sounds yet</p>
                </div>
            ) : (
                <>
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
                </>
            )}
        </div>
    );
}
