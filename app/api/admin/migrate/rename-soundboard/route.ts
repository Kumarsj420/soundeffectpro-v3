import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// POST — copies all {sb_id, s_id} docs from 'soundboard' → 'soundboard_sounds' then drops 'soundboard'
export async function POST(req: Request) {
    if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await connectDB();
        const db = mongoose.connection.db;
        if (!db) return NextResponse.json({ error: "DB not connected" }, { status: 500 });

        const exists = await db.listCollections({ name: "soundboard" }).toArray();
        if (!exists.length) {
            return NextResponse.json({ ok: true, message: "soundboard collection does not exist — nothing to do" });
        }

        const docs = await db.collection("soundboard").find({}).toArray();

        if (docs.length > 0) {
            const ops = docs.map(doc => ({
                updateOne: {
                    filter: { sb_id: doc.sb_id, s_id: doc.s_id },
                    update: { $setOnInsert: { sb_id: doc.sb_id, s_id: doc.s_id, createdAt: doc.createdAt ?? new Date() } },
                    upsert: true,
                },
            }));
            await db.collection("soundboard_sounds").bulkWrite(ops, { ordered: false });
        }

        await db.collection("soundboard").drop();

        return NextResponse.json({ ok: true, copied: docs.length, dropped: "soundboard" });
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
