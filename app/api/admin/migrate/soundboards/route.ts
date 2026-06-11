import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Category from "@/app/lib/models/Category";
import User from "@/app/lib/models/User";
import mongoose from "mongoose";
import { getWeekStart, getMonthStart, getHalfYearStart } from "@/app/lib/statsPeriod";

export const dynamic = "force-dynamic";

// Vercel max duration (set to 300s for pro, ignored on hobby but we use bulkWrite so it's fast)
export const maxDuration = 300;

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

// POST — run all migrations using bulkWrite (single round trip each). Protected by CRON_SECRET.
//   1. categories → soundboards
//   2. Old Board docs in soundboards (sbId/userId/thumbnail/isPublic) → new schema
//   3. soundboard junction → soundboard_sounds (bulk copy + drop)
export async function POST(req: Request) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const db = mongoose.connection.db!;

    // ── 1. Categories → soundboards (bulk upsert) ─────────────────────────────
    const categories = await Category.find({}).lean();
    let categoriesMigrated = 0;

    if (categories.length > 0) {
        const catOps = categories
            .filter(cat => !!cat.sb_id)
            .map(cat => ({
                updateOne: {
                    filter: { sb_id: cat.sb_id },
                    update: {
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
                    upsert: true,
                },
            }));

        await db.collection("soundboards").bulkWrite(catOps, { ordered: false });
        categoriesMigrated = catOps.length;
    }

    // ── 2. Convert old-schema Board docs (have sbId field) ────────────────────
    const oldBoards = await db.collection("soundboards")
        .find({ sbId: { $exists: true } })
        .toArray();

    let boardsConverted = 0;

    if (oldBoards.length > 0) {
        // Batch-fetch all user names in one query
        const uids    = [...new Set(oldBoards.map(d => d.userId as string).filter(Boolean))];
        const users   = await User.find({ uid: { $in: uids } }).select("uid name").lean();
        const userMap = new Map(users.map(u => [u.uid, u.name ?? "User"]));

        const boardOps = oldBoards.map(doc => ({
            updateOne: {
                filter: { _id: doc._id },
                update: {
                    $set: {
                        sb_id:       doc.sbId,
                        "user.uid":  doc.userId ?? "unknown",
                        "user.name": userMap.get(doc.userId as string) ?? "User",
                        thumb:       doc.thumbnail ?? null,
                        visibility:  doc.isPublic ?? true,
                        slug:        doc.slug ?? toSlug(doc.name as string),
                        total_sfx:   0,
                        stats:       defaultStats(),
                    },
                    $unset: { sbId: "", userId: "", thumbnail: "", isPublic: "" },
                },
            },
        }));

        await db.collection("soundboards").bulkWrite(boardOps, { ordered: false });
        boardsConverted = boardOps.length;
    }

    // ── 3. soundboard → soundboard_sounds (bulk copy then drop) ───────────────
    const existingCollections = await db.listCollections({ name: "soundboard" }).toArray();
    let soundLinksCopied = 0;

    if (existingCollections.length > 0) {
        const oldLinks = await db.collection("soundboard").find({}).toArray();

        if (oldLinks.length > 0) {
            const linkOps = oldLinks.map(link => ({
                updateOne: {
                    filter: { sb_id: link.sb_id, s_id: link.s_id },
                    update: {
                        $setOnInsert: {
                            sb_id:     link.sb_id,
                            s_id:      link.s_id,
                            createdAt: link.createdAt ?? new Date(),
                        },
                    },
                    upsert: true,
                },
            }));

            await db.collection("soundboard_sounds").bulkWrite(linkOps, { ordered: false });
            soundLinksCopied = oldLinks.length;
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
