import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import Report from "@/app/lib/models/Report";
import { parseSoundParam } from "@/app/lib/utils";
import { REPORT_TYPES } from "@/app/lib/constants";
import { auth } from "@/auth";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await auth();

        const { slug: urlParam } = await params;
        const { s_id } = parseSoundParam(urlParam);
        if (!s_id) return Response.json({ error: "Invalid sound ID" }, { status: 400 });

        const body = await req.json();
        const { type, content } = body;

        if (!REPORT_TYPES.includes(type)) {
            return Response.json({ error: "Invalid report type" }, { status: 400 });
        }
        if (typeof content !== 'string' || content.trim().length < 10) {
            return Response.json({ error: "Report must be at least 10 characters" }, { status: 400 });
        }

        await connectDB();
        const sound = await File.findOne({ s_id, visibility: true }).select('s_id').lean();
        if (!sound) return Response.json({ error: "Not found" }, { status: 404 });

        const senderEmail = session?.user?.email ?? "anonymous@report";

        await Promise.all([
            Report.create({
                senderEmail,
                type,
                target: { from: "sound", id: sound.s_id },
                content: content.trim(),
            }),
            File.updateOne({ s_id: sound.s_id }, { $inc: { 'stats.reports': 1 } }),
        ]);

        return Response.json({ ok: true });
    } catch {
        return Response.json({ ok: false }, { status: 500 });
    }
}
