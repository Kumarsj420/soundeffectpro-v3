/**
 * POST /api/admin/import-url
 *
 * Body: { urls: string[] }
 * Fetches metadata for each URL using site-specific adapters.
 * Does NOT download audio; just returns preview metadata.
 *
 * POST /api/admin/import-url  (action: "save")
 * Body: { items: ImportItem[], globalId3: GlobalId3 }
 * Downloads audio, writes ID3 tags, uploads to R2, saves to DB as pending.
 */

import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import { fetchSoundMeta } from "@/app/lib/importAdapters";
import { uploadAudioToR2 } from "@/app/lib/r2/r2audioUpload";
import { syncSound } from "@/app/lib/meilisearch";
import { CATEGORIES, LICENSE_VALUES } from "@/app/lib/constants";
import type { License, Category } from "@/app/lib/constants";

const BTN_COLORS = ["0","20","125","145","195","225","255","280","305","335"] as const;

function randomBtnColor() {
    return BTN_COLORS[Math.floor(Math.random() * BTN_COLORS.length)];
}

function slugify(str: string): string {
    return str.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 80);
}

async function uniqueSlug(base: string): Promise<string> {
    let slug = base, n = 0;
    while (await File.exists({ slug })) slug = `${base}-${++n}`;
    return slug;
}

