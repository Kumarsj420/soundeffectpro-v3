import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import Board from "@/app/lib/models/Board";
import SbModel from "@/app/lib/models/Sb";
import File from "@/app/lib/models/File";

export const dynamic = "force-dynamic";

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

        const board = await Board.findOne({ sb_id: sbId }).lean();
        if (!board) return Response.json({ error: "Not found" }, { status: 404 });

        const isOwner = session?.user.uid === board.user.uid;
        if (!board.visibility && !isOwner) {
            return Response.json({ error: "Private board" }, { status: 403 });
        }

        const links  = await SbModel.find({ sb_id: sbId }).sort({ createdAt: 1 }).lean();
        const s_ids  = links.map(l => l.s_id);

        const soundDocs = s_ids.length
            ? await File.find({ s_id: { $in: s_ids }, visibility: true })
                .select("s_id slug title duration category btnColor stats")
                .lean()
            : [];

        const soundMap = new Map(soundDocs.map(s => [s.s_id, s]));
        const ordered  = s_ids.map(id => soundMap.get(id)).filter(Boolean);

        return Response.json({
            sb_id:      board.sb_id,
            name:       board.name,
            thumb:      board.thumb ?? null,
            visibility: board.visibility,
            isOwner,
            sounds:     ordered,
        });
    } catch {
        return Response.json({ error: "Server error" }, { status: 500 });
    }
}

// ── PATCH /api/soundboard/[sbId] — add/remove sound, rename, toggle visibility
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ sbId: string }> }
) {
    try {
        const session = await auth();
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const { sbId } = await params;
        const body = await req.json() as {
            action?:     "add" | "remove";
            s_id?:       string;
            name?:       string;
            visibility?: boolean;
        };

        await connectDB();
        const board = await Board.findOne({ sb_id: sbId, "user.uid": session.user.uid });
        if (!board) return Response.json({ error: "Not found or not yours" }, { status: 404 });

        if (body.action === "add" && body.s_id) {
            const count = await SbModel.countDocuments({ sb_id: sbId });
            if (count >= MAX_SOUNDS) {
                return Response.json({ error: `Max ${MAX_SOUNDS} sounds per board` }, { status: 429 });
            }
            await SbModel.updateOne(
                { sb_id: sbId, s_id: body.s_id },
                { $setOnInsert: { sb_id: sbId, s_id: body.s_id } },
                { upsert: true }
            );
        }

        if (body.action === "remove" && body.s_id) {
            await SbModel.deleteOne({ sb_id: sbId, s_id: body.s_id });
        }

        if (typeof body.name === "string") {
            const trimmed = body.name.trim();
            if (trimmed.length < 1 || trimmed.length > 100) {
                return Response.json({ error: "Name must be 1–100 chars" }, { status: 400 });
            }
            board.name = trimmed;
        }

        if (typeof body.visibility === "boolean") board.visibility = body.visibility;

        await board.save();

        const links = await SbModel.find({ sb_id: sbId }).select("s_id").lean();

        return Response.json({
            ok:         true,
            sounds:     links.map(l => l.s_id),
            name:       board.name,
            visibility: board.visibility,
        });
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

        const result = await Board.deleteOne({ sb_id: sbId, "user.uid": session.user.uid });
        if (result.deletedCount === 0) {
            return Response.json({ error: "Not found or not yours" }, { status: 404 });
        }

        await SbModel.deleteMany({ sb_id: sbId });

        return Response.json({ ok: true });
    } catch {
        return Response.json({ error: "Server error" }, { status: 500 });
    }
}
