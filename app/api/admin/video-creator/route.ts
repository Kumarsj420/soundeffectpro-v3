/**
 * POST /api/admin/video-creator
 *   action: "start"  — create a new job
 *   action: "retry"  — retry a failed video in an existing job
 */

import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import fs from "fs";
import path from "path";
import { createJob, getJob, getJobDir, type VideoJob } from "@/app/lib/videoJobManager";
import { processVideos, retryVideo } from "@/app/lib/videoProcessor";

function randomHex(bytes = 16): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
        .map(b => b.toString(16).padStart(2, "0")).join("");
}

async function requireAdminOrMod() {
    const session = await auth();
    if (!session || !["admin", "moderator"].includes(session.user.role)) return null;
    return session;
}

export async function POST(req: Request) {
    const session = await requireAdminOrMod();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();

    // ── Retry a failed video ──────────────────────────────────────────────────
    if (body.action === "retry") {
        const { jobId, s_id } = body as { jobId?: string; s_id?: string };
        if (!jobId || !s_id) return Response.json({ error: "Missing jobId or s_id" }, { status: 400 });
        const job = getJob(jobId);
        if (!job) return Response.json({ error: "Job not found or expired" }, { status: 404 });

        // Fire retry in background
        retryVideo(jobId, s_id).catch(() => null);
        return Response.json({ ok: true });
    }

    // ── Start a new job ───────────────────────────────────────────────────────
    const { format, coverBase64, videos } = body as {
        format?: string;
        coverBase64?: string;
        videos?: Array<{ s_id: string; title: string; duration: string }>;
    };

    if (!format || !["landscape", "portrait"].includes(format)) {
        return Response.json({ error: "Invalid format" }, { status: 400 });
    }
    if (!coverBase64) return Response.json({ error: "Cover image required" }, { status: 400 });
    if (!Array.isArray(videos) || videos.length === 0 || videos.length > 15) {
        return Response.json({ error: "Select 1–15 sounds" }, { status: 400 });
    }

    // Validate all s_ids exist in DB
    await connectDB();
    const ids = videos.map(v => v.s_id);
    const count = await File.countDocuments({ s_id: { $in: ids } });
    if (count !== ids.length) return Response.json({ error: "One or more sounds not found" }, { status: 400 });

    // Save cover image to job dir
    const jobId = randomHex(16);
    const jobDir = getJobDir(jobId);
    fs.mkdirSync(jobDir, { recursive: true });

    let coverImagePath: string;
    try {
        const coverBuffer = Buffer.from(coverBase64, "base64");
        if (coverBuffer.length > 5 * 1024 * 1024) {
            return Response.json({ error: "Cover image too large (max 5 MB)" }, { status: 400 });
        }
        coverImagePath = path.join(jobDir, "cover.jpg");
        fs.writeFileSync(coverImagePath, coverBuffer);
    } catch {
        return Response.json({ error: "Invalid cover image" }, { status: 400 });
    }

    const job: VideoJob = {
        jobId,
        format: format as "landscape" | "portrait",
        coverImagePath,
        videos: videos.map(v => ({
            s_id: v.s_id,
            title: v.title.trim() || v.s_id,
            duration: v.duration,
            status: "queued",
            progress: 0,
        })),
        createdAt: Date.now(),
        zipReady: false,
    };

    createJob(job);

    // Start processing in background — Railway persistent server keeps this alive
    processVideos(jobId).catch(() => null);

    return Response.json({ jobId });
}
