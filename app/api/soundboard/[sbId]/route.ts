import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import Soundboard from "@/app/lib/models/Soundboard";
import File from "@/app/lib/models/File";

const MAX_SOUNDS = 30;

// ── GET /api/soundboard/[sbId] — fetch a board (public or owned) ─────────────
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ sbId: string }> }
) {
    const { sbId } = await params;

    try {
        const session = await auth().catch(() => null);
        await connectDB();

        const board = await Soundboard.findOne({ sbId }).lean();
        if (!board) return Response.json({ error: "Not found" }, { status: 404 });

        // Only owner can see private boards
        const isOwner = session?.user.uid === board.userId;
        if (!board.isPublic && !isOwner) {
            return Response.json({ error: "Private board" }, { status: 403 });
        }

        // Fetch sound details
        const sounds = board.sounds.length
            ? await File.find({ s_id: { $in: board.sounds }, visibility: true })
                .select("s_id slug title duration category btnColor stats")
                .lean()
            : [];

        // Preserve board ordering
        const soundMap = new Map(sounds.map(s => [s.s_id, s]));
        const ordered  = board.sounds.map(id => soundMap.get(id)).filter(Boolean);

        return Response.json({
            sbId:      board.sbId,
            name:      board.name,
            isPublic:  board.isPublic,
            isOwner,
            sounds:    ordered,
        });
    } catch {
        return Response.json({ error: "Server error" }, { status: 500 });
    }
}

// ── PATCH /api/soundboard/[sbId] — add/remove sound, rename, toggle public ──
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ sbId: string }> }
) {
    try {
        const session = await auth();
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const { sbId } = await params;
        const body     = await req.json() as {
            action?: "add" | "remove" | "reorder";
            s_id?:   string;
            sounds?:  string[];
            name?:   string;
            isPublic?: boolean;
        };

        await connectDB();
        const board = await Soundboard.findOne({ sbId, userId: session.user.uid });
        if (!board) return Response.json({ error: "Not found or not yours" }, { status: 404 });

        if (body.action === "add" && body.s_id) {
            if (board.sounds.includes(body.s_id)) {
                return Response.json({ error: "Already in board" }, { status: 409 });
            }
            if (board.sounds.length >= MAX_SOUNDS) {
                return Response.json({ error: `Max ${MAX_SOUNDS} sounds per board` }, { status: 429 });
            }
            board.sounds.push(body.s_id);
        }

        if (body.action === "remove" && body.s_id) {
            board.sounds = board.sounds.filter((id: string) => id !== body.s_id);
        }

        if (body.action === "reorder" && Array.isArray(body.sounds)) {
            // Ensure only existing sounds survive reorder
            const allowed = new Set(board.sounds);
            board.sounds  = body.sounds.filter((id: string) => allowed.has(id));
        }

        if (typeof body.name === "string") {
            const trimmed = body.name.trim();
            if (trimmed.length < 1 || trimmed.length > 60) {
                return Response.json({ error: "Name must be 1–60 chars" }, { status: 400 });
            }
            board.name = trimmed;
        }

        if (typeof body.isPublic === "boolean") {
            board.isPublic = body.isPublic;
        }

        await board.save();
        return Response.json({ ok: true, sounds: board.sounds, name: board.name, isPublic: board.isPublic });

    } catch {
        return Response.json({ error: "Server error" }, { status: 500 });
    }
}

// ── DELETE /api/soundboard/[sbId] ────────────────────────────────────────────
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ sbId: string }> }
) {
    try {
        const session = await auth();
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const { sbId } = await params;
        await connectDB();

        const result = await Soundboard.deleteOne({ sbId, userId: session.user.uid });
        if (result.deletedCount === 0) {
            return Response.json({ error: "Not found or not yours" }, { status: 404 });
        }

        return Response.json({ ok: true });
    } catch {
        return Response.json({ error: "Server error" }, { status: 500 });
    }
}
