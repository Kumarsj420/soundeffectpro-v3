import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || !['admin', 'moderator'].includes(session.user.role)) {
            return Response.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id, action } = await req.json();
        if (!id || !['approve', 'reject'].includes(action)) {
            return Response.json({ error: "Invalid request" }, { status: 400 });
        }

        await connectDB();

        if (action === 'approve') {
            await File.findByIdAndUpdate(id, {
                moderationStatus: 'approved',
                visibility: true,
            });
        } else {
            await File.findByIdAndUpdate(id, {
                moderationStatus: 'rejected',
                visibility: false,
            });
        }

        return Response.json({ ok: true });
    } catch {
        return Response.json({ ok: false }, { status: 500 });
    }
}
