import type { Metadata } from "next";
import AdminSoundsTable from "@/app/components/admin/AdminSoundsTable";

export const metadata: Metadata = {
    title: "Sounds — Admin",
    robots: { index: false, follow: false },
};

export default async function AdminSoundsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    const { tab } = await searchParams;
    return <AdminSoundsTable initialTab={tab === "pending" ? "pending" : "all"} />;
}
