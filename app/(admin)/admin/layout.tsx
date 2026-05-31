import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/app/lib/db";
import Message from "@/app/lib/models/Message";
import Report from "@/app/lib/models/Report";
import File from "@/app/lib/models/File";
import AdminShell from "@/app/components/admin/AdminShell";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const session = await auth();
    if (!session || !["admin", "moderator"].includes(session.user.role)) {
        redirect("/");
    }

    await connectDB();
    const [unreadMessages, unreadReports, pendingSounds] = await Promise.all([
        Message.countDocuments({ read: false }),
        Report.countDocuments({ read: false }),
        File.countDocuments({ moderationStatus: "pending" }),
    ]);

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
            <AdminShell
                unreadMessages={unreadMessages}
                unreadReports={unreadReports}
                pendingSounds={pendingSounds}
            >
                <main className="flex-1 min-w-0 py-4 lg:py-8">
                    {children}
                </main>
            </AdminShell>
        </div>
    );
}
