import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Board from "@/app/lib/models/Board";
import SbModel from "@/app/lib/models/Sb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const totalBoards   = await Board.countDocuments();
    const publicBoards  = await Board.countDocuments({ visibility: true });
    const withThumbnail = await Board.countDocuments({ visibility: true, thumb: { $exists: true, $nin: ["", null] } });
    const totalSbLinks  = await SbModel.countDocuments();

    const sample = await Board.find({ thumb: { $exists: true, $nin: ["", null] } })
        .limit(5)
        .select("sb_id name thumb visibility user")
        .lean();

    const sbIds        = sample.map(b => b.sb_id);
    const sampleCounts = await SbModel.aggregate([
        { $match: { sb_id: { $in: sbIds } } },
        { $group: { _id: "$sb_id", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(sampleCounts.map((c: { _id: string; count: number }) => [c._id, c.count]));

    return NextResponse.json({
        totalBoards,
        publicBoards,
        withThumbnail,
        totalSbJunctionLinks: totalSbLinks,
        sampleBoards: sample.map(b => ({
            sb_id:           b.sb_id,
            name:            b.name,
            thumb:           b.thumb,
            visibility:      b.visibility,
            user:            b.user,
            soundCount:      countMap.get(b.sb_id) ?? 0,
            thumbIsValidUrl: (() => { try { return Boolean(new URL(b.thumb ?? "")); } catch { return false; } })(),
        })),
    });
}
