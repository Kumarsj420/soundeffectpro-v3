import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import EmbedPlayer from "./EmbedPlayer";

export const revalidate = 3600;

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://soundeffectpro.com").replace(/\/$/, "");

export async function generateMetadata({
    params,
}: {
    params: Promise<{ s_id: string }>;
}): Promise<Metadata> {
    const { s_id } = await params;
    try {
        await connectDB();
        const sound = await File.findOne({ s_id, visibility: true }).select("title").lean();
        if (!sound) return { title: "Sound" };
        return { title: `${sound.title} — SoundEffectPro` };
    } catch {
        return { title: "Sound" };
    }
}

export default async function EmbedPage({
    params,
}: {
    params: Promise<{ s_id: string }>;
}) {
    const { s_id } = await params;

    try { await connectDB(); } catch { notFound(); }

    const sound = await File.findOne({ s_id, visibility: true })
        .select("s_id slug title duration category btnColor")
        .lean();

    if (!sound) notFound();

    const canonicalUrl = `${BASE}/sound/${sound.slug}-${sound.s_id}`;

    return (
        <html lang="en">
            <body style={{ margin: 0, background: "transparent" }}>
                <EmbedPlayer
                    s_id={sound.s_id}
                    slug={`${sound.slug}-${sound.s_id}`}
                    title={sound.title}
                    duration={sound.duration}
                    btnColor={(sound.btnColor as string) ?? "0"}
                    category={sound.category}
                    canonicalUrl={canonicalUrl}
                />
            </body>
        </html>
    );
}
