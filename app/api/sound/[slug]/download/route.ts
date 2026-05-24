import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import { parseSoundParam } from "@/app/lib/utils";
import { getWeekStart, getMonthStart, getHalfYearStart } from "@/app/lib/statsPeriod";

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug: urlParam } = await params;
        const { s_id } = parseSoundParam(urlParam);
        if (!s_id) return Response.json({ ok: false }, { status: 400 });

        await connectDB();

        await File.findOneAndUpdate(
            { s_id, visibility: true },
            {
                $inc: {
                    'stats.downloads': 1,
                    'stats.weekly.downloads': 1,
                    'stats.monthly.downloads': 1,
                    'stats.halfYearly.downloads': 1,
                },
                $setOnInsert: {
                    'stats.weekly.periodStart': getWeekStart(),
                    'stats.monthly.periodStart': getMonthStart(),
                    'stats.halfYearly.periodStart': getHalfYearStart(),
                },
            }
        );

        return Response.json({ ok: true });
    } catch {
        return Response.json({ ok: false }, { status: 500 });
    }
}
