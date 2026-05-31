import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import Report from "@/app/lib/models/Report";

export const dynamic = "force-dynamic";

async function requireAdmin() {
    const session = await auth();
    return session && ["admin", "moderator"].includes(session.user.role) ? session : null;
}

export async function GET(req: Request) {
    if (!await requireAdmin()) return Response.json({ error: "Unauthorized" }, { status: 403 });

    const sp   = new URL(req.url).searchParams;
    const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
    const limit = 30;
    const read  = sp.get("read");
    const type  = sp.get("type") ?? "";

    await connectDB();

    const filter: Record<string, unknown> = {};
    if (read === "true")  filter.read = true;
    if (read === "false") filter.read = false;
    if (type) filter.type = type;

    const [docs, total] = await Promise.all([
        Report.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Report.countDocuments(filter),
    ]);

    return Response.json({
        reports: docs.map(r => ({
            _id:         String(r._id),
            senderEmail: r.senderEmail,
            type:        r.type,
            target:      r.target,
            content:     r.content,
            read:        r.read,
            createdAt:   (r.createdAt as Date).toISOString(),
        })),
        total,
        pages: Math.ceil(total / limit),
    });
}
