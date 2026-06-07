import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import { parseSoundParam } from "@/app/lib/utils";
import DownloadCountdown from "./DownloadCountdown";

export const dynamic = "force-dynamic";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug: urlParam } = await params;
    const { s_id } = parseSoundParam(urlParam);
    try {
        await connectDB();
        const sound = await File.findOne({ s_id, visibility: true }).select("title").lean();
        if (!sound) return { title: "Download" };
        return { title: `Download ${sound.title}`, robots: { index: false, follow: false } };
    } catch {
        return { title: "Download" };
    }
}

export default async function DownloadPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug: urlParam } = await params;
    const { s_id, slug } = parseSoundParam(urlParam);

    await connectDB();

    const sound = await File.findOne({ s_id, visibility: true })
        .select("title slug s_id")
        .lean();

    if (!sound) notFound();

    const canonical  = `${sound.slug}-${sound.s_id}`;
    const audioUrl   = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/store/${sound.s_id}.mp3`;

    return (
        <div className="min-h-[60vh] mx-auto max-w-2xl px-4 py-10 flex flex-col gap-6">
            {/* Back link */}
            <Link
                href={`/sound/${canonical}`}
                className="text-sm text-white/40 hover:text-white transition-colors self-start"
            >
                ← Back to sound
            </Link>

            <DownloadCountdown
                slug={canonical}
                title={sound.title as string}
                audioUrl={audioUrl}
            />
        </div>
    );
}
