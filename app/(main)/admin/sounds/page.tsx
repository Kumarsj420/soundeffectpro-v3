import type { Metadata } from "next";
import AdminSoundsTable from "@/app/components/admin/AdminSoundsTable";

export const metadata: Metadata = {
    title: "Sounds — Admin",
    robots: { index: false, follow: false },
};

export default function AdminSoundsPage() {
    return <AdminSoundsTable />;
}
