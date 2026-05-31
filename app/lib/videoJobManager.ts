import path from "path";
import os from "os";

export type VideoStatus = "queued" | "processing" | "done" | "failed";

export interface VideoItem {
    s_id: string;
    title: string;
    duration: string;
    status: VideoStatus;
    progress: number;
    error?: string;
    filename?: string;
}

export interface VideoJob {
    jobId: string;
    format: "landscape" | "portrait";
    coverImagePath: string;
    videos: VideoItem[];
    createdAt: number;
    zipReady: boolean;
    zipPath?: string;
    zipFilename?: string;
}

type EventCallback = (event: Record<string, unknown>) => void;

const jobs = new Map<string, VideoJob>();
const listeners = new Map<string, Set<EventCallback>>();

const JOB_TTL_MS = 60 * 60 * 1000; // 1 hour

export function createJob(job: VideoJob): void {
    jobs.set(job.jobId, job);
    listeners.set(job.jobId, new Set());
    setTimeout(() => cleanupJob(job.jobId), JOB_TTL_MS);
}

export function getJob(jobId: string): VideoJob | undefined {
    return jobs.get(jobId);
}

export function getJobDir(jobId: string): string {
    return path.join(os.tmpdir(), "sfx-videos", jobId);
}

export function updateVideo(jobId: string, s_id: string, updates: Partial<VideoItem>): void {
    const job = jobs.get(jobId);
    if (!job) return;
    const video = job.videos.find(v => v.s_id === s_id);
    if (!video) return;
    Object.assign(video, updates);
    emit(jobId, { type: "video_update", s_id, ...updates });
}

export function setZipReady(jobId: string, zipPath: string, zipFilename: string): void {
    const job = jobs.get(jobId);
    if (!job) return;
    job.zipReady = true;
    job.zipPath = zipPath;
    job.zipFilename = zipFilename;
    emit(jobId, { type: "zip_ready", zipFilename });
}

export function isJobComplete(job: VideoJob): boolean {
    const allSettled = job.videos.every(v => v.status === "done" || v.status === "failed");
    if (!allSettled) return false;
    const hasSuccess = job.videos.some(v => v.status === "done");
    return hasSuccess ? job.zipReady : true;
}

export function emit(jobId: string, event: Record<string, unknown>): void {
    listeners.get(jobId)?.forEach(fn => {
        try { fn(event); } catch { /* listener gone */ }
    });
}

export function subscribe(jobId: string, fn: EventCallback): () => void {
    if (!listeners.has(jobId)) listeners.set(jobId, new Set());
    listeners.get(jobId)!.add(fn);
    return () => listeners.get(jobId)?.delete(fn);
}

function cleanupJob(jobId: string): void {
    const job = jobs.get(jobId);
    if (job) {
        try {
            const { rmSync } = require("fs") as typeof import("fs");
            rmSync(getJobDir(jobId), { recursive: true, force: true });
        } catch { /* ignore */ }
    }
    jobs.delete(jobId);
    listeners.delete(jobId);
}
