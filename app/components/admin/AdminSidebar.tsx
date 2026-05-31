"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/app/lib/utils";
import {
    LayoutDashboard, Music, Upload, Mail, Flag,
    Shield, ChevronRight, Link2, X, Film,
} from "lucide-react";

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    badge?: number;
    exact?: boolean;
}

interface AdminSidebarProps {
    unreadMessages?: number;
    unreadReports?: number;
    pendingSounds?: number;
    isOpen?: boolean;
    onClose?: () => void;
}

export default function AdminSidebar({
    unreadMessages = 0,
    unreadReports = 0,
    pendingSounds = 0,
    isOpen = false,
    onClose,
}: AdminSidebarProps) {
    const pathname = usePathname();

    const nav: NavItem[] = [
        { href: "/admin",           label: "Dashboard",  icon: LayoutDashboard, exact: true },
        { href: "/admin/sounds",    label: "Sounds",     icon: Music,   badge: pendingSounds || undefined },
        { href: "/admin/upload",    label: "Upload",     icon: Upload },
        { href: "/admin/import",        label: "Import URL",     icon: Link2 },
        { href: "/admin/video-creator", label: "Video Creator",   icon: Film },
        { href: "/admin/messages",  label: "Messages",   icon: Mail,    badge: unreadMessages || undefined },
        { href: "/admin/reports",   label: "Reports",    icon: Flag,    badge: unreadReports  || undefined },
    ];

    function NavLinks({ onClick }: { onClick?: () => void }) {
        return (
            <>
                {nav.map(item => {
                    const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onClick}
                            className={cn(
                                "group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                                active
                                    ? "bg-orange-500/10 text-orange-400"
                                    : "text-white/50 hover:text-white hover:bg-white/4"
                            )}
                        >
                            <span className="flex items-center gap-3">
                                <item.icon className="h-4 w-4 shrink-0" />
                                {item.label}
                            </span>
                            <span className="flex items-center gap-1.5">
                                {item.badge ? (
                                    <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                                        {item.badge > 99 ? "99+" : item.badge}
                                    </span>
                                ) : (
                                    <ChevronRight className={cn("h-3.5 w-3.5 transition-opacity", active ? "opacity-60" : "opacity-0 group-hover:opacity-30")} />
                                )}
                            </span>
                        </Link>
                    );
                })}
            </>
        );
    }

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="hidden lg:flex flex-col w-52 shrink-0 py-8">
                <div className="flex items-center gap-2 mb-8 px-3">
                    <Shield className="h-5 w-5 text-orange-400" />
                    <span className="font-bold text-white">Admin Panel</span>
                </div>
                <nav className="flex flex-col gap-0.5">
                    <NavLinks />
                </nav>
            </aside>

            {/* Mobile overlay backdrop */}
            <div
                className={cn(
                    "lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Mobile drawer */}
            <aside className={cn(
                "lg:hidden fixed top-0 left-0 z-50 h-full w-64 bg-[#0d0d0d] border-r border-white/8 flex flex-col transition-transform duration-300 ease-in-out",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-between px-4 h-14 border-b border-white/8 shrink-0">
                    <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-orange-400" />
                        <span className="font-bold text-sm text-white">Admin Panel</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors"
                        aria-label="Close menu"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <nav className="flex flex-col gap-0.5 p-3 overflow-y-auto flex-1">
                    <NavLinks onClick={onClose} />
                </nav>
            </aside>
        </>
    );
}
