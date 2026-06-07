import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Board from "@/app/lib/models/Board";
import SbModel from "@/app/lib/models/Sb";
import Category from "@/app/lib/models/Category";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

function toSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// POST — run both migrations:
//   1. categories with thumbnails → soundboards collection
//   2. soundboards.sounds[] → soundboard junction collection (legacy cleanup)
// Protected by CRON_SECRET.
export async function POST(req: Request) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // ── 1. Categories → soundboards ───────────────────────────────────────────
    const categories = await Category.find({
        thumb: { $exists: true, $nin: [null, ""] },
    }).lean();

    let categoriesMigrated = 0;

    for (const cat of categories) {
        const sbId = cat.sb_id;
        if (!sbId) continue;

        await Board.updateOne(
            { sbId },
            {
                $setOnInsert: {
                    sbId,
                    userId:    cat.user?.uid ?? "system",
                    name:      cat.name,
                    slug:      cat.slug ?? toSlug(cat.name),
                    thumbnail: cat.thumb ?? "",
                    isPublic:  cat.visibility ?? true,
                    createdAt: cat.createdAt,
                },
            },
            { upsert: true }
        );
        categoriesMigrated++;
    }

    // ── 2. soundboards.sounds[] → Sb junction (legacy cleanup) ───────────────
    const boards = await mongoose.connection.db
        ?.collection("soundboards")
        .find({ sounds: { $exists: true, $not: { $size: 0 } } })
        .toArray();

    let totalLinks = 0;

    for (const board of boards ?? []) {
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

    // Remove legacy sounds field from all soundboard docs
    await mongoose.connection.db
        ?.collection("soundboards")
        .updateMany({ sounds: { $exists: true } }, { $unset: { sounds: "" } });

    return NextResponse.json({
        message:             "Both migrations complete",
        categoriesMigrated,
        soundboardLinks:     totalLinks,
    });
}

// GET — dry run: shows what would be migrated without writing
export async function GET(req: Request) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const categories = await Category.find({
        thumb: { $exists: true, $nin: [null, ""] },
    }).select("sb_id name thumb visibility").lean();

    const legacyBoards = await mongoose.connection.db
        ?.collection("soundboards")
        .find({ sounds: { $exists: true, $not: { $size: 0 } } })
        .toArray();

    return NextResponse.json({
        categoriesToMigrate: categories.length,
        categories: categories.map(c => ({ sb_id: c.sb_id, name: c.name, thumb: c.thumb })),
        legacySoundboardsToClean: (legacyBoards ?? []).length,
    });
}
