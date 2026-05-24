"use client";

import { useState } from "react";

export default function ShareButton({ title, url }: { title: string; url: string }) {
    const [copied, setCopied] = useState(false);

    async function handleShare() {
        // Use native share sheet on mobile (iOS/Android)
        if (typeof navigator !== "undefined" && navigator.share) {
            try {
                await navigator.share({
                    title: `${title} Sound Effect`,
                    text:  `Play "${title}" sound effect for free 🎵`,
                    url,
                });
                return;
            } catch {
                // User cancelled — do nothing
                return;
            }
        }

        // Desktop fallback: copy link to clipboard
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Last resort: prompt
            window.prompt("Copy this link:", url);
        }
    }

    return (
        <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-2 rounded-full border border-white/15 hover:border-white/30 px-4 py-2 text-sm transition-colors"
            aria-label="Share this sound"
        >
            {copied ? (
                <>
                    <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-400">Copied!</span>
                </>
            ) : (
                <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a3 3 0 10-5.716-1.684M9 12a9.002 9.002 0 01-2.348 6.026M9 12A9.003 9.003 0 0112 3" />
                    </svg>
                    Share
                </>
            )}
        </button>
    );
}
