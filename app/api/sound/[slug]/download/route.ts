import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import { parseSoundParam } from "@/app/lib/utils";
import { buildDownloadPipeline } from "@/app/lib/statsPeriod";

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug: urlParam } = await params;
        const { s_id } = parseSoundParam(urlParam);
        if (!s_id) return Response.json({ ok: false }, { status: 400 });

        await connectDB();

        // buildDownloadPipeline() uses $cond to auto-reset stale period buckets
        // before incrementing downloads — same fix as play/route.ts.
        await File.findOneAndUpdate(
            { s_id, visibility: true },
            buildDownloadPipeline(),
            { updatePipeline: true }
        );

        return Response.json({ ok: true });
    } catch {
        return Response.json({ ok: false }, { status: 500 });
    }
}
