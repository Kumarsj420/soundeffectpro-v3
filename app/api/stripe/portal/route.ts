import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import User from "@/app/lib/models/User";
import { getStripe } from "@/app/lib/stripe";

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://soundeffectpro.com").replace(/\/$/, "");

export async function POST() {
    try {
        const session = await auth();
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const user = await User.findOne({ uid: session.user.uid }).select("stripeCustomerId").lean();

        if (!user?.stripeCustomerId) {
            return Response.json({ error: "No active subscription" }, { status: 404 });
        }

        const stripe = getStripe();
        const portal = await stripe.billingPortal.sessions.create({
            customer:   user.stripeCustomerId,
            return_url: `${BASE}/pricing`,
        });

        return Response.json({ url: portal.url });
    } catch (err) {
        console.error("[stripe/portal]", err);
        return Response.json({ error: "Portal failed" }, { status: 500 });
    }
}
