import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import Message from "@/app/lib/models/Message";
import mongoose from "mongoose";

async function requireAdmin() {
    const session = await auth();
    return session && ["admin", "moderator"].includes(session.user.role) ? session : null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!await requireAdmin()) return Response.json({ error: "Unauthorized" }, { status: 403 });
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

    const { read } = await req.json() as { read?: boolean };
    if (typeof read !== "boolean") return Response.json({ error: "read (boolean) required" }, { status: 400 });

    await connectDB();
    await Message.findByIdAndUpdate(id, { read });
    return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!await requireAdmin()) return Response.json({ error: "Unauthorized" }, { status: 403 });
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

    await connectDB();
    await Message.findByIdAndDelete(id);
    return Response.json({ ok: true });
}
