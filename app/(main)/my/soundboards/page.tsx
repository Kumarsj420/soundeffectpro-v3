import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Metadata } from "next";
import MySoundboards from "./MySoundboards";

export const metadata: Metadata = {
    title: "My Soundboards — SoundEffectPro",
    robots: { index: false, follow: false },
};

export default async function MySoundboardsPage() {
    const session = await auth();
    if (!session) redirect("/login");
    return (
        <div className="mx-auto max-w-5xl px-4 py-8">
            <MySoundboards />
        </div>
    );
}
