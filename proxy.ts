import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Next.js 16 renamed "middleware" to "proxy".
// Auth.js v5 authorized() callback in auth.config.ts handles route protection.
const { auth } = NextAuth(authConfig);

export const proxy = auth;

export const config = {
    // Skip Next.js internals, static files, and all public assets
    matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|mp3|wav|ogg|woff2?|css|js)$).*)"],
};
