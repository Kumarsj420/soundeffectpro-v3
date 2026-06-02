import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import Comment from "@/app/lib/models/Comment";
import { containsBannedWord } from "@/app/lib/bannedWords";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

// ── GET /api/comments/[s_id]?page=1 ────────────────────────────────────────
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ s_id: string }> }
) {
    const { s_id } = await params;
    const url      = new URL(_req.url);
    const page     = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const skip     = (page - 1) * PAGE_SIZE;

    try {
        await connectDB();
        const [comments, total] = await Promise.all([
            Comment.find({ soundId: s_id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(PAGE_SIZE)
                .select("_id userId userName userImage text createdAt")
                .lean(),
            Comment.countDocuments({ soundId: s_id }),
        ]);

        return Response.json({
            comments: comments.map(c => ({
                id:        (c._id as { toString(): string }).toString(),
                userId:    c.userId,
                userName:  c.userName,
                userImage: c.userImage,
                text:      c.text,
                createdAt: c.createdAt,
            })),
            total,
            page,
            pages: Math.ceil(total / PAGE_SIZE),
        });
    } catch {
        return Response.json({ error: "Server error" }, { status: 500 });
    }
}

// ── POST /api/comments/[s_id] ────────────────────────────────────────────────
export async function POST(
    req: Request,
    { params }: { params: Promise<{ s_id: string }> }
) {
    try {
        const session = await auth();
        if (!session) return Response.json({ error: "Sign in to comment" }, { status: 401 });

        const { s_id } = await params;
        const { text } = await req.json();

        if (!text || typeof text !== "string") {
            return Response.json({ error: "Text required" }, { status: 400 });
        }

        const trimmed = text.trim();

        if (trimmed.length < 1)  return Response.json({ error: "Comment is empty" }, { status: 400 });
        if (trimmed.length > 500) return Response.json({ error: "Max 500 characters" }, { status: 400 });
        if (containsBannedWord(trimmed)) {
            return Response.json({ error: "Comment contains disallowed content" }, { status: 400 });
        }

        await connectDB();

        // Rate limit: max 5 comments per user per sound
        const existing = await Comment.countDocuments({ soundId: s_id, userId: session.user.uid });
        if (existing >= 5) {
            return Response.json({ error: "You've reached the comment limit for this sound" }, { status: 429 });
        }

        const comment = await Comment.create({
            soundId:   s_id,
            userId:    session.user.uid,
            userName:  session.user.name ?? "Anonymous",
            userImage: session.user.image ?? null,
            text:      trimmed,
        });

        return Response.json({
            ok: true,
            comment: {
                id:        (comment._id as { toString(): string }).toString(),
                userId:    comment.userId,
                userName:  comment.userName,
                userImage: comment.userImage,
                text:      comment.text,
                createdAt: comment.createdAt,
            },
        }, { status: 201 });

    } catch {
        return Response.json({ error: "Server error" }, { status: 500 });
    }
}
