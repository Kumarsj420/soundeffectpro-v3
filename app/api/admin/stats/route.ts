import { auth } from "@/auth";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import User from "@/app/lib/models/User";
import Message from "@/app/lib/models/Message";
import Report from "@/app/lib/models/Report";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await auth();
    if (!session || !["admin", "moderator"].includes(session.user.role)) {
        return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
        totalSounds,
        newToday,
        pendingMod,
        hiddenSounds,
        unreadMessages,
        totalMessages,
        unreadReports,
        totalReports,
        proUsers,
        totalUsers,
        totalViews,
        totalDownloads,
    ] = await Promise.all([
        File.countDocuments({ visibility: true }),
        File.countDocuments({ createdAt: { $gte: todayStart } }),
        File.countDocuments({ moderationStatus: "pending" }),
        File.countDocuments({ visibility: false }),
        Message.countDocuments({ read: false }),
        Message.countDocuments({}),
        Report.countDocuments({ read: false }),
        Report.countDocuments({}),
        User.countDocuments({ plan: { $in: ["pro", "api"] } }),
        User.countDocuments({}),
        File.aggregate([{ $group: { _id: null, total: { $sum: "$stats.views" } } }]).then(r => r[0]?.total ?? 0),
        File.aggregate([{ $group: { _id: null, total: { $sum: "$stats.downloads" } } }]).then(r => r[0]?.total ?? 0),
    ]);

    // Top 5 trending sounds
    const topSounds = await File.find({ visibility: true })
        .sort({ trendScore: -1 })
        .limit(5)
        .select("s_id slug title stats.views stats.downloads trendScore")
        .lean();

    return Response.json({
        sounds: { total: totalSounds, newToday, pending: pendingMod, hidden: hiddenSounds },
        messages: { unread: unreadMessages, total: totalMessages },
        reports: { unread: unreadReports, total: totalReports },
        users: { pro: proUsers, total: totalUsers },
        engagement: { views: totalViews, downloads: totalDownloads },
        topSounds: topSounds.map(s => ({
            s_id: s.s_id,
            slug: s.slug,
            title: s.title,
            views: (s.stats as { views?: number })?.views ?? 0,
            downloads: (s.stats as { downloads?: number })?.downloads ?? 0,
            trendScore: (s.trendScore as number) ?? 0,
        })),
    });
}
