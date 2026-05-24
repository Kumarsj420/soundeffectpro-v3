"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, Flame, Zap, User, LogIn } from "lucide-react";
import { cn } from "@/app/lib/utils";

const STATIC_TABS = [
    { label: "Home",     href: "/",                    icon: Home  },
    { label: "Trending", href: "/sounds/meme",         icon: Flame },
    { label: "Viral",    href: "/search?sort=popular", icon: Zap   },
];

export default function MobileBottomNav() {
    const { data: session } = useSession();
    const pathname = usePathname();

    // 4th tab: avatar + first-name if logged in, LogIn icon if not
    const profileTab = session
        ? {
            label: session.user.name?.split(" ")[0] ?? "Profile",
            href:  `/profile/${session.user.uid}`,
            avatar: session.user.image,
            initials: (session.user.name ?? "U")[0].toUpperCase(),
          }
        : null;

    function isActive(href: string) {
        if (href === "/") return pathname === "/";
        return pathname.startsWith(href.split("?")[0]);
    }

    return (
        <nav
            aria-label="Mobile navigation"
            className="fixed bottom-0 left-0 right-0 z-40 sm:hidden"
        >
            {/* Blurred background */}
            <div className="absolute inset-0 bg-[#0d0d0f]/92 backdrop-blur-xl border-t border-white/10" aria-hidden />

            <div className="relative grid grid-cols-4 h-16">
                {/* Static tabs */}
                {STATIC_TABS.map((tab) => {
                    const Icon  = tab.icon;
                    const active = isActive(tab.href);
                    return (
                        <Link
                            key={tab.label}
                            href={tab.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 transition-colors select-none tap-highlight-transparent",
                                active ? "text-orange-400" : "text-white/45 hover:text-white/80"
                            )}
                        >
                            <div className="relative">
                                <Icon className={cn(
                                    "h-[22px] w-[22px] transition-transform",
                                    active && "scale-110"
                                )} />
                                {/* Active dot */}
                                {active && (
                                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-orange-400" />
                                )}
                            </div>
                            <span className={cn(
                                "text-[10px] font-medium leading-none",
                                active ? "text-orange-400" : "text-white/40"
                            )}>
                                {tab.label}
                            </span>
                        </Link>
                    );
                })}

                {/* 4th tab: Profile / Sign In */}
                {profileTab ? (
                    <Link
                        href={profileTab.href}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 transition-colors select-none",
                            isActive(profileTab.href) ? "text-orange-400" : "text-white/45 hover:text-white/80"
                        )}
                    >
                        <div className="relative">
                            {profileTab.avatar ? (
                                <Image
                                    src={profileTab.avatar}
                                    alt={profileTab.label}
                                    width={26}
                                    height={26}
                                    className={cn(
                                        "rounded-full object-cover ring-2 transition-all",
                                        isActive(profileTab.href) ? "ring-orange-400" : "ring-white/20"
                                    )}
                                />
                            ) : (
                                <div className={cn(
                                    "h-[26px] w-[26px] rounded-full flex items-center justify-center text-[11px] font-bold ring-2 transition-all",
                                    "bg-gradient-to-br from-orange-500 to-amber-500 text-white",
                                    isActive(profileTab.href) ? "ring-orange-400" : "ring-white/20"
                                )}>
                                    {profileTab.initials}
                                </div>
                            )}
                            {isActive(profileTab.href) && (
                                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-orange-400" />
                            )}
                        </div>
                        <span className="text-[10px] font-medium leading-none text-white/40 max-w-[52px] truncate">
                            {profileTab.label}
                        </span>
                    </Link>
                ) : (
                    <Link
                        href="/login"
                        className="flex flex-col items-center justify-center gap-1 text-white/45 hover:text-white/80 transition-colors select-none"
                    >
                        <div className="relative">
                            <div className="h-[26px] w-[26px] rounded-full border border-white/20 flex items-center justify-center">
                                <LogIn className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <span className="text-[10px] font-medium leading-none text-white/40">
                            Sign In
                        </span>
                    </Link>
                )}
            </div>
        </nav>
    );
}
