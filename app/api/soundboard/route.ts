import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import Board from "@/app/lib/models/Board";
import SbModel from "@/app/lib/models/Sb";

export const dynamic = "force-dynamic";

const MAX_BOARDS = 10;

// ── GET /api/soundboard — list current user's soundboards ────────────────────
export async function GET() {
    try {
        const session = await auth();
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();

        const boards = await Board.find({ "user.uid": session.user.uid })
            .sort({ createdAt: -1 })
            .select("sb_id name thumb visibility createdAt")
            .lean();

        const sbIds = boards.map(b => b.sb_id);
        const links = await SbModel.find({ sb_id: { $in: sbIds } }).select("sb_id s_id").lean();

        const soundsByBoard = new Map<string, string[]>();
        for (const l of links) {
            if (!soundsByBoard.has(l.sb_id)) soundsByBoard.set(l.sb_id, []);
            soundsByBoard.get(l.sb_id)!.push(l.s_id);
        }

        const result = boards.map(b => ({
            sb_id:      b.sb_id,
            name:       b.name,
            thumb:      b.thumb ?? null,
            visibility: b.visibility,
            sounds:     soundsByBoard.get(b.sb_id) ?? [],
        }));

        return Response.json({ boards: result });
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
        if (name.trim().length > 100) {
            return Response.json({ error: "Name too long (max 100 chars)" }, { status: 400 });
        }

        await connectDB();

        const count = await Board.countDocuments({ "user.uid": session.user.uid });
        if (count >= MAX_BOARDS) {
            return Response.json({ error: `Max ${MAX_BOARDS} soundboards per user` }, { status: 429 });
        }

        const board = await Board.create({
            name:       name.trim(),
            user:       { uid: session.user.uid, name: session.user.name ?? "User" },
            visibility: true,
        });

        if (s_id && typeof s_id === "string") {
            await SbModel.create({ sb_id: board.sb_id, s_id }).catch(() => null);
        }

        return Response.json({
            ok: true,
            board: {
                sb_id:      board.sb_id,
                name:       board.name,
                thumb:      board.thumb ?? null,
                visibility: board.visibility,
                sounds:     s_id ? [s_id] : [],
            },
        }, { status: 201 });

    } catch {
        return Response.json({ error: "Server error" }, { status: 500 });
    }
}
