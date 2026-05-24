import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://soundeffectpro.com").replace(/\/$/, "");

/**
 * Ping IndexNow so Bing, Yandex, and DuckDuckGo index the new sound immediately.
 * Key must be set in Railway env vars as INDEXNOW_KEY.
 * The matching /{key}.txt verification file is served by next.config.ts redirects
 * or a public/ file — see setup note below.
 */
async function pingIndexNow(url: string) {
    const key = process.env.INDEXNOW_KEY;
    if (!key) return;
    try {
        await fetch("https://api.indexnow.org/indexnow", {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify({
                host:    new URL(BASE).host,
                key,
                keyLocation: `${BASE}/${key}.txt`,
                urlList: [url],
            }),
        });
    } catch {
        // Non-critical — don't fail the moderation action
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || !["admin", "moderator"].includes(session.user.role)) {
            return Response.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id, action } = await req.json();
        if (!id || !["approve", "reject"].includes(action)) {
            return Response.json({ error: "Invalid request" }, { status: 400 });
        }

        await connectDB();

        if (action === "approve") {
            const sound = await File.findByIdAndUpdate(
                id,
                { moderationStatus: "approved", visibility: true },
                { new: true }
            ).select("slug s_id").lean();

            // Fire-and-forget IndexNow ping so crawlers pick it up within minutes
            if (sound?.slug && sound?.s_id) {
                pingIndexNow(`${BASE}/sound/${sound.slug}-${sound.s_id}`);
            }
        } else {
            await File.findByIdAndUpdate(id, {
                moderationStatus: "rejected",
                visibility: false,
            });
        }

        return Response.json({ ok: true });
    } catch {
        return Response.json({ ok: false }, { status: 500 });
    }
}
