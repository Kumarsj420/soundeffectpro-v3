"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/app/lib/utils";

const R2 = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/$/, "");

const HUE_MAP: Record<string, string> = {
    "0":   "hue-rotate-0",
    "20":  "hue-rotate-[20deg]",
    "125": "hue-rotate-[125deg]",
    "145": "hue-rotate-[145deg]",
    "195": "hue-rotate-[195deg]",
    "225": "hue-rotate-[225deg]",
    "255": "hue-rotate-[255deg]",
    "280": "hue-rotate-[280deg]",
    "305": "hue-rotate-[305deg]",
    "335": "hue-rotate-[335deg]",
};

interface Props {
    s_id:        string;
    slug:        string;
    title:       string;
    duration:    string;
    btnColor:    string;
    category:    string;
    canonicalUrl: string;
}

export default function EmbedPlayer({ s_id, slug, title, duration, btnColor, category, canonicalUrl }: Props) {
    const [playing, setPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const hue = HUE_MAP[btnColor] ?? "hue-rotate-0";

    useEffect(() => {
        const audio = new Audio();
        audioRef.current = audio;
        audio.onended  = () => setPlaying(false);
        audio.onerror  = () => { setLoading(false); setPlaying(false); };
        audio.onwaiting = () => setLoading(true);
        audio.onplaying = () => setLoading(false);
        return () => { audio.pause(); audio.src = ""; };
    }, []);

    function toggle() {
        const audio = audioRef.current;
        if (!audio) return;

        if (playing) {
            audio.pause();
            audio.currentTime = 0;
            setPlaying(false);
            return;
        }

        if (!audio.src) {
            audio.src = `${R2}/store/${s_id}.mp3`;
            // fire-and-forget play count
            fetch(`/api/sound/${slug}/play`, { method: "POST" }).catch(() => null);
        }

        setLoading(true);
        audio.play().then(() => setPlaying(true)).catch(() => { setLoading(false); });
    }

    return (
        <div
            style={{
                fontFamily: "system-ui, sans-serif",
                background: "#0d0d0f",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 14px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.08)",
                minHeight: "60px",
                boxSizing: "border-box",
                width: "100%",
            }}
        >
            {/* Play button — sprite */}
            <div className="mini-btn" style={{ flexShrink: 0 }}>
                <button
                    onClick={toggle}
                    aria-label={playing ? "Pause" : "Play"}
                    className={cn(
                        "sound-btn shrink-0 transition-all duration-150 focus-visible:outline-none",
                        hue,
                        playing && "btn-animation",
                        loading && "opacity-50 cursor-wait"
                    )}
                />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                    fontSize: "13px", fontWeight: 600,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    marginBottom: "2px",
                }}>
                    {title}
                </p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                    {category} · {duration}
                </p>
            </div>

            {/* Branding link */}
            <Link
                href={canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open on SoundEffectPro"
                style={{
                    fontSize: "10px", color: "rgba(255,165,0,0.7)",
                    textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "1px",
                }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
                SEP
            </Link>
        </div>
    );
}
