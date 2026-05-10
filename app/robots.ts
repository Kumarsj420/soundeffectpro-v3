import type { MetadataRoute } from "next";

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://soundeffectpro.com").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: ["/admin", "/api/", "/upload", "/login", "/page/"],
            },
        ],
        sitemap: `${BASE}/sitemap.xml`,
        host: BASE,
    };
}
