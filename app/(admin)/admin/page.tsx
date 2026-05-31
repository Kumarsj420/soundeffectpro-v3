import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import User from "@/app/lib/models/User";
import Message from "@/app/lib/models/Message";
import Report from "@/app/lib/models/Report";
import Link from "next/link";
import { Music, Users, Mail, Flag, TrendingUp, Download, Eye, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import ModerationActions from "@/app/components/admin/ModerationActions";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Dashboard — Admin",
    robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function StatCard({ label, value, sub, icon: Icon, accent = false }: {
    label: string; value: string | number; sub?: string;
    icon: React.ElementType; accent?: boolean;
}) {
    return (
        <div className={`rounded-2xl border p-5 ${accent ? "border-orange-500/30 bg-orange-500/5" : "border-white/8 bg-[#111113]"}`}>
            <div className="flex items-start justify-between mb-3">
                <p className="text-sm text-white/50">{label}</p>
                <div className={`rounded-xl p-2 ${accent ? "bg-orange-500/15 text-orange-400" : "bg-white/6 text-white/40"}`}>
                    <Icon className="h-4 w-4" />
                </div>
            </div>
            <p className="text-2xl font-bold tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</p>
            {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
        </div>
    );
}

export default async function AdminDashboard() {
    await auth(); // layout handles redirect

    await connectDB();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
        totalSounds, newToday, pendingSounds, hiddenSounds,
        unreadMessages, totalMessages,
        unreadReports, totalReports,
        totalUsers,
        viewsAgg, downloadsAgg,
        topSounds,
        pendingDocs,
        recentReports,
    ] = await Promise.all([
        File.countDocuments({ visibility: true }),
        File.countDocuments({ createdAt: { $gte: todayStart } }),
        File.countDocuments({ moderationStatus: "pending" }),
        File.countDocuments({ visibility: false }),
        Message.countDocuments({ read: false }),
        Message.countDocuments({}),
        Report.countDocuments({ read: false }),
        Report.countDocuments({}),
        User.countDocuments({}),
        File.aggregate([{ $group: { _id: null, total: { $sum: "$stats.views" } } }]),
        File.aggregate([{ $group: { _id: null, total: { $sum: "$stats.downloads" } } }]),
        File.find({ visibility: true })
            .sort({ "stats.views": -1 })
            .limit(5)
            .select("s_id slug title stats.views stats.downloads trendScore")
            .lean(),
        File.find({ moderationStatus: "pending" })
            .sort({ createdAt: -1 })
            .limit(10)
            .select("_id s_id slug title category duration tags description user createdAt")
            .lean(),
        Report.find({ read: false })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),
    ]);

    const totalViews = viewsAgg[0]?.total ?? 0;
    const totalDownloads = downloadsAgg[0]?.total ?? 0;

    const pending = pendingDocs.map(s => ({
        _id: String(s._id),
        s_id: s.s_id,
        slug: s.slug ?? "",
        title: s.title,
        category: s.category as string,
        duration: s.duration,
        tags: s.tags,
        description: (s.description as string) ?? "",
        user: s.user as { uid: string; name: string },
        createdAt: (s.createdAt as Date).toISOString(),
        moderationStatus: "pending",
    }));

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-white/40 text-sm mt-1">Overview of SoundEffectPro</p>
            </div>

            {/* ── Stats grid ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                <StatCard label="Total Sounds"   value={totalSounds}     sub={`+${newToday} today`}        icon={Music}      accent />
                <StatCard label="Total Users"    value={totalUsers}                                 icon={Users} />
                <StatCard label="Total Views"    value={totalViews}      sub="all-time"                     icon={Eye} />
                <StatCard label="Downloads"      value={totalDownloads}  sub="all-time"                     icon={Download} />
                <StatCard label="Pending Review" value={pendingSounds}   sub="need moderation"              icon={Clock}      accent={pendingSounds > 0} />
                <StatCard label="Hidden Sounds"  value={hiddenSounds}    sub="not visible"                  icon={XCircle} />
                <StatCard label="Unread Reports" value={unreadReports}   sub={`${totalReports} total`}      icon={Flag}       accent={unreadReports > 0} />
                <StatCard label="Unread Messages" value={unreadMessages} sub={`${totalMessages} total`}     icon={Mail}       accent={unreadMessages > 0} />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* ── Pending moderation ── */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4 text-orange-400" />
                            Pending Moderation
                            {pendingSounds > 0 && (
                                <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{pendingSounds}</span>
                            )}
                        </h2>
                        {pendingSounds > 10 && (
                            <Link href="/admin/sounds?tab=pending" className="text-xs text-orange-400 hover:text-orange-300">
                                View all →
                            </Link>
                        )}
                    </div>
                    {pending.length === 0 ? (
                        <div className="rounded-2xl border border-white/8 bg-[#111113] py-10 text-center">
                            <CheckCircle className="h-8 w-8 text-green-400/40 mx-auto mb-2" />
                            <p className="text-white/30 text-sm">All caught up!</p>
                        </div>
                    ) : (
                        <ModerationActions sounds={pending} />
                    )}
                </section>

                {/* ── Top sounds + recent reports ── */}
                <div className="space-y-6">
                    {/* Top sounds */}
                    <section>
                        <h2 className="font-semibold flex items-center gap-2 mb-4">
                            <TrendingUp className="h-4 w-4 text-orange-400" />
                            Top Sounds by Views
                        </h2>
                        <div className="rounded-2xl border border-white/8 bg-[#111113] divide-y divide-white/5">
                            {topSounds.map((s, i) => (
                                <div key={s.s_id} className="flex items-center gap-3 px-4 py-3">
                                    <span className="text-xs text-white/20 w-5 text-center font-mono">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <Link
                                            href={`/sound/${s.slug}-${s.s_id}`}
                                            target="_blank"
                                            className="text-sm text-white hover:text-orange-400 transition-colors truncate block"
                                        >
                                            {s.title}
                                        </Link>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-white/30 shrink-0">
                                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{((s.stats as { views?: number })?.views ?? 0).toLocaleString()}</span>
                                        <span className="flex items-center gap-1"><Download className="h-3 w-3" />{((s.stats as { downloads?: number })?.downloads ?? 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Recent unread reports */}
                    {recentReports.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-red-400" />
                                    Recent Reports
                                </h2>
                                <Link href="/admin/reports" className="text-xs text-orange-400 hover:text-orange-300">
                                    View all →
                                </Link>
                            </div>
                            <div className="space-y-2">
                                {recentReports.map(r => (
                                    <div key={String(r._id)} className="rounded-xl border border-white/8 bg-[#111113] px-4 py-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="rounded-full bg-red-500/15 text-red-400 px-2 py-0.5 text-xs font-medium capitalize">{r.type}</span>
                                            <span className="text-xs text-white/30">{r.senderEmail}</span>
                                            <span className="ml-auto text-xs text-white/20">{new Date(r.createdAt as Date).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-xs text-white/50 line-clamp-1">{r.content}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
