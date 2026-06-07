"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

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
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-green-400">Copied!</span>
                </>
            ) : (
                <>
                    <Share2 className="h-4 w-4" />
                    Share
                </>
            )}
        </button>
    );
}
