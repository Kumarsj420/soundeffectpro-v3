import type { NextAuthConfig } from "next-auth";

// Edge-safe config — no Node.js imports, no mongoose, no providers.
// Used only by middleware to validate the JWT session.
export const authConfig: NextAuthConfig = {
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

            // 301: old URL format /{slug}-{32-hex s_id}  →  /sound/{slug}
            const legacyMatch = pathname.match(/^\/([a-z0-9][a-z0-9-]*)-([0-9a-f]{32})$/);
            if (legacyMatch) {
                return Response.redirect(new URL(`/sound/${legacyMatch[1]}`, nextUrl), 301);
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
