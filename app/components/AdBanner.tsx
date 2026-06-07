"use client";

import { useEffect, useRef } from "react";

declare global {
    interface Window { adsbygoogle: unknown[]; }
}

type AdType = "display" | "multiplex" | "in-article" | "in-feed";

interface AdBannerProps {
    type:       AdType;
    slot:       string;
    className?: string;
    format?:    "auto" | "horizontal" | "rectangle" | "vertical";
    layoutKey?: string;
}

const AD_CLIENT = process.env.NEXT_PUBLIC_GOOGLE_AD_CLIENT ?? "";

const SIZE_CLASS: Record<AdType, string> = {
    "display":    "min-h-[50px] sm:min-h-[90px]",
    "in-article": "min-h-[100px] sm:min-h-[250px]",
    "in-feed":    "min-h-[100px] sm:min-h-[250px]",
    "multiplex":  "min-h-[150px] sm:min-h-[280px]",
};

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
    const pushed = useRef(false);

    useEffect(() => {
        if (pushed.current || !AD_CLIENT || !slot) return;
        pushed.current = true;
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch { /* AdSense not yet loaded */ }
    }, [slot]);

    if (!AD_CLIENT || !slot) return null;

    return (
        <div
            role="region"
            aria-label="Advertisement"
            className={`w-full overflow-hidden ${SIZE_CLASS[type]} ${className}`}
        >
            <ins
                className="adsbygoogle"
                style={{ display: "block", textAlign: "center" }}
                {...getInsProps(type, slot, format, layoutKey)}
            />
        </div>
    );
}
