/**
 * POST /api/admin/import-thumbnail
 * Saves a base64-encoded cover image to R2 at meta/admin-import-thumb.jpg
 * so it persists across page refreshes without re-uploading.
 */

import { auth } from "@/auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/app/lib/r2/r2";

export async function POST(req: Request) {
    const session = await auth();
    if (!session || !["admin", "moderator"].includes(session.user.role)) {
        return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { base64 } = await req.json() as { base64?: string };
    if (!base64) return Response.json({ error: "No image data" }, { status: 400 });

    const buffer = Buffer.from(base64, "base64");
    if (buffer.length > 2 * 1024 * 1024) {
        return Response.json({ error: "Image too large (max 2 MB)" }, { status: 400 });
    }

    const key = "meta/admin-import-thumb.jpg";
    await r2.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: "image/jpeg",
        CacheControl: "no-cache, max-age=0",
    }));

    const url = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`;
    return Response.json({ url });
}
