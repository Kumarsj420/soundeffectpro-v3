/**
 * GET /api/admin/video-creator/sounds?q=&category=&limit=20
 * Search sounds for the video creator picker.
 */

import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const session = await auth();
    if (!session || !["admin", "moderator"].includes(session.user.role)) {
        return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const category = url.searchParams.get("category")?.trim() ?? "";
    const sort = url.searchParams.get("sort") === "recent" ? "recent" : "popular";
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 50);

    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { visibility: true };
    if (q) filter.title = { $regex: q, $options: "i" };
    if (category && category !== "all") filter.category = category;

    const sortOrder: Record<string, 1 | -1> = sort === "recent" ? { createdAt: -1 } : { "stats.views": -1 };

    const sounds = await File.find(filter)
        .sort(sortOrder)
        .limit(limit)
        .select("s_id slug title duration tags category")
        .lean();

    return Response.json({
        sounds: sounds.map(s => ({
            s_id: s.s_id,
            title: s.title,
            slug: s.slug,
            duration: s.duration,
            tags: s.tags,
            category: s.category,
        })),
    });
}
