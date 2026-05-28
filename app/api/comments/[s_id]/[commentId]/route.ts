import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import Comment from "@/app/lib/models/Comment";

// ── DELETE /api/comments/[s_id]/[commentId] ──────────────────────────────────
// Owner or admin/moderator can delete
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ s_id: string; commentId: string }> }
) {
    try {
        const session = await auth();
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const { commentId } = await params;

        await connectDB();
        const comment = await Comment.findById(commentId);

        if (!comment) return Response.json({ error: "Not found" }, { status: 404 });

        const isOwner = comment.userId === session.user.uid;
        const isMod   = ["admin", "moderator"].includes(session.user.role);

        if (!isOwner && !isMod) {
            return Response.json({ error: "Forbidden" }, { status: 403 });
        }

        await comment.deleteOne();
        return Response.json({ ok: true });

    } catch {
        return Response.json({ error: "Server error" }, { status: 500 });
    }
}
