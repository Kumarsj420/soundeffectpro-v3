import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import User from "@/app/lib/models/User";
import { getStripe, PRICE_IDS, type PlanKey } from "@/app/lib/stripe";

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://soundeffectpro.com").replace(/\/$/, "");

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session) return Response.json({ error: "Sign in first" }, { status: 401 });

        const { plan } = await req.json() as { plan: PlanKey };
        if (!plan || !PRICE_IDS[plan]) {
            return Response.json({ error: "Invalid plan" }, { status: 400 });
        }

        await connectDB();
        const user = await User.findOne({ uid: session.user.uid }).select("email stripeCustomerId plan").lean();
        if (!user) return Response.json({ error: "User not found" }, { status: 404 });

        // Already on this plan or higher
        if (user.plan === plan || (user.plan === "api" && plan === "pro")) {
            return Response.json({ error: "Already subscribed to this plan" }, { status: 409 });
        }

        const stripe = getStripe();

        // Get or create Stripe customer
        let customerId = user.stripeCustomerId ?? undefined;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { uid: session.user.uid },
            });
            customerId = customer.id;
            await User.updateOne({ uid: session.user.uid }, { stripeCustomerId: customerId });
        }

        const checkoutSession = await stripe.checkout.sessions.create({
            customer:             customerId,
            mode:                 "subscription",
            line_items:           [{ price: PRICE_IDS[plan], quantity: 1 }],
            success_url:          `${BASE}/pricing?success=1`,
            cancel_url:           `${BASE}/pricing?cancelled=1`,
            subscription_data:    { metadata: { uid: session.user.uid, plan } },
            allow_promotion_codes: true,
        });

        return Response.json({ url: checkoutSession.url });
    } catch (err) {
        console.error("[stripe/checkout]", err);
        return Response.json({ error: "Checkout failed" }, { status: 500 });
    }
}
