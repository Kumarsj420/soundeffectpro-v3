import { connectDB } from "@/app/lib/db";
import Board from "@/app/lib/models/Board";
import SbModel from "@/app/lib/models/Sb";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

function isValidUrl(str: string) {
    try { return Boolean(new URL(str)); } catch { return false; }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const skip = (page - 1) * PAGE_SIZE;

    try {
        await connectDB();

        const raw = await Board.find({
            visibility: true,
            thumb: { $exists: true, $nin: ["", null] },
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(PAGE_SIZE + 1)
            .select("sb_id name thumb user createdAt")
            .lean();

        const hasMore  = raw.length > PAGE_SIZE;
        const boards   = raw.slice(0, PAGE_SIZE).filter(b => isValidUrl(b.thumb ?? ""));

        if (!boards.length) return Response.json({ boards: [], hasMore: false });

        const sbIds  = boards.map(b => b.sb_id);
        const counts = await SbModel.aggregate([
            { $match: { sb_id: { $in: sbIds } } },
            { $group: { _id: "$sb_id", count: { $sum: 1 } } },
        ]);
        const countMap = new Map(counts.map(c => [c._id, c.count as number]));

        const result = boards
            .map(b => ({
                sb_id:      b.sb_id,
                name:       b.name,
                thumb:      b.thumb as string,
                soundCount: countMap.get(b.sb_id) ?? 0,
                userName:   b.user?.name ?? "",
            }))
            .filter(b => b.soundCount > 0);

        return Response.json({ boards: result, hasMore: hasMore && result.length === PAGE_SIZE });
    } catch {
        return Response.json({ error: "Server error" }, { status: 500 });
    }
}
