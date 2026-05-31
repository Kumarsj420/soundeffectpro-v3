import type { Metadata } from "next";
import AdminBulkUpload from "@/app/components/admin/AdminBulkUpload";

export const metadata: Metadata = {
    title: "Bulk Upload — Admin",
    robots: { index: false, follow: false },
};

export default function AdminUploadPage() {
    return <AdminBulkUpload />;
}
