/**
 * GET  /api/admin/sounds  — paginated sound list with filters
 * PATCH /api/admin/sounds  — bulk update license / visibility / category
 */

import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import { LICENSE_VALUES } from "@/app/lib/models/File";
import { CATEGORIES } from "@/app/lib/constants";

async function requireAdmin(req?: Request) {
    const session = await auth();
    if (!session || !["admin", "moderator"].includes(session.user.role)) return null;
    return session;
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
    if (!await requireAdmin()) {
        return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const sp         = new URL(req.url).searchParams;
    const page       = Math.max(1, parseInt(sp.get("page") ?? "1"));
    const limit      = Math.min(100, parseInt(sp.get("limit") ?? "50"));
    const license    = sp.get("license") ?? "";
    const category   = sp.get("category") ?? "";
    const visibility = sp.get("visibility") ?? "";
    const search     = sp.get("search")?.trim() ?? "";

    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (license)               filter.license    = license;
    if (category)              filter.category   = category;
    if (visibility === "true") filter.visibility = true;
    if (visibility === "false") filter.visibility = false;
    if (search)                filter.title      = { $regex: search, $options: "i" };

    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
        File.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select("s_id slug title category license visibility trendScore stats createdAt")
            .lean(),
        File.countDocuments(filter),
    ]);

    return Response.json({
        sounds: docs.map(s => ({
            _id:        String(s._id),
            s_id:       s.s_id,
            slug:       s.slug ?? "",
            title:      s.title,
            category:   (s.category as string) ?? "—",
            license:    (s.license as string) ?? "unknown",
            visibility: s.visibility,
            trendScore: (s.trendScore as number) ?? 0,
            views:      ((s.stats as { views?: number })?.views) ?? 0,
            createdAt:  (s.createdAt as Date).toISOString(),
        })),
        total,
        page,
        pages: Math.ceil(total / limit),
    });
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
    const session = await requireAdmin();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const { ids, update } = body as { ids: string[]; update: Record<string, unknown> };

    if (!Array.isArray(ids) || ids.length === 0)
        return Response.json({ error: "No ids" }, { status: 400 });

    // Whitelist updatable fields + validate values
    const sanitised: Record<string, unknown> = {};

    if ("license" in update) {
        if (!LICENSE_VALUES.includes(update.license as (typeof LICENSE_VALUES)[number]))
            return Response.json({ error: "Invalid license" }, { status: 400 });
        sanitised.license = update.license;
    }
    if ("visibility" in update) {
        sanitised.visibility = Boolean(update.visibility);
    }
    if ("category" in update) {
        if (!CATEGORIES.includes(update.category as (typeof CATEGORIES)[number]))
            return Response.json({ error: "Invalid category" }, { status: 400 });
        sanitised.category = update.category;
    }

    if (Object.keys(sanitised).length === 0)
        return Response.json({ error: "Nothing to update" }, { status: 400 });

    await connectDB();
    const result = await File.updateMany(
        { s_id: { $in: ids } },
        { $set: sanitised }
    );

    return Response.json({ ok: true, modified: result.modifiedCount });
}
