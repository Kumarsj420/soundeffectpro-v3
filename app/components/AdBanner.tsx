"use client";

import { useEffect, useRef, useState } from "react";

declare global {
    interface Window { adsbygoogle: unknown[]; }
}

type AdType = "display" | "multiplex" | "in-article" | "in-feed";

interface AdBannerProps {
    type: AdType;
    slot: string;
    className?: string;
    format?: "auto" | "horizontal" | "rectangle" | "vertical";
    layoutKey?: string;
}

const AD_CLIENT = process.env.NEXT_PUBLIC_GOOGLE_AD_CLIENT ?? "";

function getInsProps(type: AdType, slot: string, format: string, layoutKey?: string) {
    switch (type) {
        case "multiplex":
            return { "data-ad-client": AD_CLIENT, "data-ad-slot": slot, "data-ad-format": "autorelaxed" };
        case "in-article":
            return { "data-ad-client": AD_CLIENT, "data-ad-slot": slot, "data-ad-layout": "in-article", "data-ad-format": "fluid" };
        case "in-feed":
            return { "data-ad-client": AD_CLIENT, "data-ad-slot": slot, "data-ad-format": "fluid", ...(layoutKey ? { "data-ad-layout-key": layoutKey } : {}) };
        default:
            return { "data-ad-client": AD_CLIENT, "data-ad-slot": slot, "data-ad-format": format, "data-full-width-responsive": "true" };
    }
}

export default function AdBanner({ type, slot, className = "", format = "auto", layoutKey }: AdBannerProps) {
    const insRef  = useRef<HTMLModElement>(null);
    const pushed  = useRef(false);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (pushed.current || !AD_CLIENT || !slot) return;
        pushed.current = true;
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch { /* AdSense not yet loaded */ }

        // After AdSense processes the slot, check if it was filled.
        // Unfilled or blocked ads get display:none or data-ad-status="unfilled".
        const timer = setTimeout(() => {
            const el = insRef.current;
            if (!el) return;
            const status = el.getAttribute("data-ad-status");
            const height = el.offsetHeight;
            if (status === "unfilled" || height === 0) setVisible(false);
        }, 1500);

        return () => clearTimeout(timer);
    }, [slot]);

    if (!AD_CLIENT || !slot || !visible) return null;

    return (
        <div role="region" aria-label="Advertisement" className={`w-full overflow-hidden ${className}`}>
            <ins
                ref={insRef}
                className="adsbygoogle"
                style={{ display: "block", textAlign: "center" }}
                {...getInsProps(type, slot, format, layoutKey)}
            />
        </div>
    );
}
