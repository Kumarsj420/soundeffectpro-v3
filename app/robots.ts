import type { MetadataRoute } from "next";

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://soundeffectpro.com").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: [
                    "/admin",
                    "/api/",
                    "/upload",
                    "/login",
                    "/page/",
                    // Search query URLs have no SEO value and can expose user-typed
                    // content (including slurs) to crawlers — block all of them.
                    "/search",
                ],
            },
        ],
        sitemap: `${BASE}/sitemap.xml`,
        host: BASE,
    };
}
