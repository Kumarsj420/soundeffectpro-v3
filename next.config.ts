import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "cdn.discordapp.com" },
            { protocol: "https", hostname: "avatars.githubusercontent.com" },
            { protocol: "https", hostname: "lh3.googleusercontent.com" },
            { protocol: "https", hostname: "static-cdn.jtvnw.net" },
        ],
    },
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
    async redirects() {
        return [
            // Old search URL format: /search/charlie → /search?q=charlie
            { source: '/search/:query', destination: '/search?q=:query', permanent: true },
            // Old tag URL format: /tag/meme → /search?q=meme
            { source: '/tag/:tag',      destination: '/search?q=:tag',   permanent: true },
        ];
    },

    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    { key: "X-Frame-Options",             value: "SAMEORIGIN" },
                    { key: "X-Content-Type-Options",      value: "nosniff" },
                    { key: "Referrer-Policy",             value: "strict-origin-when-cross-origin" },
                    { key: "Permissions-Policy",          value: "camera=(), microphone=(), geolocation=()" },
                    { key: "X-DNS-Prefetch-Control",      value: "on" },
                    { key: "Strict-Transport-Security",   value: "max-age=63072000; includeSubDomains; preload" },
                    { key: "Cross-Origin-Opener-Policy",  value: "same-origin" },
                ],
            },
            {
                // Immutable cache for versioned static assets
                source: "/_next/static/(.*)",
                headers: [
                    { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
                ],
            },
            {
                // Long cache for public images (sprite sheets etc.)
                source: "/(btns|licon)\\.(avif|webp|png)",
                headers: [
                    { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" },
                ],
            },
        ];
    },
};

export default nextConfig;
