import fs from "fs";
import path from "path";
import archiver from "archiver";
import {
    getJob, getJobDir, updateVideo, setZipReady,
    isJobComplete, type VideoItem,
} from "./videoJobManager";

function parseDurationSecs(d: string): number {
    const parts = d.split(":").map(Number);
    if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
    if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
    return 60;
}

function safeFilename(title: string, s_id: string): string {
    const slug = title.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "-").slice(0, 60);
    return `${slug || s_id}.mp4`;
}

async function getFfmpegPath(): Promise<string | null> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod = await import("ffmpeg-static" as any);
        return (mod.default ?? mod) as string | null;
    } catch {
        return null; // fall back to system ffmpeg (e.g. homebrew on macOS dev)
    }
}

async function runFfmpeg(
    coverPath: string,
    audioPath: string,
    outputPath: string,
    width: number,
    height: number,
    totalSecs: number,
    onProgress: (pct: number) => void,
): Promise<void> {
    const ffmpeg = (await import("fluent-ffmpeg")).default;
    const ffmpegPath = await getFfmpegPath();
    if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

    return new Promise<void>((resolve, reject) => {
        ffmpeg()
            .input(coverPath)
            .inputOptions(["-loop 1"])
            .input(audioPath)
            .videoCodec("libx264")
            .audioCodec("aac")
            .audioBitrate("192k")
            .outputOptions([
                "-tune stillimage",
                `-vf scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`,
                "-pix_fmt yuv420p",
                "-shortest",
                "-movflags +faststart",
            ])
            .output(outputPath)
            .on("progress", (p: { timemark?: string }) => {
                if (p.timemark && totalSecs > 0) {
                    const [h, m, s] = p.timemark.split(":").map(parseFloat);
                    const current = (h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0);
                    onProgress(Math.min(15 + Math.round((current / totalSecs) * 80), 94));
                }
            })
            .on("end", () => resolve())
            .on("error", (err: Error) => reject(err))
            .run();
    });
}

async function downloadAudio(s_id: string, destPath: string): Promise<void> {
    const url = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/store/${s_id}.mp3`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!resp.ok) throw new Error(`Audio download failed: HTTP ${resp.status}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = Buffer.from(await resp.arrayBuffer() as any);
    if (buffer.length < 500) throw new Error("Downloaded audio too small");
    fs.writeFileSync(destPath, buffer);
}

async function buildZip(files: string[], zipPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const arc = archiver("zip", { zlib: { level: 1 } });
        output.on("close", resolve);
        arc.on("error", reject);
        arc.pipe(output);
        for (const f of files) arc.file(f, { name: path.basename(f) });
        arc.finalize();
    });
}

export async function processSingleVideo(jobId: string, video: VideoItem): Promise<void> {
    const job = getJob(jobId);
    if (!job) return;

    const jobDir = getJobDir(jobId);
    fs.mkdirSync(jobDir, { recursive: true });

    const audioPath = path.join(jobDir, `${video.s_id}.mp3`);
    const filename = safeFilename(video.title, video.s_id);
    const outputPath = path.join(jobDir, filename);

    try {
        updateVideo(jobId, video.s_id, { status: "processing", progress: 5 });

        await downloadAudio(video.s_id, audioPath);
        updateVideo(jobId, video.s_id, { progress: 15 });

        const [width, height] = job.format === "landscape" ? [1920, 1080] : [1080, 1920];
        const totalSecs = parseDurationSecs(video.duration);

        await runFfmpeg(
            job.coverImagePath,
            audioPath,
            outputPath,
            width,
            height,
            totalSecs,
            (pct) => updateVideo(jobId, video.s_id, { progress: pct }),
        );

        updateVideo(jobId, video.s_id, { status: "done", progress: 100, filename });
    } catch (err) {
        updateVideo(jobId, video.s_id, {
            status: "failed",
            error: err instanceof Error ? err.message : "Processing failed",
        });
    } finally {
        try { if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath); } catch { /* ignore */ }
    }
}

export async function processVideos(jobId: string): Promise<void> {
    const job = getJob(jobId);
    if (!job) return;

    const jobDir = getJobDir(jobId);
    fs.mkdirSync(jobDir, { recursive: true });

    for (const video of job.videos) {
        if (video.status !== "queued") continue;
        await processSingleVideo(jobId, video);
    }

    // Build ZIP from all successful videos
    const doneFiles = job.videos
        .filter(v => v.status === "done" && v.filename)
        .map(v => path.join(jobDir, v.filename!));

    if (doneFiles.length > 0) {
        const date = new Date().toISOString().slice(0, 10);
        const zipFilename = `sfx-videos-${date}.zip`;
        const zipPath = path.join(jobDir, zipFilename);
        try {
            await buildZip(doneFiles, zipPath);
            setZipReady(jobId, zipPath, zipFilename);
        } catch {
            // ZIP failed — still mark done so individual downloads work
            setZipReady(jobId, "", "");
        }
    } else {
        // All failed, no ZIP needed — mark complete
        setZipReady(jobId, "", "");
    }
}

export async function retryVideo(jobId: string, s_id: string): Promise<void> {
    const job = getJob(jobId);
    if (!job) return;
    const video = job.videos.find(v => v.s_id === s_id);
    if (!video || video.status !== "failed") return;

    // Reset status so processSingleVideo picks it up
    video.status = "queued";
    video.progress = 0;
    video.error = undefined;
    video.filename = undefined;

    await processSingleVideo(jobId, video);

    // Rebuild ZIP with any newly succeeded videos
    const jobDir = getJobDir(jobId);
    const doneFiles = job.videos
        .filter(v => v.status === "done" && v.filename)
        .map(v => path.join(jobDir, v.filename!));

    if (doneFiles.length > 0 && isJobComplete(job)) {
        const date = new Date().toISOString().slice(0, 10);
        const zipFilename = `sfx-videos-${date}.zip`;
        const zipPath = path.join(jobDir, zipFilename);
        try {
            await buildZip(doneFiles, zipPath);
            setZipReady(jobId, zipPath, zipFilename);
        } catch { /* ignore */ }
    }
}