async function requireAdminOrMod() {
    const session = await auth();
    if (!session || !["admin", "moderator"].includes(session.user.role)) return null;
    return session;
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
    const session = await requireAdminOrMod();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();

    // ── Action: fetch metadata ────────────────────────────────────────────────
    if (!body.action || body.action === "fetch") {
        const urls: string[] = Array.isArray(body.urls) ? body.urls.slice(0, 30) : [];
        if (urls.length === 0) return Response.json({ error: "No URLs provided" }, { status: 400 });

        await connectDB();

        const results = await Promise.allSettled(
            urls.map(async (url) => {
                let parsedUrl: URL;
                try { parsedUrl = new URL(url); } catch {
                    return { url, status: "error", error: "Invalid URL" };
                }
                if (!["http:", "https:"].includes(parsedUrl.protocol)) {
                    return { url, status: "error", error: "Invalid URL protocol" };
                }

                try {
                    const meta = await fetchSoundMeta(url);
                    const duplicate = !!(await File.exists({ sourceUrl: url }));
                    return { url, status: "ok", ...meta, duplicate };
                } catch (err) {
                    return { url, status: "error", error: err instanceof Error ? err.message : "Fetch failed" };
                }
            })
        );

        return Response.json({
            results: results.map(r => r.status === "fulfilled" ? r.value : { url: "", status: "error", error: "Unknown" }),
        });
    }

    // ── Action: save ──────────────────────────────────────────────────────────
    if (body.action === "save") {
        interface ImportItem {
            url: string;
            audioUrl: string;
            title: string;
            tags: string[];
            category: string;
            license: string;
            description?: string;
        }
        interface GlobalId3 {
            artist?: string;
            copyright?: string;
            year?: string;
            genre?: string;
            thumbnailUrl?: string;
        }

        const items: ImportItem[] = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
        const globalId3: GlobalId3 = body.globalId3 ?? {};

        if (items.length === 0) return Response.json({ error: "No items" }, { status: 400 });

        await connectDB();

        // Fetch thumbnail buffer once for all items if provided
        let thumbBuffer: Buffer | null = null;
        if (globalId3.thumbnailUrl) {
            try {
                const tr = await fetch(globalId3.thumbnailUrl, { signal: AbortSignal.timeout(8_000) });
                if (tr.ok) thumbBuffer = Buffer.from(await tr.arrayBuffer());
            } catch { /* skip thumbnail */ }
        }

        const results = await Promise.allSettled(
            items.map(async (item) => {
                try {
                    // Validate fields
                    const title = item.title.trim().slice(0, 100);
                    if (title.length < 2) throw new Error("Title too short");

                    const category = CATEGORIES.includes(item.category as Category)
                        ? (item.category as Category) : "Random";
                    const license = LICENSE_VALUES.includes(item.license as License)
                        ? (item.license as License) : "unknown";
                    const tags = (Array.isArray(item.tags) ? item.tags : [])
                        .map(t => String(t).toLowerCase().trim().replace(/[^a-z0-9-]/g, "").slice(0, 15))
                        .filter(t => t.length > 0)
                        .slice(0, 10);

                    // Download audio
                    const audioResp = await fetch(item.audioUrl, { signal: AbortSignal.timeout(30_000) });
                    if (!audioResp.ok) throw new Error(`Audio download failed: ${audioResp.status}`);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    let audioBuffer: Buffer = Buffer.from(await audioResp.arrayBuffer() as any);

                    if (audioBuffer.length < 1000) throw new Error("Downloaded file too small");
                    if (audioBuffer.length > 50 * 1024 * 1024) throw new Error("Audio file too large (>50MB)");

                    // Compute duration
                    let duration = "00:30"; // safe fallback
                    try {
                        const { parseBuffer } = await import("music-metadata");
                        const meta = await parseBuffer(audioBuffer, "audio/mpeg");
                        if (meta.format.duration) {
                            duration = `${String(Math.floor(meta.format.duration / 60)).padStart(2, "0")}:${String(Math.floor(meta.format.duration % 60)).padStart(2, "0")}`;
                            // clamp to model validation pattern
                            const mins = Math.floor(meta.format.duration / 60);
                            const secs = Math.floor(meta.format.duration % 60);
                            if (mins <= 20) duration = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
                        }
                    } catch { /* keep fallback */ }

                    // Write ID3 tags
                    try {
                        const NodeID3 = (await import("node-id3")).default;
                        const id3Tags: Record<string, unknown> = {
                            title,
                            artist: globalId3.artist ?? "SoundEffectPro",
                            album: "SoundEffectPro",
                            year: globalId3.year ?? new Date().getFullYear().toString(),
                            genre: globalId3.genre ?? "Sound Effect",
                            copyright: globalId3.copyright ?? `© ${new Date().getFullYear()} SoundEffectPro`,
                            comment: { language: "eng", shortText: "", text: item.url },
                        };
                        if (thumbBuffer) {
                            id3Tags.image = {
                                type: { id: 3, name: "front cover" },
                                data: thumbBuffer,
                                description: "Cover",
                                mime: "image/jpeg",
                            };
                        }
                        const tagged = NodeID3.write(id3Tags, audioBuffer);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        if (tagged && Buffer.isBuffer(tagged)) audioBuffer = Buffer.from(tagged as any);
                    } catch { /* proceed without ID3 tags */ }

                    // Save to DB first to get s_id
                    const slug = await uniqueSlug(slugify(title));
                    const doc = await File.create({
                        title,
                        slug,
                        description: item.description?.slice(0, 600) ?? "",
                        duration,
                        tags,
                        category,
                        license,
                        btnColor: randomBtnColor(),
                        user: { uid: session.user.uid, name: session.user.name ?? "Admin" },
                        visibility: false,
                        moderationStatus: "pending",
                        sourceUrl: item.url,
                    });

                    const { s_id } = doc as unknown as { s_id: string };

                    // Upload to R2
                    try {
                        await uploadAudioToR2({ buffer: audioBuffer, s_id });
                    } catch (err) {
                        await File.findByIdAndDelete((doc as unknown as { _id: string })._id);
                        throw new Error(`R2 upload failed: ${err instanceof Error ? err.message : "unknown"}`);
                    }

                    syncSound({ s_id, slug, title, tags, category, license, duration, visibility: false }).catch(() => null);

                    return { url: item.url, status: "ok", s_id, slug, title };
                } catch (err) {
                    return { url: item.url, status: "error", error: err instanceof Error ? err.message : "Import failed" };
                }
            })
        );

        return Response.json({
            results: results.map(r => r.status === "fulfilled" ? r.value : { url: "", status: "error", error: "Unknown" }),
        });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
}
