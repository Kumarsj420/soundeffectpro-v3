"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export default function SessionProvider({ children }: { children: React.ReactNode }) {
    // /api/auth/session is per-user and can't be edge-cached, so every fetch hits
    // the origin. Disable the refetch-on-focus so tabbing back doesn't re-hit it.
    return (
        <NextAuthSessionProvider refetchOnWindowFocus={false}>
            {children}
        </NextAuthSessionProvider>
    );
}
