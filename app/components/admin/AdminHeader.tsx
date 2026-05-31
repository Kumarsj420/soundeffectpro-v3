"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Shield, ExternalLink, LogOut, Menu } from "lucide-react";
import { signOut } from "next-auth/react";

interface Props {
    onMenuToggle?: () => void;
}

export default function AdminHeader({ onMenuToggle }: Props) {
    const { data: session } = useSession();

    return (
        <header className="h-14 border-b border-white/8 bg-[#0a0a0a]/95 backdrop-blur-sm sticky top-0 z-30 flex items-center px-4 gap-3">
            {/* Hamburger — mobile only */}
            <button
                onClick={onMenuToggle}
                className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors shrink-0"
                aria-label="Toggle menu"
            >
                <Menu className="h-5 w-5" />
            </button>

            {/* Brand */}
            <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/15 shrink-0">
                    <Shield className="h-4 w-4 text-orange-400" />
                </div>
                <span className="font-semibold text-sm whitespace-nowrap">Admin Panel</span>
            </div>

            <div className="h-4 w-px bg-white/10 hidden lg:block shrink-0" />

            <Link href="/" className="text-xs text-white/10 hidden lg:block whitespace-nowrap">
                soundeffectpro.com
            </Link>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right: site link + user */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <Link
                    href="/"
                    target="_blank"
                    className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white transition-colors"
                >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">View site</span>
                </Link>

                {session?.user && (
                    <>
                        <div className="h-4 w-px bg-white/10 hidden sm:block shrink-0" />
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            {session.user.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={session.user.image} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                            ) : (
                                <div className="h-7 w-7 rounded-full bg-orange-500/20 flex items-center justify-center text-xs font-bold text-orange-400 shrink-0">
                                    {(session.user.name ?? "A")[0].toUpperCase()}
                                </div>
                            )}
                            <span className="text-xs text-white/50 hidden sm:block">{session.user.name ?? session.user.email}</span>
                            <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-400 uppercase tracking-wide whitespace-nowrap hidden xs:inline">
                                {(session.user as { role?: string }).role ?? "admin"}
                            </span>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: "/" })}
                            className="flex items-center gap-1 text-xs text-white/20 hover:text-red-400 transition-colors shrink-0"
                            title="Sign out"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                        </button>
                    </>
                )}
            </div>
        </header>
    );
}
