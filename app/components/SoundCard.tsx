"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { Flame, Download } from "lucide-react";
import { getR2Url } from "@/app/lib/r2/r2Url";
import { Badge, getCategoryVariant } from "@/app/components/ui/badge";
import { cn } from "@/app/lib/utils";

interface SoundCardProps {
    s_id: string;
    slug: string;
    title: string;
    duration: string;
    tags: string[];
    category: string;
    btnColor: string;
    stats: { views: number; downloads: number; likes: number };
}

const HUE_MAP: Record<string, string> = {
    '0': 'hue-rotate-0', '20': 'hue-rotate-[20deg]', '125': 'hue-rotate-[125deg]',
    '145': 'hue-rotate-[145deg]', '195': 'hue-rotate-[195deg]', '225': 'hue-rotate-[225deg]',
    '255': 'hue-rotate-[255deg]', '280': 'hue-rotate-[280deg]', '305': 'hue-rotate-[305deg]',
    '335': 'hue-rotate-[335deg]',
};

function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

export default function SoundCard({ s_id, slug, title, duration, tags, category, btnColor, stats }: SoundCardProps) {
    const [playing, setPlaying]   = useState(false);
    const [loading, setLoading]   = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const hue      = HUE_MAP[btnColor] ?? 'hue-rotate-0';

    async function togglePlay() {
        if (loading) return;
        const url = getR2Url(`store/${s_id}.mp3`) ?? '';

        if (!audioRef.current) {
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => setPlaying(false);
            audio.onerror = () => { setPlaying(false); setLoading(false); };
        }

        if (playing) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setPlaying(false);
            return;
        }

        setLoading(true);
        audioRef.current.src = url;
        try {
            await audioRef.current.play();
            setPlaying(true);
            // API param is slug-s_id so the route can look up by unique s_id
            fetch(`/api/sound/${slug}-${s_id}/play`, { method: "POST" }).catch(() => null);
        } catch {
            // autoplay blocked or network error
        } finally {
            setLoading(false);
        }
    }

    return (
        <article className={cn(
            "group relative flex flex-col gap-3 rounded-2xl border bg-[#111113] p-4 transition-all duration-200",
            "hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30",
            playing
                ? "border-orange-500/40 shadow-lg shadow-orange-500/10"
                : "border-white/7 hover:border-white/14"
        )}>
            {/* Top row: sprite btn + title */}
            <div className="flex items-center gap-3 mini-btn">
                <button
                    onClick={togglePlay}
                    aria-label={playing ? `Stop ${title}` : `Play ${title}`}
                    aria-pressed={playing}
                    className={cn(
                        "sound-btn shrink-0 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-lg",
                        hue,
                        playing && "btn-animation",
                        loading && "opacity-50 cursor-wait"
                    )}
                />

                <div className="flex-1 min-w-0 space-y-1">
                    <Link
                        href={`/sound/${slug}-${s_id}`}
                        className="block font-semibold text-sm text-white hover:text-orange-400 transition-colors line-clamp-2 leading-snug"
                    >
                        {title}
                    </Link>
                    <div className="flex items-center gap-2">
                        <Badge variant={getCategoryVariant(category)}>{category}</Badge>
                        <span className="text-xs text-[#a1a1aa]">{duration}</span>
                    </div>
                </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {tags.slice(0, 4).map(tag => (
                        <Link
                            key={tag}
                            href={`/search?q=${encodeURIComponent(tag)}`}
                            className="text-xs text-[#a1a1aa] bg-white/4 hover:bg-orange-500/15 hover:text-orange-400 rounded-full px-2 py-0.5 transition-colors"
                        >
                            #{tag}
                        </Link>
                    ))}
                </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-[#a1a1aa] mt-auto pt-1 border-t border-white/5">
                <span className="flex items-center gap-1">
                    <Flame className="h-3 w-3 text-orange-500/70" />
                    {fmt(stats.views)}
                </span>
                <span className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {fmt(stats.downloads)}
                </span>
                <Link
                    href={`/sound/${slug}-${s_id}`}
                    className="ml-auto text-[#71717a] hover:text-orange-400 transition-colors font-medium"
                    aria-label={`Open ${title} sound page`}
                >
                    Details →
                </Link>
            </div>
        </article>
    );
}
