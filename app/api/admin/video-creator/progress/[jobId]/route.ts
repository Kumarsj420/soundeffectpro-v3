/**
 * GET /api/admin/video-creator/progress/[jobId]
 * Server-Sent Events stream — sends video progress updates in real time.
 */

import { auth } from "@/auth";
import { getJob, subscribe, isJobComplete } from "@/app/lib/videoJobManager";

export const dynamic = "force-dynamic";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ jobId: string }> },
) {
    const session = await auth();
    if (!session || !["admin", "moderator"].includes(session.user.role)) {
        return new Response("Unauthorized", { status: 403 });
    }

    const { jobId } = await params;
    const job = getJob(jobId);
    if (!job) return new Response("Job not found or expired", { status: 404 });

    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | null = null;

    const stream = new ReadableStream({
        start(controller) {
            const send = (data: Record<string, unknown>) => {
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                } catch { /* stream closed */ }
            };

            // Send full current state immediately so a reconnect sees latest status
            send({
                type: "init",
                videos: job.videos,
                zipReady: job.zipReady,
                zipFilename: job.zipFilename,
            });

            // Already done — close immediately
            if (isJobComplete(job)) {
                try { controller.close(); } catch { /* ignore */ }
                return;
            }

            // Subscribe to live events
            unsubscribe = subscribe(jobId, (event) => {
                send(event);
                const currentJob = getJob(jobId);
                if (currentJob && isJobComplete(currentJob)) {
                    unsubscribe?.();
                    unsubscribe = null;
                    try { controller.close(); } catch { /* ignore */ }
                }
            });
        },
        cancel() {
            unsubscribe?.();
        },
    });

    // Handle client disconnect
    req.signal.addEventListener("abort", () => {
        unsubscribe?.();
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no", // disable nginx buffering on Railway
        },
    });
}
