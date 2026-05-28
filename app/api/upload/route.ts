import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import { CATEGORIES } from "@/app/lib/constants";
import User from "@/app/lib/models/User";
import { uploadAudioToR2 } from "@/app/lib/r2/r2audioUpload";
import { auth } from "@/auth";
import { containsBannedWord } from "@/app/lib/bannedWords";
import { syncSound } from "@/app/lib/meilisearch";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm"];

function slugify(str: string): string {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s]+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80);
}

async function uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let attempt = 0;
    while (await File.exists({ slug })) {
        attempt++;
        slug = `${base}-${attempt}`;
    }
    return slug;
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.uid || !session.user.email) {
            return Response.json({ error: "Sign in required" }, { status: 401 });
        }

        const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
        if (contentLength > MAX_SIZE_BYTES) {
            return Response.json({ error: "File too large. Max 10 MB." }, { status: 413 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const title = (formData.get("title") as string | null)?.trim();
        const description = (formData.get("description") as string | null)?.trim() ?? "";
        const category = (formData.get("category") as string | null) ?? "Random";
        const tagsRaw = (formData.get("tags") as string | null) ?? "";
        const duration = (formData.get("duration") as string | null)?.trim() ?? "00:00";

        // --- Validation ---
        if (!file || !file.size) return Response.json({ error: "No file uploaded" }, { status: 400 });
        if (file.size > MAX_SIZE_BYTES) return Response.json({ error: "File too large. Max 10 MB." }, { status: 413 });
        if (!ALLOWED_MIME.includes(file.type) && !file.name.endsWith(".mp3")) {
            return Response.json({ error: "Only MP3, WAV, OGG, or WebM audio files are allowed." }, { status: 400 });
        }
        if (!title || title.length < 3 || title.length > 100) {
            return Response.json({ error: "Title must be 3–100 characters." }, { status: 400 });
        }
        if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
            return Response.json({ error: "Invalid category." }, { status: 400 });
        }
        if (!/^(0[0-9]|1[0-9]|20):[0-5][0-9]$|^02:00$/.test(duration)) {
            return Response.json({ error: "Invalid duration format. Use MM:SS." }, { status: 400 });
        }

        const tags = tagsRaw
            .split(/[,\s]+/)
            .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))
            .filter((t) => t.length > 0 && t.length <= 15)
            .slice(0, 10);

        // --- Moderation ---
        // Check title, description and tags against the centralised banned-words list.
        // This catches leet-speak obfuscation (n1gger, f4ggot, etc.) automatically.
        const textToCheck = `${title} ${description} ${tags.join(' ')}`;
        if (containsBannedWord(textToCheck)) {
            return Response.json({ error: "Content violates community guidelines." }, { status: 422 });
        }

        await connectDB();


        const dbUser = await User.findOne({ email: session.user.email }).select('uid name').lean();
        if (!dbUser) return Response.json({ error: "User not found" }, { status: 404 });

        // Convert to Buffer and upload to R2
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Create file record first to get s_id
        const baseSlug = slugify(title);
        const slug = await uniqueSlug(baseSlug);

        const created = await File.create({
            title,
            slug,
            description,
            duration,
            tags,
            category: category as (typeof CATEGORIES)[number],
            user: { uid: dbUser.uid, name: dbUser.name ?? session.user.name ?? 'Unknown' },
            visibility: true,
            moderationStatus: 'approved',
        });

        const newFile = created as unknown as { s_id: string; slug: string; _id: string };

        // Upload audio
        try {
            await uploadAudioToR2({ buffer, s_id: newFile.s_id });
        } catch {
            await File.findByIdAndDelete(newFile._id);
            return Response.json({ error: "Failed to upload audio file. Please try again." }, { status: 500 });
        }

        // Increment user upload count
        await User.updateOne({ email: session.user.email }, { $inc: { uploadCount: 1 } });

        // Sync to Meilisearch (fire-and-forget — don't block response)
        syncSound({
            s_id: newFile.s_id, slug: newFile.slug, title,
            tags, category, duration, visibility: true,
        }).catch(() => null);

        return Response.json({
            ok: true,
            message: "Sound uploaded successfully! It will be reviewed and published shortly.",
            slug: newFile.slug,
        });

    } catch (err) {
        console.error("Upload error:", err);
        return Response.json({ error: "Upload failed. Please try again." }, { status: 500 });
    }
}
