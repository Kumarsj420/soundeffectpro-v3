"use client";

import { useState, type ReactNode } from "react";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";

interface Props {
    unreadMessages: number;
    unreadReports: number;
    pendingSounds: number;
    children: ReactNode;
}

export default function AdminShell({ unreadMessages, unreadReports, pendingSounds, children }: Props) {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <>
            <AdminHeader onMenuToggle={() => setMenuOpen(v => !v)} />
            <div className="flex-1 mx-auto w-full max-w-7xl px-4 flex flex-col lg:flex-row lg:gap-8">
                <AdminSidebar
                    unreadMessages={unreadMessages}
                    unreadReports={unreadReports}
                    pendingSounds={pendingSounds}
                    isOpen={menuOpen}
                    onClose={() => setMenuOpen(false)}
                />
                {children}
            </div>
        </>
    );
}
