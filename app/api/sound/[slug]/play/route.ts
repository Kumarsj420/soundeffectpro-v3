import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import { parseSoundParam } from "@/app/lib/utils";
import { buildViewPipeline } from "@/app/lib/statsPeriod";

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug: urlParam } = await params;
        const { s_id } = parseSoundParam(urlParam);
        if (!s_id) return Response.json({ ok: false }, { status: 400 });

        await connectDB();

        // buildViewPipeline() uses $cond to auto-reset stale weekly/monthly/
        // halfYearly buckets before incrementing — fixing the old $setOnInsert bug
        // where period counters never reset and accumulated as all-time totals.
        await File.findOneAndUpdate(
            { s_id, visibility: true },
            buildViewPipeline()
        );

        return Response.json({ ok: true });
    } catch {
        return Response.json({ ok: false }, { status: 500 });
    }
}
