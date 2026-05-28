import type { Metadata } from "next";
import { auth } from "@/auth";
import { Check, Zap, Crown, Code2, Sparkles } from "lucide-react";
import PricingActions from "./PricingActions";

export const metadata: Metadata = {
    title: "Pricing — SoundEffectPro",
    description: "Upgrade to Pro for ad-free listening and royalty-free sound downloads. Perfect for creators, streamers, and developers.",
    alternates: { canonical: "/pricing" },
};

const PLANS = [
    {
        id:       "free",
        name:     "Free",
        price:    "$0",
        period:   "forever",
        icon:     Zap,
        color:    "text-white/60",
        border:   "border-white/10",
        features: [
            "Play all 20,000+ sounds",
            "Download meme & unknown sounds",
            "Create & share soundboards",
            "Basic search",
        ],
        missing: [
            "Ads shown",
            "No royalty-free downloads",
        ],
        cta: "Current plan",
        ctaVariant: "ghost" as const,
    },
    {
        id:       "pro",
        name:     "Pro",
        price:    "$4.99",
        period:   "/ month",
        icon:     Crown,
        color:    "text-orange-400",
        border:   "border-orange-500/40",
        badge:    "Most Popular",
        features: [
            "Everything in Free",
            "100% ad-free experience",
            "Download royalty-free sounds",
            "Commercial use license",
            "Priority support",
        ],
        missing: [],
        cta:        "Upgrade to Pro",
        ctaVariant: "pro" as const,
    },
    {
        id:       "api",
        name:     "API",
        price:    "$9.99",
        period:   "/ month",
        icon:     Code2,
        color:    "text-violet-400",
        border:   "border-violet-500/30",
        features: [
            "Everything in Pro",
            "API access (10k req/day)",
            "Search & stream via API",
            "Webhook support",
            "Dedicated API key",
        ],
        missing: [],
        cta:        "Get API Access",
        ctaVariant: "api" as const,
    },
];

export default async function PricingPage({
    searchParams,
}: {
    searchParams: Promise<{ success?: string; cancelled?: string }>;
}) {
    const session = await auth().catch(() => null);
    const { success, cancelled } = await searchParams;
    const userPlan = (session?.user.plan ?? "free") as "free" | "pro" | "api";

    return (
        <div className="mx-auto max-w-5xl px-4 py-12 space-y-12">
            {/* Banner */}
            {success && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-4 text-center">
                    <p className="text-emerald-400 font-semibold">🎉 Welcome to Pro! Your subscription is active.</p>
                    <p className="text-emerald-400/60 text-sm mt-1">Sign out and back in if you don't see your new perks yet.</p>
                </div>
            )}
            {cancelled && (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-center">
                    <p className="text-white/60">Checkout cancelled — no charge was made.</p>
                </div>
            )}

            {/* Header */}
            <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-orange-500/8 px-3 py-1 text-xs font-medium text-orange-400">
                    <Sparkles className="h-3 w-3" />
                    Simple, transparent pricing
                </div>
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                    Upgrade your<br />
                    <span className="gradient-text">sound experience</span>
                </h1>
                <p className="text-white/50 max-w-md mx-auto">
                    Free to play everything. Upgrade for ad-free + royalty-free downloads for your content.
                </p>
            </div>

            {/* Pricing cards */}
            <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
                {PLANS.map(plan => {
                    const Icon = plan.icon;
                    const isCurrent = userPlan === plan.id;
                    return (
                        <div
                            key={plan.id}
                            className={`relative rounded-2xl border bg-[#111113] p-6 flex flex-col gap-5 ${
                                plan.id === "pro"
                                    ? "border-orange-500/40 shadow-xl shadow-orange-500/10"
                                    : plan.border
                            }`}
                        >
                            {plan.badge && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span className="rounded-full bg-orange-500 px-3 py-0.5 text-xs font-bold text-white">
                                        {plan.badge}
                                    </span>
                                </div>
                            )}

                            {/* Name + price */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Icon className={`h-5 w-5 ${plan.color}`} />
                                    <span className={`font-bold ${plan.color}`}>{plan.name}</span>
                                    {isCurrent && (
                                        <span className="ml-auto rounded-full bg-white/8 px-2 py-0.5 text-xs text-white/50">
                                            Current
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-extrabold">{plan.price}</span>
                                    <span className="text-white/40 text-sm">{plan.period}</span>
                                </div>
                            </div>

                            {/* Features */}
                            <ul className="space-y-2.5 flex-1">
                                {plan.features.map(f => (
                                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                        {f}
                                    </li>
                                ))}
                                {plan.missing.map(f => (
                                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/25 line-through">
                                        <span className="h-4 w-4 shrink-0 mt-0.5 flex items-center justify-center text-white/20">✕</span>
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            <PricingActions
                                plan={plan.id as "free" | "pro" | "api"}
                                variant={plan.ctaVariant}
                                label={isCurrent ? "Current plan" : plan.cta}
                                isCurrent={isCurrent}
                                isLoggedIn={!!session}
                                hasSubscription={!!session && userPlan !== "free"}
                            />
                        </div>
                    );
                })}
            </div>

            {/* FAQ */}
            <section className="rounded-2xl border border-white/8 bg-[#111113] p-6 sm:p-8 space-y-6">
                <h2 className="text-xl font-bold">Frequently Asked Questions</h2>
                <div className="grid sm:grid-cols-2 gap-6">
                    {[
                        {
                            q: "Can I cancel anytime?",
                            a: "Yes — cancel from the billing portal with one click. You keep Pro access until the end of your billing period.",
                        },
                        {
                            q: "What counts as royalty-free?",
                            a: "Sounds verified by our team as free to use in YouTube, Twitch, TikTok, and other commercial content. Copyrighted meme sounds are play-only.",
                        },
                        {
                            q: "Do you offer refunds?",
                            a: "Yes, contact us within 7 days of your first charge and we'll refund you in full.",
                        },
                        {
                            q: "Which countries do you support?",
                            a: "Stripe supports 40+ countries and most major cards, Apple Pay, Google Pay, and more.",
                        },
                    ].map(({ q, a }) => (
                        <div key={q}>
                            <p className="font-semibold text-white/80 mb-1">{q}</p>
                            <p className="text-sm text-white/45 leading-relaxed">{a}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
