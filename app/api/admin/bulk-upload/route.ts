/**
 * POST /api/admin/bulk-upload
 *
 * Admin-only single-file upload endpoint. Called sequentially by the
 * AdminBulkUpload UI for each file in a batch.
 *
 * Differences from /api/upload (public):
 *  - Requires admin role
 *  - 50 MB size cap (vs 10 MB for public)
 *  - Accepts `license` field
 *  - Sets visibility:true + moderationStatus:approved immediately (no review queue)
 *  - Does NOT increment user.uploadCount
 */

import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import { CATEGORIES } from "@/app/lib/constants";
import { LICENSE_VALUES } from "@/app/lib/models/File";
import { uploadAudioToR2 } from "@/app/lib/r2/r2audioUpload";
import { syncSound } from "@/app/lib/meilisearch";

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_MIME   = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm"];
const BTN_COLORS     = ["0","20","125","145","195","225","255","280","305","335"] as const;

function slugify(str: string): string {
    return str.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80);
}

async function uniqueSlug(base: string): Promise<string> {
    let slug = base, n = 0;
    while (await File.exists({ slug })) slug = `${base}-${++n}`;
    return slug;
}

function randomBtnColor() {
    return BTN_COLORS[Math.floor(Math.random() * BTN_COLORS.length)];
}

export async function POST(req: Request) {
    try {
        // ── Auth ────────────────────────────────────────────────────────────
        const session = await auth();
        if (!session || session.user.role !== "admin") {
            return Response.json({ error: "Admin only" }, { status: 403 });
        }

        // ── Parse form data ─────────────────────────────────────────────────
        const fd          = await req.formData();
        const file        = fd.get("file") as globalThis.File | null;
        const title       = (fd.get("title") as string | null)?.trim() ?? "";
        const category    = (fd.get("category") as string | null) ?? "Random";
        const tagsRaw     = (fd.get("tags") as string | null) ?? "";
        const license     = (fd.get("license") as string | null) ?? "unknown";
        const description = (fd.get("description") as string | null)?.trim() ?? "";
        const duration    = (fd.get("duration") as string | null)?.trim() ?? "00:00";

        // ── Validation ──────────────────────────────────────────────────────
        if (!file || !file.size)
            return Response.json({ error: "No file" }, { status: 400 });
        if (file.size > MAX_SIZE_BYTES)
            return Response.json({ error: `File too large (max 50 MB)` }, { status: 413 });
        if (!ALLOWED_MIME.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|webm)$/i))
            return Response.json({ error: "Only MP3, WAV, OGG, WebM allowed" }, { status: 400 });
        if (!title || title.length < 2 || title.length > 100)
            return Response.json({ error: "Title must be 2–100 chars" }, { status: 400 });
        if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number]))
            return Response.json({ error: "Invalid category" }, { status: 400 });
        if (!LICENSE_VALUES.includes(license as (typeof LICENSE_VALUES)[number]))
            return Response.json({ error: "Invalid license" }, { status: 400 });
        if (!/^(0[0-9]|1[0-9]|20):[0-5][0-9]$|^02:00$/.test(duration))
            return Response.json({ error: "Invalid duration (MM:SS)" }, { status: 400 });

        const tags = tagsRaw
            .split(/[,\s]+/)
            .map(t => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))
            .filter(t => t.length > 0 && t.length <= 15)
            .slice(0, 10);

        // ── DB + R2 ─────────────────────────────────────────────────────────
        await connectDB();

        const slug    = await uniqueSlug(slugify(title));
        const created = await File.create({
            title,
            slug,
            description,
            duration,
            tags,
            category: category as (typeof CATEGORIES)[number],
            license:  license  as (typeof LICENSE_VALUES)[number],
            btnColor:         randomBtnColor(),
            user:             { uid: session.user.uid, name: session.user.name ?? "Admin" },
            visibility:       true,
            moderationStatus: "approved",
        });

        const doc    = created as unknown as { s_id: string; _id: string };
        const { s_id } = doc;

        const buffer = Buffer.from(await file.arrayBuffer());
        try {
            await uploadAudioToR2({ buffer, s_id });
        } catch {
            await File.findByIdAndDelete(doc._id);
            return Response.json({ error: "R2 upload failed" }, { status: 500 });
        }

        syncSound({ s_id, slug, title, tags, category, license, duration, visibility: true }).catch(() => null);

        return Response.json({ ok: true, s_id, slug, title });

    } catch (err) {
        console.error("[admin/bulk-upload]", err);
        return Response.json({ error: "Server error" }, { status: 500 });
    }
}
