import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Message from "@/app/lib/models/Message";

const ALLOWED_TYPES = ["contact", "feedback", "inquiry", "support", "technical issue", "other"] as const;
type MessageType = typeof ALLOWED_TYPES[number];

export async function POST(req: NextRequest) {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { name, email, type, message } = body as Record<string, string>;

    if (!name?.trim() || name.trim().length < 2 || name.trim().length > 100)
        return NextResponse.json({ error: "Name must be 2–100 characters." }, { status: 400 });

    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });

    if (!ALLOWED_TYPES.includes(type as MessageType))
        return NextResponse.json({ error: "Invalid message type." }, { status: 400 });

    if (!message?.trim() || message.trim().length < 10 || message.trim().length > 600)
        return NextResponse.json({ error: "Message must be 10–600 characters." }, { status: 400 });

    try {
        await connectDB();

        // Rate limit: max 3 messages per email in the last hour
        const since = new Date(Date.now() - 60 * 60 * 1000);
        const recent = await Message.countDocuments({ senderEmail: email.toLowerCase(), createdAt: { $gte: since } });
        if (recent >= 3)
            return NextResponse.json({ error: "Too many messages. Please wait before sending again." }, { status: 429 });

        await Message.create({
            name: name.trim(),
            senderEmail: email.trim().toLowerCase(),
            type: type as MessageType,
            content: message.trim(),
        });

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
}
