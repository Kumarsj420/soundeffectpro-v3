import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import UploadForm from "@/app/components/UploadForm";

export const metadata: Metadata = {
    title: "Upload Sound Effect",
    description: "Upload your meme sound effects and viral audio clips to SoundEffectPro.",
    robots: { index: false, follow: false },
};

export default async function UploadPage() {
    const session = await auth();
    if (!session) redirect("/login");

    return (
        <div className="mx-auto max-w-2xl px-4 py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Upload a Sound Effect</h1>
                <p className="text-white/50">
                    Share your sounds with the community. Approved sounds go live instantly.
                </p>
            </div>

            <UploadForm userName={session.user.name ?? "User"} />

            <div className="mt-8 rounded-2xl border border-white/8 bg-[#141414] p-5 text-sm text-white/50 space-y-2">
                <p className="font-semibold text-white/70">Upload Guidelines</p>
                <ul className="space-y-1 list-disc list-inside">
                    <li>MP3, WAV, OGG, or WebM format only</li>
                    <li>Maximum file size: 10 MB</li>
                    <li>Maximum duration: 20 minutes</li>
                    <li>No hate speech, explicit sexual content, or harassment</li>
                    <li>Respect copyright — only upload sounds you own or have rights to</li>
                    <li>Sounds go live instantly after upload</li>
                </ul>
            </div>
        </div>
    );
}
