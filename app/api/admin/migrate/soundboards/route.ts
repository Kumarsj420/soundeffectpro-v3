import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Category from "@/app/lib/models/Category";
import User from "@/app/lib/models/User";
import mongoose from "mongoose";
import { getWeekStart, getMonthStart, getHalfYearStart } from "@/app/lib/statsPeriod";

export const dynamic = "force-dynamic";

function toSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function defaultStats() {
    return {
        views: 0,
        reports: 0,
        halfYearly: { views: 0, periodStart: getHalfYearStart() },
        monthly:    { views: 0, periodStart: getMonthStart() },
        weekly:     { views: 0, periodStart: getWeekStart() },
    };
}

// POST — run all migrations. Protected by CRON_SECRET.
//   1. categories → soundboards (upsert all categories as soundboards)
//   2. Old Board docs in soundboards (have sbId/userId/thumbnail/isPublic) → new schema
//   3. soundboard junction → soundboard_sounds (copy + drop old collection)
export async function POST(req: Request) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const db = mongoose.connection.db!;

    // ── 1. Categories → soundboards ───────────────────────────────────────────
    const categories = await Category.find({}).lean();
    let categoriesMigrated = 0;

    for (const cat of categories) {
        if (!cat.sb_id) continue;
        await db.collection("soundboards").updateOne(
            { sb_id: cat.sb_id },
            {
                $set: {
                    sb_id:      cat.sb_id,
                    name:       cat.name,
                    slug:       cat.slug ?? toSlug(cat.name),
                    thumb:      cat.thumb ?? null,
                    visibility: cat.visibility ?? true,
                    total_sfx:  cat.total_sfx ?? 0,
                    stats:      cat.stats ?? defaultStats(),
                    user:       cat.user ?? { uid: "system", name: "System" },
                    createdAt:  cat.createdAt,
                },
                $unset: { sbId: "", userId: "", thumbnail: "", isPublic: "" },
            },
            { upsert: true }
        );
        categoriesMigrated++;
    }

    // ── 2. Convert old-schema Board docs (have sbId field) ───────────────────
    const oldBoards = await db.collection("soundboards")
        .find({ sbId: { $exists: true } })
        .toArray();

    let boardsConverted = 0;

    for (const doc of oldBoards) {
        const uid      = doc.userId as string;
        const userDoc  = uid ? await User.findOne({ uid }).select("name").lean() : null;
        const userName = (userDoc?.name as string | undefined) ?? "User";

        await db.collection("soundboards").updateOne(
            { _id: doc._id },
            {
                $set: {
                    sb_id:       doc.sbId,
                    "user.uid":  uid ?? "unknown",
                    "user.name": userName,
                    thumb:       doc.thumbnail ?? null,
                    visibility:  doc.isPublic ?? true,
                    slug:        doc.slug ?? toSlug(doc.name as string),
                    total_sfx:   0,
                    stats:       defaultStats(),
                },
                $unset: { sbId: "", userId: "", thumbnail: "", isPublic: "" },
            }
        );
        boardsConverted++;
    }

    // ── 3. soundboard → soundboard_sounds (copy then drop) ───────────────────
    const existingCollections = await db.listCollections({ name: "soundboard" }).toArray();
    let soundLinksCopied = 0;

    if (existingCollections.length > 0) {
        const oldLinks = await db.collection("soundboard").find({}).toArray();
        for (const link of oldLinks) {
            await db.collection("soundboard_sounds").updateOne(
                { sb_id: link.sb_id, s_id: link.s_id },
                { $setOnInsert: { sb_id: link.sb_id, s_id: link.s_id, createdAt: link.createdAt ?? new Date() } },
                { upsert: true }
            );
            soundLinksCopied++;
        }
        await db.collection("soundboard").drop();
    }

    return NextResponse.json({
        ok: true,
        categoriesMigrated,
        boardsConverted,
        soundLinksCopied,
        soundOldCollectionDropped: existingCollections.length > 0,
    });
}

// GET — dry run: shows what would be migrated
export async function GET(req: Request) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const db = mongoose.connection.db!;

    const oldSoundCollExists = await db.listCollections({ name: "soundboard" }).toArray();

    const [categoryCount, oldBoardCount, oldLinkCount, newLinkCount] = await Promise.all([
        Category.countDocuments(),
        db.collection("soundboards").countDocuments({ sbId: { $exists: true } }),
        oldSoundCollExists.length > 0
            ? db.collection("soundboard").countDocuments()
            : Promise.resolve(0),
        db.collection("soundboard_sounds").countDocuments(),
    ]);

    return NextResponse.json({
        categoriesToMigrate:  categoryCount,
        oldSchemaBoardsToFix: oldBoardCount,
        soundLinksToCopy:     oldLinkCount,
        soundLinksAlreadyNew: newLinkCount,
        note: "POST to this endpoint to run the migration",
    });
}
