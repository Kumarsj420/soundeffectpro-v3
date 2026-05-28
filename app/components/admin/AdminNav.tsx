"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/app/lib/utils";
import { ClipboardList, Music, Upload } from "lucide-react";

const TABS = [
    { href: "/admin",        label: "Moderation",  icon: ClipboardList, exact: true },
    { href: "/admin/sounds", label: "Sounds",       icon: Music },
    { href: "/admin/upload", label: "Bulk Upload",  icon: Upload },
];

export default function AdminNav() {
    const pathname = usePathname();
    return (
        <nav className="flex gap-0.5 border-b border-white/8 mb-8">
            {TABS.map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href);
                return (
                    <Link
                        key={href}
                        href={href}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors rounded-t-lg",
                            active
                                ? "border-orange-500 text-orange-400 bg-orange-500/5"
                                : "border-transparent text-white/50 hover:text-white hover:bg-white/4"
                        )}
                    >
                        <Icon className="h-4 w-4" />
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}
