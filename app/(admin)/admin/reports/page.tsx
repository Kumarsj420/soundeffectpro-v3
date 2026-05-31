import type { Metadata } from "next";
import ReportsInbox from "@/app/components/admin/ReportsInbox";

export const metadata: Metadata = {
    title: "Reports — Admin",
    robots: { index: false, follow: false },
};

export default function AdminReportsPage() {
    return <ReportsInbox />;
}
