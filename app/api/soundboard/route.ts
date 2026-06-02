import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import Soundboard from "@/app/lib/models/Soundboard";

export const dynamic = "force-dynamic";

const MAX_BOARDS = 10;

// ── GET /api/soundboard — list current user's soundboards ────────────────────
export async function GET() {
    try {
        const session = await auth();
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const boards = await Soundboard.find({ userId: session.user.uid })
            .sort({ createdAt: -1 })
            .select("sbId name sounds isPublic createdAt")
            .lean();

        return Response.json({ boards });
    } catch {
        return Response.json({ error: "Server error" }, { status: 500 });
    }
}

// ── POST /api/soundboard — create a new soundboard ──────────────────────────
export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const { name, s_id } = await req.json();

        if (!name || typeof name !== "string" || name.trim().length < 1) {
            return Response.json({ error: "Name required" }, { status: 400 });
        }
        if (name.trim().length > 60) {
            return Response.json({ error: "Name too long (max 60 chars)" }, { status: 400 });
        }

        await connectDB();

        // Cap per-user soundboards
        const count = await Soundboard.countDocuments({ userId: session.user.uid });
        if (count >= MAX_BOARDS) {
            return Response.json({ error: `Max ${MAX_BOARDS} soundboards per user` }, { status: 429 });
        }

        const board = await Soundboard.create({
            userId:   session.user.uid,
            name:     name.trim(),
            sounds:   s_id ? [s_id] : [],
            isPublic: true,
        });

        return Response.json({ ok: true, board: {
            sbId:     board.sbId,
            name:     board.name,
            sounds:   board.sounds,
            isPublic: board.isPublic,
        }}, { status: 201 });

    } catch {
        return Response.json({ error: "Server error" }, { status: 500 });
    }
}
