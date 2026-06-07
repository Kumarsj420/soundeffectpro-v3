import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const sort     = searchParams.get("sort") ?? "popular";
    const category = searchParams.get("category") ?? "";
    const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit    = Math.min(48, parseInt(searchParams.get("limit") ?? "12", 10));
    const skip     = (page - 1) * limit;

    const sortMap: Record<string, Record<string, 1 | -1>> = {
        popular:   { "stats.views": -1 },
        newest:    { createdAt: -1 },
        downloads: { "stats.downloads": -1 },
    };
    const sortQuery = sortMap[sort] ?? sortMap.popular;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = { visibility: true };
    if (category) filter.category = category;

    await connectDB();

    const [docs, total] = await Promise.all([
        File.find(filter)
            .sort(sortQuery)
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
