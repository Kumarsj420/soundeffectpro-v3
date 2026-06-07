import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import { parseSoundParam } from "@/app/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug: urlParam } = await params;
    const { s_id } = parseSoundParam(urlParam);

    const { searchParams } = new URL(request.url);
    const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const category = searchParams.get("category") ?? "";
    const tags     = searchParams.get("tags")?.split(",").filter(Boolean) ?? [];
    const limit    = 9;
    const skip     = (page - 1) * limit;

    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {
        visibility: true,
        ...(s_id ? { s_id: { $ne: s_id } } : {}),
        $or: [
            { category },
            { tags: { $in: tags.slice(0, 3) } },
        ],
    };

    const [docs, total] = await Promise.all([
        File.find(filter)
            .sort({ "stats.views": -1 })
            .skip(skip)
            .limit(limit)
            .select("s_id slug title duration tags category btnColor stats")
            .lean(),
        File.countDocuments(filter),
    ]);

    const sounds = docs.map(d => {
        const stats = (d.stats as unknown as Record<string, number>) ?? {};
        return {
            s_id:     d.s_id,
            slug:     d.slug,
            title:    d.title,
            duration: d.duration,
            tags:     (d.tags as string[]) ?? [],
            category: (d.category as string) ?? "Random",
            btnColor: (d.btnColor as string) ?? "0",
            stats: {
                views:     stats.views     ?? 0,
                downloads: stats.downloads ?? 0,
                likes:     stats.likes     ?? 0,
            },
        };
    });

    return NextResponse.json({ sounds, total, page, pages: Math.ceil(total / limit) });
}
