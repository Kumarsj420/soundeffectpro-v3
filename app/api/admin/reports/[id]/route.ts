import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import Report from "@/app/lib/models/Report";
import File from "@/app/lib/models/File";
import mongoose from "mongoose";

async function requireAdmin() {
    const session = await auth();
    return session && ["admin", "moderator"].includes(session.user.role) ? session : null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!await requireAdmin()) return Response.json({ error: "Unauthorized" }, { status: 403 });
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

    const body = await req.json() as { read?: boolean; action?: "hide_sound" | "dismiss" };
    await connectDB();

    const report = await Report.findById(id);
    if (!report) return Response.json({ error: "Not found" }, { status: 404 });

    if (typeof body.read === "boolean") {
        report.read = body.read;
    }

    if (body.action === "hide_sound" && report.target?.id) {
        await File.updateOne({ s_id: report.target.id }, { visibility: false });
    }

    await report.save();
    return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!await requireAdmin()) return Response.json({ error: "Unauthorized" }, { status: 403 });
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

    await connectDB();
    await Report.findByIdAndDelete(id);
    return Response.json({ ok: true });
}
