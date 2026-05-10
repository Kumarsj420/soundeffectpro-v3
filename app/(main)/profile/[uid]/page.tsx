import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { connectDB } from "@/app/lib/db";
import User from "@/app/lib/models/User";
import File from "@/app/lib/models/File";
import SoundCard from "@/app/components/SoundCard";

export const revalidate = 120;
export const dynamicParams = true;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ uid: string }>;
}): Promise<Metadata> {
    const { uid } = await params;
    await connectDB();
    const user = await User.findOne({ uid }).select('name').lean();
    if (!user) return { title: "User Not Found" };

    return {
        title: `${user.name ?? 'User'}'s Profile`,
        description: `Listen to ${user.name ?? 'this user'}'s uploaded sound effects on SoundEffectPro.`,
        alternates: { canonical: `/profile/${uid}` },
        robots: { index: true, follow: true },
    };
}

function toPlainSound(doc: Record<string, unknown>) {
    const stats = doc.stats as Record<string, number> ?? {};
    return {
        s_id: doc.s_id as string,
        slug: doc.slug as string,
        title: doc.title as string,
        duration: doc.duration as string,
        tags: (doc.tags as string[]) ?? [],
        category: doc.category as string,
        btnColor: (doc.btnColor as string) ?? '0',
        stats: { views: stats.views ?? 0, downloads: stats.downloads ?? 0, likes: stats.likes ?? 0 },
    };
}

export default async function ProfilePage({
    params,
}: {
    params: Promise<{ uid: string }>;
}) {
    const { uid } = await params;
    await connectDB();

    const [user, uploads] = await Promise.all([
        User.findOne({ uid }).select('uid name image provider uploadCount favCount createdAt').lean(),
        File.find({ 'user.uid': uid, visibility: true })
            .sort({ createdAt: -1 })
            .limit(24)
            .select('s_id slug title duration tags category btnColor stats')
            .lean(),
    ]);

    if (!user) notFound();

    const totalPlays = uploads.reduce((sum, s) => sum + ((s.stats as unknown as Record<string, number>)?.views ?? 0), 0);

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            {/* Profile header */}
            <div className="flex items-start gap-5 mb-8 p-6 rounded-2xl border border-white/10 bg-[#141414]">
                {user.image ? (
                    <Image
                        src={user.image}
                        alt={user.name ?? 'User'}
                        width={80}
                        height={80}
                        className="rounded-full object-cover shrink-0"
                    />
                ) : (
                    <div className="h-20 w-20 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-3xl font-bold shrink-0">
                        {(user.name ?? 'U')[0].toUpperCase()}
                    </div>
                )}

                <div className="flex-1">
                    <h1 className="text-2xl font-bold mb-1">{user.name ?? 'Unknown User'}</h1>
                    <p className="text-sm text-white/40 mb-3">
                        Member since {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                        {user.provider && <span className="ml-2 capitalize">· via {user.provider}</span>}
                    </p>
                    <div className="flex gap-6 text-sm">
                        <div>
                            <p className="font-bold text-lg">{uploads.length}</p>
                            <p className="text-white/40">Uploads</p>
                        </div>
                        <div>
                            <p className="font-bold text-lg">{totalPlays.toLocaleString()}</p>
                            <p className="text-white/40">Total Plays</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sounds */}
            <div>
                <h2 className="text-xl font-bold mb-4">Uploaded Sounds</h2>
                {uploads.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {uploads.map((s) => (
                            <SoundCard key={(s as { s_id: string }).s_id} {...toPlainSound(s as unknown as Record<string, unknown>)} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 text-white/30">
                        <p className="text-xl mb-2">No sounds yet</p>
                        <p className="text-sm">This user hasn't uploaded any sounds.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
