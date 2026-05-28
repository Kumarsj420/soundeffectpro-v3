"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface Props {
    plan:            "free" | "pro" | "api";
    variant:         "ghost" | "pro" | "api";
    label:           string;
    isCurrent:       boolean;
    isLoggedIn:      boolean;
    hasSubscription: boolean;
}

export default function PricingActions({ plan, variant, label, isCurrent, isLoggedIn, hasSubscription }: Props) {
    const router  = useRouter();
    const [busy, setBusy] = useState(false);

    async function handleClick() {
        if (isCurrent || plan === "free") return;
        if (!isLoggedIn) { router.push("/login"); return; }

        setBusy(true);

        // If already subscribed, open billing portal to switch plans
        if (hasSubscription) {
            const res = await fetch("/api/stripe/portal", { method: "POST" }).catch(() => null);
            if (res?.ok) {
                const { url } = await res.json();
                window.location.href = url;
            }
            setBusy(false);
            return;
        }

        // New checkout
        const res = await fetch("/api/stripe/checkout", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ plan }),
        }).catch(() => null);

        if (res?.ok) {
            const { url } = await res.json();
            window.location.href = url;
        } else {
            setBusy(false);
        }
    }

    if (plan === "free" || isCurrent) {
        return (
            <div className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/40 text-center">
                {label}
            </div>
        );
    }

    const classes = variant === "pro"
        ? "bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/25"
        : "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/25";

    return (
        <button
            onClick={handleClick}
            disabled={busy}
            className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${classes}`}
        >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {label}
        </button>
    );
}
