/**
 * GET /api/admin/video-creator/download?job=&file=filename.mp4
 * GET /api/admin/video-creator/download?job=&zip=true
 */

import { auth } from "@/auth";
import { getJob, getJobDir } from "@/app/lib/videoJobManager";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const session = await auth();
    if (!session || !["admin", "moderator"].includes(session.user.role)) {
        return new Response("Unauthorized", { status: 403 });
    }

    const url = new URL(req.url);
    const jobId = url.searchParams.get("job");
    const filename = url.searchParams.get("file");
    const isZip = url.searchParams.get("zip") === "true";

    if (!jobId) return new Response("Missing job param", { status: 400 });

    const job = getJob(jobId);
    if (!job) return new Response("Job not found or expired", { status: 404 });

    const jobDir = getJobDir(jobId);

    if (isZip) {
        if (!job.zipPath || !job.zipFilename) {
            return new Response("ZIP not ready", { status: 400 });
        }
        if (!fs.existsSync(job.zipPath)) {
            return new Response("ZIP file not found", { status: 404 });
        }
        const buffer = fs.readFileSync(job.zipPath);
        return new Response(buffer, {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="${job.zipFilename}"`,
                "Content-Length": String(buffer.length),
            },
        });
    }

    if (!filename) return new Response("Missing file param", { status: 400 });

    // Security: prevent path traversal
    const safe = path.basename(filename);
    const filePath = path.join(jobDir, safe);

    if (!filePath.startsWith(jobDir)) {
        return new Response("Invalid filename", { status: 400 });
    }
    if (!fs.existsSync(filePath)) {
        return new Response("File not found", { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    return new Response(buffer, {
        headers: {
            "Content-Type": "video/mp4",
            "Content-Disposition": `attachment; filename="${safe}"`,
            "Content-Length": String(buffer.length),
        },
    });
}
