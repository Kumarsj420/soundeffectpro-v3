import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Next.js 16 renamed "middleware" to "proxy".
const { auth } = NextAuth(authConfig);

// Only these paths need the session JWT decoded/verified. Every other path
// (the vast majority of traffic — /sound/*, /sounds/*, /, /soundboard, /search)
// used to pay that crypto cost on every single request via the old
// `export const proxy = auth` auto-wrapping pattern, which decodes the JWT
// unconditionally before the authorized() callback ever runs. That was a
// meaningful chunk of Fluid Active CPU given request volume.
const AUTH_GATED_PATHS = ["/upload", "/profile", "/login"];

const REAL_HYPHENATED = new Set(["/content-policy"]);

export async function proxy(req: NextRequest, event: NextFetchEvent) {
    const { pathname } = req.nextUrl;

    // ── Legacy URL redirects — plain regex, no auth needed ────────────────────
    // 301: old v2 URL /{slug}-{32-hex s_id}  →  /sound/{slug}-{s_id}
    const v2Match = pathname.match(/^\/([a-z0-9][a-z0-9-]*)-([0-9a-f]{32})$/);
    if (v2Match) {
        return NextResponse.redirect(new URL(`/sound/${v2Match[1]}-${v2Match[2]}`, req.nextUrl), 301);
    }

    // 301: old v1 URL /{slug}-{4-6 alphanumeric s_id}  →  /sound/{slug}-{s_id}
    const v1Match = !REAL_HYPHENATED.has(pathname) &&
        pathname.match(/^\/([a-z][a-z0-9]*(?:-[a-z0-9]+)*)-([a-z0-9]{4,6})$/);
    if (v1Match) {
        return NextResponse.redirect(new URL(`/sound/${v1Match[1]}-${v1Match[2]}`, req.nextUrl), 301);
    }

    // ── Only decode the session JWT for paths that actually gate on it ────────
    const needsAuth = AUTH_GATED_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`));
    if (!needsAuth) return NextResponse.next();

    // next-auth types `auth`'s overloads as a union-of-tuples rest parameter,
    // which TS can't cleanly discriminate for the (request, event) call form —
    // this is the documented pattern for reading the session without the
    // auto-wrapping HOF behavior.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await (auth as any)(req, event);
    const isLoggedIn = !!session?.user;

    const isProtected = pathname.startsWith("/upload") || pathname.startsWith("/profile");
    if (isProtected && !isLoggedIn) {
        return NextResponse.redirect(new URL("/login", req.nextUrl));
    }

    if (pathname === "/login" && isLoggedIn) {
        return NextResponse.redirect(new URL("/", req.nextUrl));
    }

    return NextResponse.next();
}

export const config = {
    // Skip Next.js internals, static files, and all public assets
    matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|mp3|wav|ogg|woff2?|css|js)$).*)"],
};
