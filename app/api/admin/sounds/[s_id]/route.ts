import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import { CATEGORIES, LICENSE_VALUES } from "@/app/lib/constants";
import { r2 } from "@/app/lib/r2/r2";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

async function requireAdmin() {
    const session = await auth();
    return session && ["admin", "moderator"].includes(session.user.role) ? session : null;
}

// GET /api/admin/sounds/[s_id] — full sound doc for edit form
export async function GET(_req: Request, { params }: { params: Promise<{ s_id: string }> }) {
    if (!await requireAdmin()) return Response.json({ error: "Unauthorized" }, { status: 403 });
    const { s_id } = await params;
    await connectDB();

    const sound = await File.findOne({ s_id })
        .select("s_id slug title description duration tags category license btnColor visibility moderationStatus createdAt stats")
        .lean();

    if (!sound) return Response.json({ error: "Not found" }, { status: 404 });

    return Response.json({
        s_id:             sound.s_id,
        slug:             sound.slug,
        title:            sound.title,
        description:      (sound.description as string) ?? "",
        duration:         sound.duration,
        tags:             sound.tags,
        category:         sound.category as string,
        license:          (sound.license as string) ?? "unknown",
        btnColor:         (sound.btnColor as string) ?? "0",
        visibility:       sound.visibility,
        moderationStatus: (sound.moderationStatus as string) ?? "approved",
        createdAt:        (sound.createdAt as Date).toISOString(),
        views:            (sound.stats as { views?: number })?.views ?? 0,
        downloads:        (sound.stats as { downloads?: number })?.downloads ?? 0,
    });
}

// PUT /api/admin/sounds/[s_id] — update sound metadata
export async function PUT(req: Request, { params }: { params: Promise<{ s_id: string }> }) {
    const session = await requireAdmin();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 403 });
    const { s_id } = await params;

    const body = await req.json() as Record<string, unknown>;

    const update: Record<string, unknown> = {};

    if (typeof body.title === "string") {
        const t = body.title.trim();
        if (t.length < 2 || t.length > 100) return Response.json({ error: "Title 2–100 chars" }, { status: 400 });
        update.title = t;
    }
    if (typeof body.description === "string") update.description = body.description.trim().slice(0, 600);
    if (typeof body.duration === "string")    update.duration = body.duration;
    if (typeof body.visibility === "boolean") update.visibility = body.visibility;
    if (typeof body.moderationStatus === "string") {
        if (!["pending","approved","rejected"].includes(body.moderationStatus))
            return Response.json({ error: "Invalid moderationStatus" }, { status: 400 });
        update.moderationStatus = body.moderationStatus;
        if (body.moderationStatus === "approved") update.visibility = true;
        if (body.moderationStatus === "rejected") update.visibility = false;
    }
    if (typeof body.category === "string") {
        if (!CATEGORIES.includes(body.category as (typeof CATEGORIES)[number]))
            return Response.json({ error: "Invalid category" }, { status: 400 });
        update.category = body.category;
    }
    if (typeof body.license === "string") {
        if (!LICENSE_VALUES.includes(body.license as (typeof LICENSE_VALUES)[number]))
            return Response.json({ error: "Invalid license" }, { status: 400 });
        update.license = body.license;
    }
    if (Array.isArray(body.tags)) {
        update.tags = (body.tags as string[])
            .map((t: string) => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, ""))
            .filter(t => t.length > 0 && t.length <= 20)
            .slice(0, 10);
    }
    if (typeof body.btnColor === "string") update.btnColor = body.btnColor;

    if (Object.keys(update).length === 0)
        return Response.json({ error: "Nothing to update" }, { status: 400 });

    await connectDB();
    const result = await File.updateOne({ s_id }, { $set: update });
    if (result.matchedCount === 0) return Response.json({ error: "Not found" }, { status: 404 });

    return Response.json({ ok: true });
}

// DELETE /api/admin/sounds/[s_id] — remove from DB + R2
export async function DELETE(_req: Request, { params }: { params: Promise<{ s_id: string }> }) {
    const session = await requireAdmin();
    if (!session || session.user.role !== "admin")
        return Response.json({ error: "Admin only" }, { status: 403 });

    const { s_id } = await params;
    await connectDB();

    const sound = await File.findOne({ s_id });
    if (!sound) return Response.json({ error: "Not found" }, { status: 404 });

    // Delete from R2 first
    try {
        await r2.send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET!,
            Key:    `store/${s_id}.mp3`,
        }));
    } catch {
        // Continue even if R2 delete fails (file may not exist)
    }

    await File.deleteOne({ s_id });
    return Response.json({ ok: true });
}
