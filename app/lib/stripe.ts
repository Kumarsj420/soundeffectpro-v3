import Stripe from "stripe";

// Singleton — avoids re-creating on every hot-reload in dev
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
    if (!_stripe) {
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: "2026-05-27.dahlia",
        });
    }
    return _stripe;
}

// Price IDs — set in Railway env vars after creating products in Stripe dashboard
export const PRICE_IDS = {
    pro: process.env.STRIPE_PRO_PRICE_ID!,
    api: process.env.STRIPE_API_PRICE_ID!,
} as const;

export type PlanKey = keyof typeof PRICE_IDS;
