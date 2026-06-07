import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import { parseSoundParam } from "@/app/lib/utils";
import { buildDownloadPipeline } from "@/app/lib/statsPeriod";

export const dynamic = "force-dynamic";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug: urlParam } = await params;
    const { s_id } = parseSoundParam(urlParam);
    if (!s_id) return new Response("Not found", { status: 404 });

    await connectDB();

    const sound = await File.findOneAndUpdate(
        { s_id, visibility: true },
        buildDownloadPipeline()
    ).select("title s_id").lean();

    if (!sound) return new Response("Not found", { status: 404 });

    const r2Url = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/store/${s_id}.mp3`;
    const r2Res = await fetch(r2Url).catch(() => null);
    if (!r2Res?.ok) return new Response("File not found", { status: 404 });

    const title = ((sound as { title?: string }).title ?? s_id)
        .replace(/[^a-z0-9\-_. ]/gi, "")
        .trim() || s_id;

    return new Response(r2Res.body, {
        headers: {
            "Content-Type":        "audio/mpeg",
            "Content-Disposition": `attachment; filename="${title}.mp3"`,
            "Cache-Control":       "no-store",
        },
    });
}
