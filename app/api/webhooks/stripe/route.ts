import { headers } from "next/headers";
import Stripe from "stripe";
import { connectDB } from "@/app/lib/db";
import User from "@/app/lib/models/User";
import { getStripe } from "@/app/lib/stripe";
import type { Plan } from "@/app/lib/models/User";

export const dynamic = "force-dynamic";

const PLAN_FROM_PRICE: Record<string, Plan> = {
    [process.env.STRIPE_PRO_PRICE_ID ?? ""]: "pro",
    [process.env.STRIPE_API_PRICE_ID ?? ""]: "api",
};

function planFromSubscription(sub: Stripe.Subscription): Plan {
    const priceId = sub.items.data[0]?.price.id ?? "";
    return PLAN_FROM_PRICE[priceId] ?? "free";
}

export async function POST(req: Request) {
    const body   = await req.text();
    const hdrs   = await headers();
    const sig    = hdrs.get("stripe-signature") ?? "";
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secret) return new Response("Webhook secret not configured", { status: 500 });

    let event: Stripe.Event;
    try {
        event = getStripe().webhooks.constructEvent(body, sig, secret);
    } catch {
        return new Response("Invalid signature", { status: 400 });
    }

    try {
        await connectDB();

        switch (event.type) {
            // ── Subscription activated / updated ─────────────────────────────
            case "customer.subscription.created":
            case "customer.subscription.updated": {
                const sub = event.data.object as Stripe.Subscription;
                const uid = sub.metadata?.uid;
                if (!uid) break;

                const isActive = sub.status === "active" || sub.status === "trialing";
                const plan     = isActive ? planFromSubscription(sub) : "free";

                // cancel_at is set when user cancels but period hasn't ended
                // null means subscription is ongoing — no hard expiry
                const planExpiresAt = sub.cancel_at
                    ? new Date(sub.cancel_at * 1000)
                    : null;

                await User.updateOne({ uid }, {
                    plan,
                    stripeSubscriptionId: sub.id,
                    planExpiresAt,
                });
                break;
            }

            // ── Subscription cancelled ────────────────────────────────────────
            case "customer.subscription.deleted": {
                const sub = event.data.object as Stripe.Subscription;
                const uid = sub.metadata?.uid;
                if (!uid) break;

                await User.updateOne({ uid }, {
                    plan:                 "free",
                    stripeSubscriptionId: null,
                    planExpiresAt:        null,
                });
                break;
            }

            // ── Checkout completed — ensure customerId is stored ──────────────
            case "checkout.session.completed": {
                const cs  = event.data.object as Stripe.Checkout.Session;
                const uid = cs.metadata?.uid;
                if (!uid || !cs.customer) break;

                // Only update if not already set
                await User.updateOne(
                    { uid, stripeCustomerId: null },
                    { stripeCustomerId: cs.customer as string }
                );
                break;
            }
        }
    } catch (err) {
        console.error("[webhook/stripe]", err);
        return new Response("Handler error", { status: 500 });
    }

    return new Response("ok", { status: 200 });
}
