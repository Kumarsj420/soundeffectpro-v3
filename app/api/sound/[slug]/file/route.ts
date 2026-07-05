import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import { parseSoundParam } from "@/app/lib/utils";
import { buildDownloadPipeline } from "@/app/lib/statsPeriod";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "@/app/lib/r2/r2";

export const dynamic = "force-dynamic";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug: urlParam } = await params;
        const { s_id } = parseSoundParam(urlParam);
        if (!s_id) return new Response("Not found", { status: 404 });

        await connectDB();

        const sound = await File.findOne({ s_id, visibility: true })
            .select("title s_id")
            .lean();

        if (!sound) return new Response("Not found", { status: 404 });

        // Fire-and-forget download tracking — doesn't block the redirect
        File.findOneAndUpdate({ s_id, visibility: true }, buildDownloadPipeline(), { updatePipeline: true }).catch(() => null);

        const title = ((sound as { title?: string }).title ?? s_id)
            .replace(/[^a-z0-9\-_. ]/gi, "")
            .trim() || s_id;

        // Presign a short-lived R2 URL that forces a download with the right
        // filename. The bytes stream directly from R2 — previously we buffered the
        // whole file into origin memory (OOM risk at 512MB) and re-served every
        // byte through the origin, spending bandwidth on each download.
        const command = new GetObjectCommand({
            Bucket:                     process.env.R2_BUCKET,
            Key:                        `store/${s_id}.mp3`,
            ResponseContentType:        "audio/mpeg",
            ResponseContentDisposition: `attachment; filename="${title}.mp3"`,
        });
        const signedUrl = await getSignedUrl(r2, command, { expiresIn: 300 });

        return Response.redirect(signedUrl, 302);
    } catch (err) {
        console.error("[download/file]", err);
        return new Response("Server error", { status: 500 });
    }
}
