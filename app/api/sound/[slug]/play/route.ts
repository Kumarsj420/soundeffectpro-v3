import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import { getWeekStart, getMonthStart, getHalfYearStart } from "@/app/lib/statsPeriod";

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        await connectDB();

        const weekStart = getWeekStart();
        const monthStart = getMonthStart();
        const halfStart = getHalfYearStart();

        await File.findOneAndUpdate(
            { slug, visibility: true },
            {
                $inc: {
                    'stats.views': 1,
                    'stats.weekly.views': 1,
                    'stats.monthly.views': 1,
                    'stats.halfYearly.views': 1,
                },
                $setOnInsert: {
                    'stats.weekly.periodStart': weekStart,
                    'stats.monthly.periodStart': monthStart,
                    'stats.halfYearly.periodStart': halfStart,
                },
            }
        );

        return Response.json({ ok: true });
    } catch {
        return Response.json({ ok: false }, { status: 500 });
    }
}
