import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { connectDB } from "@/app/lib/db";
import Soundboard from "@/app/lib/models/Soundboard";
import SbModel from "@/app/lib/models/Sb";
import { LayoutGrid, Music } from "lucide-react";

export const revalidate = 120;

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://soundeffectpro.com").replace(/\/$/, "");

export const metadata: Metadata = {
    title: "Soundboards — Browse Community Soundboards",
    description: "Browse community-created soundboards on SoundEffectPro. Discover curated collections of meme sounds, gaming audio, anime clips, and more.",
    alternates: { canonical: `${BASE}/soundboards` },
    openGraph: {
        title: "Soundboards — SoundEffectPro",
        description: "Browse community soundboards — curated meme, gaming, and anime sound collections.",
        url: `${BASE}/soundboards`,
    },
};

async function getBoards() {
    try {
        await connectDB();

        // Only public boards with a thumbnail
        const boards = await Soundboard.find({
            isPublic:  true,
            thumbnail: { $exists: true, $nin: ["", null] },
        })
            .sort({ createdAt: -1 })
            .limit(60)
            .select("sbId name thumbnail createdAt")
            .lean();

        if (!boards.length) return [];

        // Get sound counts from Sb collection
        const sbIds = boards.map(b => b.sbId);
        const counts = await SbModel.aggregate([
            { $match: { sb_id: { $in: sbIds } } },
            { $group: { _id: "$sb_id", count: { $sum: 1 } } },
        ]);

        const countMap = new Map(counts.map(c => [c._id, c.count as number]));

        // Only boards that actually have sounds
        return boards
            .map(b => ({ ...b, soundCount: countMap.get(b.sbId) ?? 0 }))
            .filter(b => b.soundCount > 0);
    } catch {
        return [];
    }
}

export default async function SoundboardsPage() {
    const boards = await getBoards();

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <LayoutGrid className="h-7 w-7 text-orange-400" />
                    <h1 className="text-3xl font-bold">Soundboards</h1>
                </div>
                <p className="text-white/40 text-sm">
                    Community-created sound collections — {boards.length} available
                </p>
            </div>

            {boards.length === 0 ? (
                <div className="text-center py-24 space-y-3">
                    <LayoutGrid className="h-12 w-12 mx-auto text-white/10" />
                    <p className="text-white/30">No public soundboards yet.</p>
                    <Link href="/my/soundboards" className="text-orange-400 hover:text-orange-300 text-sm transition-colors">
                        Create yours →
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {boards.map(b => (
                        <Link
                            key={b.sbId}
                            href={`/soundboard/${b.sbId}`}
                            className="group rounded-2xl border border-white/8 bg-[#111113] overflow-hidden hover:border-white/16 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 transition-all duration-200"
                        >
                            {/* Thumbnail */}
                            <div className="relative aspect-video bg-white/4 overflow-hidden">
                                <Image
                                    src={b.thumbnail}
                                    alt={b.name}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                />
                                {/* Sound count badge */}
                                <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/70 backdrop-blur-sm px-2 py-0.5 text-xs text-white/80">
                                    <Music className="h-3 w-3" />
                                    {b.soundCount}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-3">
                                <p className="font-semibold text-sm text-white truncate group-hover:text-orange-400 transition-colors">
                                    {b.name}
                                </p>
                                <p className="text-xs text-white/35 mt-0.5">
                                    {b.soundCount} sound{b.soundCount !== 1 ? "s" : ""}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
