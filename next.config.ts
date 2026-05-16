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
            // ── Old search / tag ───────────────────────────────────────────────
            { source: '/search/:query', destination: '/search?q=:query', permanent: true },
            { source: '/tag/:tag',      destination: '/search?q=:tag',   permanent: true },

            // ── Old category pages (/category/meme → /sounds/meme) ────────────
            { source: '/category/:slug', destination: '/sounds/:slug', permanent: true },

            // ── Old user pages (/user/:uid → /profile/:uid) ───────────────────
            { source: '/user/:uid', destination: '/profile/:uid', permanent: true },

            // ── Old /page/* legal routes ──────────────────────────────────────
            { source: '/page/privacy-policy',       destination: '/privacy',        permanent: true },
            { source: '/page/terms-conditions',     destination: '/terms',          permanent: true },
            { source: '/page/dmca-copyright',       destination: '/dmca',           permanent: true },
            { source: '/page/community-guidelines', destination: '/content-policy', permanent: true },
            { source: '/page/cookie-policy',        destination: '/privacy',        permanent: true },
            { source: '/page/:path*',               destination: '/',               permanent: true },

            // ── Old core / filter pages ───────────────────────────────────────
            { source: '/popular',               destination: '/', permanent: true },
            { source: '/recent-buttons',        destination: '/', permanent: true },
            { source: '/most-viewed',           destination: '/', permanent: true },
            { source: '/filter-buttons',        destination: '/', permanent: true },
            { source: '/soundboard',            destination: '/', permanent: true },
            { source: '/soundboard/:path*',     destination: '/', permanent: true },
            { source: '/filter-board',          destination: '/', permanent: true },
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
