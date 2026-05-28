import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminNav from "@/app/components/admin/AdminNav";
import type { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const session = await auth();
    if (!session || !["admin", "moderator"].includes(session.user.role)) {
        redirect("/");
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <AdminNav />
            {children}
        </div>
    );
}
