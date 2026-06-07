"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import AdBanner from "@/app/components/AdBanner";

interface Props {
    slug:  string;
    title: string;
}

export default function DownloadCountdown({ slug, title }: Props) {
    const [count, setCount] = useState(5);
    const [started, setStarted] = useState(false);

    function triggerDownload() {
        if (started) return;
        setStarted(true);
        // Server route fetches from R2, sets Content-Disposition: attachment,
        // and increments the download counter — no client-side tracking needed.
        const a = document.createElement("a");
        a.href = `/api/sound/${slug}/file`;
        a.download = `${title}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    useEffect(() => {
        if (count <= 0) { triggerDownload(); return; }
        const t = setTimeout(() => setCount(c => c - 1), 1000);
        return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [count]);

    return (
        <div className="flex flex-col items-center gap-8 w-full max-w-xl mx-auto">
            {/* Ad */}
            <AdBanner
                type="display"
                slot={process.env.NEXT_PUBLIC_BELOW_HEADER ?? ""}
                format="horizontal"
                className="w-full rounded-xl"
            />

            {/* Status card */}
            <div className="w-full rounded-2xl border border-white/8 bg-[#141414] p-8 flex flex-col items-center gap-5 text-center">
                <div className="h-16 w-16 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                    <Download className="h-7 w-7 text-orange-400" />
                </div>

                <div>
                    <p className="text-white/50 text-sm mb-1">Downloading</p>
                    <h1 className="text-xl font-bold">{title}</h1>
                </div>

                {!started ? (
                    <>
                        {/* Countdown ring */}
                        <div className="relative h-16 w-16">
                            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                                <circle cx="32" cy="32" r="28" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="4" />
                                <circle
                                    cx="32" cy="32" r="28"
                                    fill="none"
                                    stroke="#f97316"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 28}`}
                                    strokeDashoffset={`${2 * Math.PI * 28 * (count / 5)}`}
                                    className="transition-all duration-1000"
                                />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-orange-400">
                                {count}
                            </span>
                        </div>

                        <p className="text-white/40 text-sm">Starting in {count} second{count !== 1 ? "s" : ""}…</p>

                        <button
                            onClick={triggerDownload}
                            className="px-6 py-2.5 rounded-full bg-orange-500 hover:bg-orange-400 text-sm font-semibold text-white transition-colors"
                        >
                            Download now
                        </button>
                    </>
                ) : (
                    <p className="text-green-400 font-medium">Download started!</p>
                )}
            </div>
        </div>
    );
}
