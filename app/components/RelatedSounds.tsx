"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import SoundCard from "@/app/components/SoundCard";
import AdBanner from "@/app/components/AdBanner";

interface Sound {
    s_id: string; slug: string; title: string; duration: string;
    tags: string[]; category: string; btnColor: string;
    stats: { views: number; downloads: number; likes: number };
}

interface Props {
    slug:     string;
    category: string;
    tags:     string[];
}

async function fetchRelated(slug: string, category: string, tags: string, page: number) {
    const params = new URLSearchParams({ page: String(page), category, tags });
    const res = await fetch(`/api/sound/${slug}/related?${params}`).catch(() => null);
    if (!res?.ok) return null;
    return await res.json() as { sounds: Sound[]; total: number };
}

// Loaded after hydration instead of rendered into the sound page: the 12 cards
// and their serialized props were ~40% of every cached page, and their live
// stats changed the page bytes on nearly every ISR revalidation.
export default function RelatedSounds({ slug, category, tags }: Props) {
    const [sounds,  setSounds]  = useState<Sound[]>([]);
    const [total,   setTotal]   = useState(0);
    const [page,    setPage]    = useState(0);
    const [loading, setLoading] = useState(false);

    const tagKey = tags.slice(0, 3).join(",");

    useEffect(() => {
        let cancelled = false;
        fetchRelated(slug, category, tagKey, 1).then(data => {
            if (cancelled || !data) return;
            setSounds(data.sounds);
            setTotal(data.total);
            setPage(1);
        });
        return () => { cancelled = true; };
    }, [slug, category, tagKey]);

    const hasMore = sounds.length < total;

    async function loadMore() {
        if (loading) return;
        setLoading(true);
        const nextPage = page + 1;
        const data = await fetchRelated(slug, category, tagKey, nextPage);
        if (data) {
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
                    className="mx-auto max-w-xs w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
                >
                    {loading
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading…</>
                        : "Load more"
                    }
                </button>
            )}
            <AdBanner type="display" format="horizontal" slot={process.env.NEXT_PUBLIC_BELOW_LOAD_MORE ?? ""} />
        </section>
    );
}
