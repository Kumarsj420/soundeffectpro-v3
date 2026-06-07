import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import { parseSoundParam } from "@/app/lib/utils";
import { buildDownloadPipeline } from "@/app/lib/statsPeriod";

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

        // Fire-and-forget tracking so it doesn't block the download
        File.findOneAndUpdate({ s_id, visibility: true }, buildDownloadPipeline(), { updatePipeline: true }).catch(() => null);

        const r2Url = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/store/${s_id}.mp3`;
        const r2Res = await fetch(r2Url);
        if (!r2Res.ok) return new Response("File not found", { status: 404 });

        // arrayBuffer is more reliable than streaming body in Next.js standalone
        const buffer = await r2Res.arrayBuffer();

        const title = ((sound as { title?: string }).title ?? s_id)
            .replace(/[^a-z0-9\-_. ]/gi, "")
            .trim() || s_id;

        return new Response(buffer, {
            headers: {
                "Content-Type":        "audio/mpeg",
                "Content-Disposition": `attachment; filename="${title}.mp3"`,
                "Cache-Control":       "no-store",
            },
        });
    } catch (err) {
        console.error("[download/file]", err);
        return new Response("Server error", { status: 500 });
    }
}
