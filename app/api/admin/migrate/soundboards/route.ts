import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Soundboard from "@/app/lib/models/Soundboard";
import SbModel from "@/app/lib/models/Sb";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// One-time migration: copy sounds[] from soundboards → soundboard (Sb) collection
// then unset the sounds field from every soundboard document.
// Protected by CRON_SECRET to prevent public access.
export async function POST(req: Request) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Fetch all boards that still have a non-empty sounds array
    const boards = await mongoose.connection.db
        ?.collection("soundboards")
        .find({ sounds: { $exists: true, $not: { $size: 0 } } })
        .toArray();

    if (!boards?.length) {
        return NextResponse.json({ message: "Nothing to migrate", migrated: 0 });
    }

    let totalLinks = 0;

    for (const board of boards) {
        const sbId   = board.sbId as string;
        const sounds = (board.sounds ?? []) as string[];

        for (const s_id of sounds) {
            await SbModel.updateOne(
                { sb_id: sbId, s_id },
                { $setOnInsert: { sb_id: sbId, s_id } },
                { upsert: true }
            );
            totalLinks++;
        }
    }

    // Remove sounds field from all soundboard documents
    await mongoose.connection.db
        ?.collection("soundboards")
        .updateMany({ sounds: { $exists: true } }, { $unset: { sounds: "" } });

    return NextResponse.json({
        message: "Migration complete",
        boardsMigrated: boards.length,
        linksCreated: totalLinks,
    });
}

// GET — dry run: shows what would be migrated without writing
export async function GET(req: Request) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const boards = await mongoose.connection.db
        ?.collection("soundboards")
        .find({ sounds: { $exists: true, $not: { $size: 0 } } })
        .toArray();

    const preview = (boards ?? []).map(b => ({
        sbId: b.sbId,
        name: b.name,
        soundCount: (b.sounds as string[] ?? []).length,
    }));

    return NextResponse.json({ wouldMigrate: preview.length, boards: preview });
}
