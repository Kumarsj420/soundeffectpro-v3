import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";
import Fav from "@/app/lib/models/Fav";
import { auth } from "@/auth";

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.uid) {
            return Response.json({ error: "Sign in to like sounds" }, { status: 401 });
        }

        const { slug } = await params;
        await connectDB();

        const sound = await File.findOne({ slug, visibility: true }).select('s_id').lean();
        if (!sound) return Response.json({ error: "Not found" }, { status: 404 });

        const existing = await Fav.findOne({ uid: session.user.uid, s_id: sound.s_id });

        if (existing) {
            await Promise.all([
                Fav.deleteOne({ uid: session.user.uid, s_id: sound.s_id }),
                File.updateOne({ s_id: sound.s_id }, { $inc: { 'stats.likes': -1 } }),
            ]);
            return Response.json({ liked: false });
        }

        await Promise.all([
            Fav.create({ uid: session.user.uid, s_id: sound.s_id }),
            File.updateOne({ s_id: sound.s_id }, { $inc: { 'stats.likes': 1 } }),
        ]);

        return Response.json({ liked: true });
    } catch {
        return Response.json({ ok: false }, { status: 500 });
    }
}
