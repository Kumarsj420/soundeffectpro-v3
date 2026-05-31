import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import Message from "@/app/lib/models/Message";

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
    const read  = sp.get("read"); // "true" | "false" | null
    const type  = sp.get("type") ?? "";

    await connectDB();

    const filter: Record<string, unknown> = {};
    if (read === "true")  filter.read = true;
    if (read === "false") filter.read = false;
    if (type) filter.type = type;

    const [docs, total] = await Promise.all([
        Message.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Message.countDocuments(filter),
    ]);

    return Response.json({
        messages: docs.map(m => ({
            _id:         String(m._id),
            name:        m.name,
            senderEmail: m.senderEmail,
            type:        m.type,
            content:     m.content,
            read:        m.read,
            createdAt:   (m.createdAt as Date).toISOString(),
        })),
        total,
        pages: Math.ceil(total / limit),
    });
}
