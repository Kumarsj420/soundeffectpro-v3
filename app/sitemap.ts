import type { MetadataRoute } from "next";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://soundeffectpro.com").replace(/\/$/, "");

const CATEGORIES = ['meme', 'anime', 'gaming', 'music', 'movies', 'sports', 'series', 'politics', 'comedy', 'random'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    let sounds: { slug: string; s_id: string; updatedAt: Date }[] = [];
    try {
        await connectDB();
        sounds = await File.find({ visibility: true })
            .sort({ 'stats.views': -1 })
            .select('slug s_id updatedAt')
            .limit(50000)
            .lean() as { slug: string; s_id: string; updatedAt: Date }[];
    } catch {
        // Return static pages only if DB unreachable
    }

    const staticUrls: MetadataRoute.Sitemap = [
        { url: BASE,                            lastModified: new Date(), changeFrequency: 'hourly',  priority: 1.0 },
        { url: `${BASE}/search`,                lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.6 },
        { url: `${BASE}/contact`,               lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
        { url: `${BASE}/privacy`,               lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
        { url: `${BASE}/terms`,                 lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
        { url: `${BASE}/dmca`,                  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
        { url: `${BASE}/content-policy`,        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    ];

    const categoryUrls: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
        url: `${BASE}/sounds/${cat}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
    }));

    const soundUrls: MetadataRoute.Sitemap = sounds.map((s) => ({
        url: `${BASE}/sound/${s.slug}-${s.s_id}`,
        lastModified: s.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
    }));

    return [...staticUrls, ...categoryUrls, ...soundUrls];
}
