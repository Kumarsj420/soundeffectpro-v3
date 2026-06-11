import type { Metadata } from "next";
import { connectDB } from "@/app/lib/db";
import Board from "@/app/lib/models/Board";
import SbModel from "@/app/lib/models/Sb";
import { LayoutGrid } from "lucide-react";
import SoundboardGrid from "./SoundboardGrid";

export const revalidate = 120;

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://soundeffectpro.com").replace(/\/$/, "");

export const metadata: Metadata = {
    title: "Soundboards — Browse Community Soundboards",
    description: "Browse community-created soundboards on SoundEffectPro. Discover curated collections of meme sounds, gaming audio, anime clips, and more.",
    alternates: { canonical: `${BASE}/soundboard` },
    openGraph: {
        title: "Soundboards — SoundEffectPro",
        description: "Browse community soundboards — curated meme, gaming, and anime sound collections.",
        url: `${BASE}/soundboard`,
    },
};

const PAGE_SIZE = 12;

function isValidUrl(str: string) {
    try { return Boolean(new URL(str)); } catch { return false; }
}

async function getFirstPage() {
    try {
        await connectDB();

        const raw = await Board.find({
            visibility: true,
            thumb:      { $exists: true, $nin: ["", null] },
        })
            .sort({ createdAt: -1 })
            .limit(PAGE_SIZE + 1)
            .select("sb_id name thumb user createdAt")
            .lean();

        const hasMore = raw.length > PAGE_SIZE;
        const boards  = raw.slice(0, PAGE_SIZE).filter(b => isValidUrl(b.thumb ?? ""));

        if (!boards.length) return { boards: [], hasMore: false, total: 0 };

        const sbIds  = boards.map(b => b.sb_id);
        const counts = await SbModel.aggregate([
            { $match: { sb_id: { $in: sbIds } } },
            { $group: { _id: "$sb_id", count: { $sum: 1 } } },
        ]);
        const countMap = new Map(counts.map(c => [c._id, c.count as number]));

        const total = await Board.countDocuments({
            visibility: true,
            thumb:      { $exists: true, $nin: ["", null] },
        });

        const result = boards
            .map(b => ({
                sb_id:      b.sb_id,
                name:       b.name,
                thumb:      b.thumb as string,
                soundCount: countMap.get(b.sb_id) ?? 0,
                userName:   b.user?.name ?? "",
            }))
            .filter(b => b.soundCount > 0);

        return { boards: result, hasMore: hasMore && result.length === PAGE_SIZE, total };
    } catch {
        return { boards: [], hasMore: false, total: 0 };
    }
}

export default async function SoundboardBrowsePage() {
    const { boards, hasMore, total } = await getFirstPage();

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <LayoutGrid className="h-7 w-7 text-orange-400" />
                    <h1 className="text-3xl font-bold">Soundboards</h1>
                </div>
                <p className="text-white/40 text-sm">
                    Community-created sound collections — {total.toLocaleString()} available
                </p>
            </div>

            <SoundboardGrid initial={boards} initialHasMore={hasMore} />
        </div>
    );
}
