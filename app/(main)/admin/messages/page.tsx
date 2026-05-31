import type { Metadata } from "next";
import MessagesInbox from "@/app/components/admin/MessagesInbox";

export const metadata: Metadata = {
    title: "Messages — Admin",
    robots: { index: false, follow: false },
};

export default function AdminMessagesPage() {
    return <MessagesInbox />;
}
