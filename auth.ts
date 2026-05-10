import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import Twitch from "next-auth/providers/twitch";
import { connectDB } from "@/app/lib/db";
import User from "@/app/lib/models/User";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    secret: process.env.NEXTAUTH_SECRET,
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        Discord({
            clientId: process.env.DISCORD_CLIENT_ID!,
            clientSecret: process.env.DISCORD_CLIENT_SECRET!,
        }),
        Twitch({
            clientId: process.env.TWITCH_CLIENT_ID!,
            clientSecret: process.env.TWITCH_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (!user.email) return false;

            try {
                await connectDB();
                await User.findOneAndUpdate(
                    { email: user.email.toLowerCase() },
                    {
                        $setOnInsert: { email: user.email.toLowerCase() },
                        $set: {
                            name: user.name ?? undefined,
                            image: user.image ?? null,
                            provider: account?.provider ?? null,
                            emailVerified: new Date(),
                        },
                    },
                    { upsert: true, new: true }
                );
            } catch {
                return false;
            }

            return true;
        },

        async jwt({ token, trigger }) {
            // Fetch DB user on sign-in or on session update
            if (token.email && (trigger === "signIn" || trigger === "update" || !token.uid)) {
                try {
                    await connectDB();
                    const dbUser = await User.findOne(
                        { email: token.email },
                        { uid: 1, role: 1 }
                    ).lean();

                    if (dbUser) {
                        token.uid = dbUser.uid;
                        token.role = dbUser.role;
                    }
                } catch {
                    // keep existing token data on DB error
                }
            }
            return token;
        },

        async session({ session, token }) {
            if (token) {
                session.user.uid = token.uid as string;
                session.user.role = (token.role as string) ?? "user";
            }
            return session;
        },
    },
});
