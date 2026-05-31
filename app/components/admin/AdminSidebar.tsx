"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/app/lib/utils";
import {
    LayoutDashboard, Music, Upload, Mail, Flag,
    Shield, ChevronRight, Link2,
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
}

export default function AdminSidebar({ unreadMessages = 0, unreadReports = 0, pendingSounds = 0 }: AdminSidebarProps) {
    const pathname = usePathname();

    const nav: NavItem[] = [
        { href: "/admin",           label: "Dashboard",  icon: LayoutDashboard, exact: true },
        { href: "/admin/sounds",    label: "Sounds",     icon: Music,   badge: pendingSounds || undefined },
        { href: "/admin/upload",    label: "Upload",     icon: Upload },
        { href: "/admin/import",    label: "Import URL", icon: Link2 },
        { href: "/admin/messages",  label: "Messages",   icon: Mail,    badge: unreadMessages || undefined },
        { href: "/admin/reports",   label: "Reports",    icon: Flag,    badge: unreadReports  || undefined },
    ];

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="hidden lg:flex flex-col w-52 shrink-0 py-8">
                <div className="flex items-center gap-2 mb-8 px-3">
                    <Shield className="h-5 w-5 text-orange-400" />
                    <span className="font-bold text-white">Admin Panel</span>
                </div>
                <nav className="flex flex-col gap-0.5">
                    {nav.map(item => {
                        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
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
                </nav>
            </aside>

            {/* Mobile top bar — full width, scrollable, sits between header and content */}
            <nav className="lg:hidden flex gap-0.5 border-b border-white/8 -mx-4 px-2 overflow-x-auto bg-[#0a0a0a]">
                {nav.map(item => {
                    const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors shrink-0",
                                active
                                    ? "border-orange-500 text-orange-400"
                                    : "border-transparent text-white/50 hover:text-white"
                            )}
                        >
                            <item.icon className="h-3.5 w-3.5" />
                            {item.label}
                            {!!item.badge && (
                                <span className="rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white leading-tight">
                                    {item.badge > 99 ? "99+" : item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
