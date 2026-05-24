import type { NextAuthConfig } from "next-auth";

// Edge-safe config — no Node.js imports, no mongoose, no providers.
// Used only by middleware to validate the JWT session.
export const authConfig: NextAuthConfig = {
    trustHost: true,
    pages: {
        signIn: "/login",
        error: "/login",
    },
    session: { strategy: "jwt" },
    providers: [],
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const { pathname } = nextUrl;

            // 301: old v2 URL /{slug}-{32-hex s_id}  →  /sound/{slug}
            const v2Match = pathname.match(/^\/([a-z0-9][a-z0-9-]*)-([0-9a-f]{32})$/);
            if (v2Match) {
                return Response.redirect(new URL(`/sound/${v2Match[1]}`, nextUrl), 301);
            }

            // 301: old v1 URL /{slug}-{4-6 lowercase letter s_id}  →  /sound/{slug}
            // e.g. /ahh-its-comming-out-zqlmx → /sound/ahh-its-comming-out
            // Exclude real hyphenated routes like /content-policy
            const REAL_HYPHENATED = new Set(["/content-policy"]);
            const v1Match = !REAL_HYPHENATED.has(pathname) &&
                pathname.match(/^\/([a-z][a-z0-9]*(?:-[a-z0-9]+){1,})-([a-z]{4,6})$/);
            if (v1Match) {
                return Response.redirect(new URL(`/sound/${v1Match[1]}`, nextUrl), 301);
            }

            const protectedPaths = ["/upload", "/profile"];
            const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

            if (isProtected && !isLoggedIn) {
                return Response.redirect(new URL("/login", nextUrl));
            }

            if (pathname === "/login" && isLoggedIn) {
                return Response.redirect(new URL("/", nextUrl));
            }

            return true;
        },
    },
};
