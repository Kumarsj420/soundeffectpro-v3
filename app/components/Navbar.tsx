"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
    Search, Upload, LogOut, User, Shield, Waves,
    Flame, Clock, Music2, Gamepad2, Laugh, ChevronDown,
} from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { cn } from "@/app/lib/utils";
import Logo from "./Logo";

const NAV_CATEGORIES = [
    { label: "Trending",  href: "/sounds/meme",    icon: Flame,    color: "text-orange-400" },
    { label: "Meme",      href: "/sounds/meme",    icon: Laugh,    color: "text-yellow-400" },
    { label: "Gaming",    href: "/search?q=gaming",  icon: Gamepad2, color: "text-emerald-400" },
    { label: "Anime",     href: "/sounds/anime",   icon: Music2,   color: "text-pink-400" },
    { label: "Music",     href: "/search?q=music",   icon: Music2,   color: "text-violet-400" },
    { label: "Latest",    href: "/search?sort=newest", icon: Clock, color: "text-sky-400" },
];

function SearchBar() {
    const router = useRouter();
    const [q, setQ] = useState("");
    const [focused, setFocused] = useState(false);

    function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        const trimmed = q.trim();
        if (trimmed) router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }

    return (
        <form onSubmit={handleSubmit} className="flex-1 min-w-0 max-w-xl">
            <div className={cn(
                "relative flex items-center rounded-full border transition-all duration-200",
                focused
                    ? "border-orange-500/50 bg-white/8 shadow-lg shadow-orange-500/10"
                    : "border-white/8 bg-white/5 hover:bg-white/7 hover:border-white/12"
            )}>
                <Search className="absolute left-4 h-4 w-4 text-[#52525b] pointer-events-none shrink-0" />
                <input
                    type="search"
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder="Search sounds, memes, games..."
                    aria-label="Search sounds"
                    className="w-full bg-transparent pl-11 pr-3 py-2.5 text-sm text-white placeholder-[#52525b] outline-none"
                />
                {q && (
                    <button
                        type="submit"
                        className="mr-1.5 shrink-0 rounded-full bg-orange-500 hover:bg-orange-400 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors"
                    >
                        Go
                    </button>
                )}
            </div>
        </form>
    );
}

function Avatar({ src, name }: { src?: string | null; name?: string | null }) {
    if (src) {
        return (
            <Image src={src} alt={name ?? "User"} width={32} height={32}
                className="rounded-full object-cover ring-2 ring-transparent group-hover:ring-orange-500/50 transition-all" />
        );
    }
    return (
        <div className="h-8 w-8 rounded-full bg-linear-to-br from-orange-500 to-amber-500 flex items-center justify-center text-xs font-bold text-white ring-2 ring-transparent group-hover:ring-orange-500/50 transition-all">
            {(name ?? "U")[0].toUpperCase()}
        </div>
    );
}

export default function Navbar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 8);
        window.addEventListener("scroll", handler, { passive: true });
        return () => window.removeEventListener("scroll", handler);
    }, []);

    return (
        <header className={cn(
            "sticky top-0 z-50 transition-all duration-300",
            scrolled
                ? "bg-[#09090b]/95 backdrop-blur-xl border-b border-white/8 shadow-xl shadow-black/20"
                : "bg-[#09090b]/80 backdrop-blur-md border-b border-white/5"
        )}>
            {/* Main bar */}
            <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
                    <Logo />
                </Link>
  
                <SearchBar />

                {/* Right actions */}
                <div className="flex items-center gap-2 shrink-0">
                    {session ? (
                        <>
                            <Link
                                href="/upload"
                                className="hidden sm:flex items-center gap-1.5 rounded-full bg-orange-500 hover:bg-orange-400 px-4 py-2 text-sm font-semibold text-white transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-px"
                            >
                                <Upload className="h-4 w-4" />
                                Upload
                            </Link>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        className="group flex items-center gap-1.5 rounded-full p-1.5 hover:bg-white/6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                                        aria-label="User menu"
                                    >
                                        <Avatar src={session.user.image} name={session.user.name} />
                                        <ChevronDown className="h-4 w-4 text-[#52525b] hidden sm:block transition-transform group-data-[state=open]:rotate-180" />
                                    </button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end" className="w-52">
                                    <DropdownMenuLabel className="normal-case text-xs font-normal text-[#a1a1aa] tracking-normal">
                                        <p className="font-semibold text-white text-sm truncate">{session.user.name}</p>
                                        <p className="text-[#52525b] text-xs truncate">{session.user.email}</p>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem asChild>
                                        <Link href={`/profile/${session.user.uid}`}>
                                            <User className="h-4 w-4" /> My Profile
                                        </Link>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem asChild className="sm:hidden">
                                        <Link href="/upload">
                                            <Upload className="h-4 w-4" /> Upload Sound
                                        </Link>
                                    </DropdownMenuItem>

                                    {(session.user.role === "admin" || session.user.role === "moderator") && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem asChild>
                                                <Link href="/admin" className="text-orange-400 focus:text-orange-300">
                                                    <Shield className="h-4 w-4" /> Moderation
                                                </Link>
                                            </DropdownMenuItem>
                                        </>
                                    )}

                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => signOut({ callbackUrl: "/" })}
                                        className="text-red-400 focus:text-red-300"
                                    >
                                        <LogOut className="h-4 w-4" /> Sign out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    ) : (
                        <Link
                            href="/login"
                            className="rounded-full border border-white/15 hover:border-orange-500/50 hover:text-orange-400 px-4 py-2 text-sm font-medium transition-all hover:bg-orange-500/5"
                        >
                            Sign in
                        </Link>
                    )}
                </div>
            </div>

            {/* Category pill strip */}
            <nav aria-label="Browse categories" className="border-t border-white/5">
                <div className="mx-auto max-w-7xl px-4 sm:px-6">
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
                        {NAV_CATEGORIES.map((cat) => {
                            const Icon = cat.icon;
                            const active = pathname === cat.href;
                            return (
                                <Link
                                    key={cat.label}
                                    href={cat.href}
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all shrink-0",
                                        active
                                            ? "bg-orange-500/15 text-orange-400"
                                            : "text-[#71717a] hover:text-white hover:bg-white/6"
                                    )}
                                >
                                    <Icon className={cn("h-3.5 w-3.5", active ? "text-orange-400" : cat.color)} />
                                    {cat.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>
        </header>
    );
}
