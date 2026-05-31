"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { getR2Url } from "@/app/lib/r2/r2Url";
import { cn } from "@/app/lib/utils";

const HUE_MAP: Record<string, string> = {
    '0': 'hue-rotate-0', '20': 'hue-rotate-[20deg]', '125': 'hue-rotate-[125deg]',
    '145': 'hue-rotate-[145deg]', '195': 'hue-rotate-[195deg]', '225': 'hue-rotate-[225deg]',
    '255': 'hue-rotate-[255deg]', '280': 'hue-rotate-[280deg]', '305': 'hue-rotate-[305deg]',
    '335': 'hue-rotate-[335deg]',
};

interface AudioPlayerProps {
    s_id: string;
    slug: string;
    title: string;
    duration: string;
    btnColor?: string;
    license?: string;
}

function pad(n: number) {
    return String(Math.floor(n)).padStart(2, "0");
}

function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${pad(m)}:${pad(s)}`;
}

function parseDuration(d: string): number {
    const [m, s] = d.split(':').map(Number);
    return (m || 0) * 60 + (s || 0);
}

export default function AudioPlayer({ s_id, slug, title, duration, btnColor = '0' }: AudioPlayerProps) {
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [loading, setLoading] = useState(false);
    const [downloaded, setDownloaded] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const didTrackPlay = useRef(false);
    const audioUrl = getR2Url(`store/${s_id}.mp3`) ?? '';
    const totalTime = parseDuration(duration);
    const hue = HUE_MAP[btnColor] ?? 'hue-rotate-0';


    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
                audioRef.current = null;
            }
        };
    }, []);

    function getOrCreateAudio(): HTMLAudioElement {
        if (!audioRef.current) {
            const audio = new Audio();
            audio.preload = 'none';
            audio.ontimeupdate = () => setCurrentTime(Math.round(audio.currentTime));
            audio.onended = () => { setPlaying(false); setCurrentTime(0); };
            audio.onplay = () => {
                if (!didTrackPlay.current) {
                    didTrackPlay.current = true;
                    fetch(`/api/sound/${slug}/play`, { method: "POST" }).catch(() => null);
                }
            };
            audioRef.current = audio;
        }
        return audioRef.current;
    }

    const togglePlay = useCallback(async () => {
        const audio = getOrCreateAudio();

        if (playing) {
            audio.pause();
            setPlaying(false);
        } else {
            setLoading(true);
            if (!audio.src) audio.src = audioUrl;
            try {
                await audio.play();
                setPlaying(true);
            } catch {
                // User gesture required on some browsers — silently fail
            } finally {
                setLoading(false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playing, audioUrl, slug]);

    function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
        const audio = audioRef.current;
        if (!audio) return;
        const t = Number(e.target.value);
        audio.currentTime = t;
        setCurrentTime(t);
    }

    async function handleDownload() {
        const a = document.createElement("a");
        a.href = `${audioUrl}?dl=1`;
        a.download = `${slug}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (!downloaded) {
            setDownloaded(true);
            fetch(`/api/sound/${slug}/download`, { method: "POST" }).catch(() => null);
        }
    }

    const progress = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;

    return (
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-5 space-y-4">
            {/* Play / Pause */}
            <div className="flex items-center gap-4">
                <div className="mini-btn">
                    <button
                        onClick={togglePlay}
                        aria-label={playing ? "Pause" : "Play"}
                        className={cn(
                            "sound-btn shrink-0 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-lg",
                            hue,
                            playing && "btn-animation",
                            loading && "opacity-50 cursor-wait"
                        )}
                    />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-sm font-semibold truncate">{title}</p>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40 tabular-nums w-10 shrink-0">{formatTime(currentTime)}</span>
                        {/* Wrapper div is the flex item — input fills it with w-full.
                            input[type=range] ignores min-w-0 when it's a direct flex
                            child; a block wrapper bypasses the browser minimum. */}
                        <div className="flex-1 min-w-0">
                            <input
                                type="range"
                                min={0}
                                max={totalTime || 100}
                                value={currentTime}
                                onChange={handleSeek}
                                aria-label="Seek"
                                className="w-full h-1 rounded-full accent-orange-500 cursor-pointer block"
                                style={{
                                    background: `linear-gradient(to right, #f97316 ${progress}%, rgba(255,255,255,0.15) ${progress}%)`,
                                }}
                            />
                        </div>
                        <span className="text-xs text-white/40 tabular-nums w-10 shrink-0 text-right">{duration}</span>
                    </div>
                </div>

                {/* Download */}
                <button
                    onClick={handleDownload}
                    aria-label="Download sound"
                    className="shrink-0 w-10 h-10 rounded-full border border-white/15 hover:border-orange-500/50 hover:text-orange-400 flex items-center justify-center transition-colors"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 8l-3-3m3 3l3-3" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
