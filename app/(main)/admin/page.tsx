import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import Report from "@/app/lib/models/Report";
import Message from "@/app/lib/models/Message";
import ModerationQueue from "@/app/components/ModerationQueue";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Moderation Queue",
    robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
    // Auth is handled by admin/layout.tsx — no duplicate check needed here
    await connectDB();

    const [pendingSounds, unreadReports, unreadMessages] = await Promise.all([
        File.find({ moderationStatus: 'pending' })
            .sort({ createdAt: -1 })
            .limit(50)
            .select('s_id slug title category duration tags description user createdAt moderationStatus visibility')
            .lean(),

        Report.find({ read: false })
            .sort({ createdAt: -1 })
            .limit(30)
            .lean(),

        Message.find({ read: false })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean(),
    ]);

    const sounds = pendingSounds.map((s) => ({
        _id: String(s._id),
        s_id: s.s_id,
        slug: s.slug,
        title: s.title,
        category: s.category,
        duration: s.duration,
        tags: s.tags,
        description: s.description ?? '',
        user: s.user as { uid: string; name: string },
        createdAt: s.createdAt.toISOString(),
        moderationStatus: s.moderationStatus,
    }));

    const reports = unreadReports.map((r) => ({
        _id: String(r._id),
        senderEmail: r.senderEmail,
        type: r.type,
        target: r.target,
        content: r.content,
        createdAt: (r.createdAt as Date).toISOString(),
    }));

    return (
        <>
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Moderation Queue</h1>
                    <p className="text-white/40 text-sm mt-1">
                        {sounds.length} pending sounds · {reports.length} unread reports · {unreadMessages.length} unread messages
                    </p>
                </div>
            </div>

            <ModerationQueue sounds={sounds} reports={reports} />

            {/* Contact Messages */}
            {unreadMessages.length > 0 && (
                <div className="mt-12">
                    <h2 className="text-lg font-bold mb-4">Unread Contact Messages</h2>
                    <div className="space-y-3">
                        {unreadMessages.map((msg) => (
                            <div key={String(msg._id)} className="rounded-2xl border border-white/8 bg-[#111113] p-5">
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                    <span className="text-sm font-semibold text-white">{(msg as { name?: string }).name ?? "—"}</span>
                                    <a href={`mailto:${msg.senderEmail}`} className="text-xs text-orange-400 hover:text-orange-300 transition-colors">{msg.senderEmail}</a>
                                    <span className="ml-auto text-xs text-white/30">{(msg.createdAt as Date).toLocaleString()}</span>
                                    <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-[#a1a1aa] capitalize">{msg.type}</span>
                                </div>
                                <p className="text-sm text-[#a1a1aa] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
