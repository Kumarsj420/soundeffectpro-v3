"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import {
    Search, Upload, LogOut, User, Shield,
    Flame, Clock, Music2, Gamepad2, Laugh,
    ChevronDown, X, Menu, BookOpen,
    Home, Zap, ArrowRight, History, TrendingUp, LayoutGrid,
} from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { cn } from "@/app/lib/utils";
import Logo from "./Logo";

const NAV_CATEGORIES = [
    { label: "Trending",  href: "/sounds/meme",       icon: Flame,    color: "text-orange-400" },
    { label: "Meme",      href: "/sounds/meme",       icon: Laugh,    color: "text-yellow-400" },
    { label: "Gaming",    href: "/search?q=gaming",   icon: Gamepad2, color: "text-emerald-400" },
    { label: "Anime",     href: "/sounds/anime",      icon: Music2,   color: "text-pink-400" },
    { label: "Music",     href: "/search?q=music",    icon: Music2,   color: "text-violet-400" },
    { label: "Latest",    href: "/search?sort=newest",icon: Clock,    color: "text-sky-400" },
];

const DRAWER_LINKS = [
    { label: "Home",       href: "/",                   icon: Home },
    { label: "Trending",   href: "/sounds/meme",        icon: Flame },
    { label: "Viral",      href: "/search?sort=popular",icon: Zap },
    { label: "Meme",       href: "/sounds/meme",        icon: Laugh },
    { label: "Anime",      href: "/sounds/anime",       icon: Music2 },
    { label: "Gaming",     href: "/search?q=gaming",    icon: Gamepad2 },
    { label: "Music",      href: "/search?q=music",     icon: Music2 },
    { label: "Latest",     href: "/search?sort=newest", icon: Clock },
    { label: "Browse All", href: "/search",             icon: Search },
    { label: "Upload",     href: "/upload",             icon: Upload },
    { label: "Contact",    href: "/contact",            icon: BookOpen },
];

const POPULAR_TAGS = [
    "bruh", "vine boom", "anime wow", "meme", "gaming",
    "tiktok", "discord", "funny", "rizz", "sus",
];

const RECENT_KEY = "sfx_recent_searches";
const MAX_RECENT = 6;

function saveRecent(q: string) {
    try {
        const prev: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
        const next = [q, ...prev.filter(s => s !== q)].slice(0, MAX_RECENT);
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch { /* ignore */ }
}

function getRecent(): string[] {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}

// ── Mobile Search Overlay ────────────────────────────────────────────────────
function MobileSearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
    const router   = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [q, setQ]               = useState("");
    const [recent, setRecent]     = useState<string[]>([]);
    const [result, setResult]     = useState<SuggestResult | null>(null);
    const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load recent searches when overlay opens
    useEffect(() => {
        if (open) {
            setQ("");
            setResult(null);
            setRecent(getRecent());
            setTimeout(() => inputRef.current?.focus(), 80);
        }
    }, [open]);

    // Debounced live suggestions
    useEffect(() => {
        const trimmed = q.trim();
        if (trimmed.length < 2) { setResult(null); return; }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`).catch(() => null);
            if (res?.ok) setResult(await res.json());
        }, 220);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [q]);

    // Close on ESC
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    function navigate(query: string) {
        const trimmed = query.trim();
        if (!trimmed) return;
        saveRecent(trimmed);
        onClose();
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        navigate(q);
    }

    function clearRecent() {
        localStorage.removeItem(RECENT_KEY);
        setRecent([]);
    }

    const hasLiveResults = q.trim().length >= 2 && result !== null &&
        ((result.suggestions?.length ?? 0) > 0 || (result.sounds?.length ?? 0) > 0);

    return (
        <>
            {/* Backdrop */}
            <div
                aria-hidden
                onClick={onClose}
                className={cn(
                    "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-200 sm:hidden",
                    open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
            />

            {/* Panel — slides down from top */}
            <div className={cn(
                "fixed inset-x-0 top-0 z-50 bg-[#0d0d0f] border-b border-white/10 shadow-2xl transition-transform duration-300 ease-out sm:hidden",
                open ? "translate-y-0" : "-translate-y-full"
            )}>
                {/* Search input row */}
                <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 h-14 border-b border-white/8">
                    <Search className="h-5 w-5 text-white/40 shrink-0" />
                    <input
                        ref={inputRef}
                        type="search"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder="Search sounds, memes, games…"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        className="flex-1 bg-transparent text-white text-base placeholder-white/30 outline-none py-2"
                    />
                    {q ? (
                        <button
                            type="button"
                            onClick={() => { setQ(""); setResult(null); }}
                            className="shrink-0 p-1.5 rounded-full hover:bg-white/8 text-white/50 hover:text-white transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onClose}
                            className="shrink-0 p-1.5 rounded-full hover:bg-white/8 text-white/50 hover:text-white transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </form>

                {/* Suggestions body */}
                <div className="max-h-[70vh] overflow-y-auto overscroll-contain">

                    {/* "Search for X" row — always shown when typing */}
                    {q.trim() && (
                        <button
                            onClick={() => navigate(q)}
                            className="flex w-full items-center gap-3 px-5 py-3.5 text-sm hover:bg-white/5 transition-colors border-b border-white/6 text-left"
                        >
                            <Search className="h-4 w-4 text-orange-400 shrink-0" />
                            <span className="text-white">Search for <strong className="text-orange-400">"{q.trim()}"</strong></span>
                            <ArrowRight className="h-4 w-4 text-white/30 ml-auto shrink-0" />
                        </button>
                    )}

                    {/* ── Live results when query ≥ 2 chars ── */}
                    {hasLiveResults && (
                        <>
                            {/* Popular suggestion terms */}
                            {(result!.suggestions?.length ?? 0) > 0 && (
                                <div className="px-4 pt-3 pb-1">
                                    <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Suggestions</p>
                                    <ul className="space-y-0.5">
                                        {result!.suggestions.map((term) => (
                                            <li key={term}>
                                                <button
                                                    onClick={() => navigate(term)}
                                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/6 transition-colors text-left"
                                                >
                                                    <TrendingUp className="h-4 w-4 text-orange-500/60 shrink-0" />
                                                    <span className="flex-1 truncate">{term}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Matching sounds */}
                            {(result!.sounds?.length ?? 0) > 0 && (
                                <div className="px-4 pt-3 pb-3">
                                    <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Sounds</p>
                                    <ul className="space-y-0.5">
                                        {result!.sounds.map((s) => (
                                            <li key={s.s_id}>
                                                <button
                                                    onClick={() => { onClose(); router.push(`/sound/${s.slug}-${s.s_id}`); }}
                                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/6 transition-colors text-left"
                                                >
                                                    <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                                                        <svg className="h-3.5 w-3.5 text-orange-400 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-white truncate">{s.title}</p>
                                                        <p className="text-xs text-white/35">{s.category} · {s.duration}</p>
                                                    </div>
                                                    <ArrowRight className="h-3.5 w-3.5 text-white/20 shrink-0" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── Static sections shown when no query (or query < 2 chars) ── */}
                    {!hasLiveResults && (
                        <>
                            {/* Recent searches */}
                            {!q && recent.length > 0 && (
                                <div className="px-4 pt-4 pb-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Recent</p>
                                        <button
                                            onClick={clearRecent}
                                            className="text-xs text-white/30 hover:text-orange-400 transition-colors"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <ul className="space-y-0.5">
                                        {recent.map((term) => (
                                            <li key={term}>
                                                <button
                                                    onClick={() => navigate(term)}
                                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/6 transition-colors text-left"
                                                >
                                                    <History className="h-4 w-4 text-white/30 shrink-0" />
                                                    <span className="flex-1 truncate">{term}</span>
                                                    <ArrowRight className="h-3.5 w-3.5 text-white/20 shrink-0" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Popular tags */}
                            <div className="px-4 pt-4 pb-6">
                                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
                                    Trending Searches
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {POPULAR_TAGS.map((tag) => (
                                        <button
                                            key={tag}
                                            onClick={() => navigate(tag)}
                                            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-400 px-3 py-1.5 text-xs text-white/60 transition-all"
                                        >
                                            <TrendingUp className="h-3 w-3" />
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

// ── Types for suggest API ─────────────────────────────────────────────────────
interface SuggestSound {
    s_id: string; slug: string; title: string; duration: string; category: string;
}
interface SuggestResult {
    sounds: SuggestSound[];
    suggestions: string[];
}

// ── Desktop search bar with live dropdown ─────────────────────────────────────
function SearchBar() {
    const router      = useRouter();
    const [q, setQ]           = useState("");
    const [focused, setFocused] = useState(false);
    const [result, setResult]   = useState<SuggestResult | null>(null);
    const [activeIdx, setActiveIdx] = useState(-1);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const showDropdown = focused && q.trim().length >= 2 && result !== null;
    const allItems: { type: "suggestion" | "sound"; value: string; sound?: SuggestSound }[] = [
        ...(result?.suggestions ?? []).map(s => ({ type: "suggestion" as const, value: s })),
        ...(result?.sounds ?? []).map(s => ({ type: "sound" as const, value: s.title, sound: s })),
    ];

    // Debounced fetch
    useEffect(() => {
        const trimmed = q.trim();
        if (trimmed.length < 2) { setResult(null); setActiveIdx(-1); return; }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`);
            if (res.ok) { setResult(await res.json()); setActiveIdx(-1); }
        }, 220);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [q]);

    function navigate(query: string) {
        const trimmed = query.trim();
        if (!trimmed) return;
        setFocused(false);
        setResult(null);
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }

    function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        if (activeIdx >= 0 && allItems[activeIdx]) {
            const item = allItems[activeIdx];
            if (item.type === "sound" && item.sound)
                router.push(`/sound/${item.sound.slug}-${item.sound.s_id}`);
            else navigate(item.value);
        } else {
            navigate(q);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (!showDropdown) return;
        if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, allItems.length - 1)); }
        if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
        if (e.key === "Escape")    { setFocused(false); setResult(null); }
    }

    return (
        <div ref={containerRef} className="relative flex-1 min-w-0 max-w-xl">
            <form onSubmit={handleSubmit}>
                <div className={cn(
                    "relative flex items-center rounded-full border transition-all duration-200",
                    focused
                        ? "border-orange-500/50 bg-white/8 shadow-lg shadow-orange-500/10"
                        : "border-white/8 bg-white/5 hover:bg-white/7 hover:border-white/12"
                )}>
                    <Search className="absolute left-4 h-4 w-4 text-[#71717a] pointer-events-none shrink-0" />
                    <input
                        type="search"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setTimeout(() => setFocused(false), 150)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search sounds, memes, games..."
                        aria-label="Search sounds"
                        aria-autocomplete="list"
                        aria-expanded={showDropdown}
                        className="w-full bg-transparent pl-11 pr-3 py-2.5 text-sm text-white placeholder-[#71717a] outline-none"
                    />
                    {q && (
                        <button type="submit"
                            className="mr-1.5 shrink-0 rounded-full bg-orange-500 hover:bg-orange-400 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors">
                            Go
                        </button>
                    )}
                </div>
            </form>

            {/* ── Dropdown ── */}
            {showDropdown && (
                <div className="absolute top-full mt-2 left-0 right-0 z-50 rounded-2xl border border-white/10 bg-[#111113] shadow-2xl shadow-black/40 overflow-hidden">
                    {/* Popular suggestions */}
                    {result!.suggestions.length > 0 && (
                        <div className="py-1 border-b border-white/6">
                            {result!.suggestions.map((term, i) => (
                                <button key={term}
                                    onMouseDown={() => navigate(term)}
                                    className={cn(
                                        "flex w-full items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors",
                                        activeIdx === i ? "bg-orange-500/10 text-orange-400" : "text-white/60 hover:bg-white/5 hover:text-white"
                                    )}>
                                    <TrendingUp className="h-3.5 w-3.5 text-orange-500/60 shrink-0" />
                                    {term}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Sound results */}
                    {result!.sounds.length > 0 && (
                        <div className="py-1">
                            <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/25">Sounds</p>
                            {result!.sounds.map((s, i) => {
                                const idx = result!.suggestions.length + i;
                                return (
                                    <button key={s.s_id}
                                        onMouseDown={() => router.push(`/sound/${s.slug}-${s.s_id}`)}
                                        className={cn(
                                            "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                                            activeIdx === idx ? "bg-orange-500/10" : "hover:bg-white/5"
                                        )}>
                                        <div className="h-7 w-7 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                                            <svg className="h-3 w-3 text-orange-400 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white truncate">{s.title}</p>
                                            <p className="text-xs text-white/35">{s.category} · {s.duration}</p>
                                        </div>
                                        <ArrowRight className="h-3.5 w-3.5 text-white/20 shrink-0" />
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* See all */}
                    <div className="border-t border-white/6 px-4 py-2.5">
                        <button onMouseDown={() => navigate(q)}
                            className="flex w-full items-center gap-2 text-xs text-orange-400 hover:text-orange-300 transition-colors">
                            <Search className="h-3.5 w-3.5" />
                            See all results for <strong>"{q.trim()}"</strong>
                            <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── User avatar ──────────────────────────────────────────────────────────────
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

// ── Hamburger drawer ─────────────────────────────────────────────────────────
function HamburgerDrawer({
    open, onClose, session,
}: {
    open: boolean;
    onClose: () => void;
    session: ReturnType<typeof useSession>["data"];
}) {
    const pathname = usePathname();
    useEffect(() => { onClose(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    return (
        <>
            <div aria-hidden onClick={onClose}
                className={cn(
                    "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 sm:hidden",
                    open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
            />
            <aside className={cn(
                "fixed top-0 left-0 z-50 h-full w-72 bg-[#0d0d0f] border-r border-white/8 flex flex-col transition-transform duration-300 ease-in-out sm:hidden",
                open ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-between px-4 h-14 border-b border-white/8 shrink-0">
                    <Link href="/" onClick={onClose}><Logo /></Link>
                    <button onClick={onClose} aria-label="Close menu"
                        className="rounded-full p-2 hover:bg-white/8 transition-colors text-white/60 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
                    {DRAWER_LINKS.map((link) => {
                        const Icon  = link.icon;
                        const active = pathname === link.href;
                        return (
                            <Link key={link.label + link.href} href={link.href} onClick={onClose}
                                className={cn(
                                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                                    active ? "bg-orange-500/15 text-orange-400" : "text-white/60 hover:text-white hover:bg-white/6"
                                )}>
                                <Icon className="h-4 w-4 shrink-0" />
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-white/8 p-4 shrink-0">
                    {session ? (
                        <div className="space-y-2">
                            <Link href={`/profile/${session.user.uid}`} onClick={onClose}
                                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/6 transition-colors">
                                <Avatar src={session.user.image} name={session.user.name} />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">{session.user.name}</p>
                                    <p className="text-xs text-white/40 truncate">{session.user.email}</p>
                                </div>
                            </Link>
                            <button onClick={() => { onClose(); signOut({ callbackUrl: "/" }); }}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                                <LogOut className="h-4 w-4 shrink-0" /> Sign out
                            </button>
                        </div>
                    ) : (
                        <Link href="/login" onClick={onClose}
                            className="flex items-center justify-center gap-2 w-full rounded-xl bg-orange-500 hover:bg-orange-400 px-4 py-2.5 text-sm font-semibold text-white transition-colors">
                            <User className="h-4 w-4" /> Sign In
                        </Link>
                    )}
                </div>
            </aside>
        </>
    );
}

// ── Main Navbar ───────────────────────────────────────────────────────────────
export default function Navbar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [scrolled,    setScrolled]    = useState(false);
    const [drawerOpen,  setDrawerOpen]  = useState(false);
    const [searchOpen,  setSearchOpen]  = useState(false);

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 8);
        window.addEventListener("scroll", handler, { passive: true });
        return () => window.removeEventListener("scroll", handler);
    }, []);

    // Close search overlay on route change
    useEffect(() => { setSearchOpen(false); }, [pathname]);

    const openSearch  = useCallback(() => { setDrawerOpen(false); setSearchOpen(true);  }, []);
    const closeSearch = useCallback(() => setSearchOpen(false), []);

    return (
        <>
            <header className={cn(
                "sticky top-0 z-30 transition-all duration-300",
                scrolled
                    ? "bg-[#09090b]/95 backdrop-blur-xl border-b border-white/8 shadow-xl shadow-black/20"
                    : "bg-[#09090b]/80 backdrop-blur-md border-b border-white/5"
            )}>
                {/* ── Mobile header: ☰  LOGO  🔍 ─────────────────────── */}
                <div className="flex sm:hidden items-center px-4 h-14">
                    {/* Hamburger */}
                    <button
                        onClick={() => setDrawerOpen(true)}
                        aria-label="Open menu"
                        className="rounded-xl p-2 -ml-2 hover:bg-white/8 transition-colors text-white/70 hover:text-white shrink-0 tap-highlight-transparent"
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    {/* Centred logo */}
                    <Link href="/" className="absolute left-1/2 -translate-x-1/2 tap-highlight-transparent">
                        <Logo />
                    </Link>

                    {/* Search icon — right */}
                    <button
                        onClick={openSearch}
                        aria-label="Search"
                        className="ml-auto rounded-xl p-2 -mr-2 hover:bg-white/8 transition-colors text-white/70 hover:text-white shrink-0 tap-highlight-transparent"
                    >
                        <Search className="h-5 w-5" />
                    </button>
                </div>

                {/* ── Desktop header ────────────────────────────────────── */}
                <div className="hidden sm:flex mx-auto max-w-7xl px-6 h-16 items-center justify-between gap-4">
                    <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
                        <Logo />
                    </Link>

                    <SearchBar />

                    <div className="flex items-center gap-2 shrink-0">
                        {/* Upload — always visible; unauthenticated users land on /login */}
                        <Link href={session ? "/upload" : "/login"}
                            className="flex items-center gap-1.5 rounded-full bg-orange-500 hover:bg-orange-400 px-4 py-2 text-sm font-semibold text-white transition-all shadow-lg shadow-orange-500/25 hover:-translate-y-px">
                            <Upload className="h-4 w-4" /> Upload
                        </Link>

                        {session ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="group flex items-center gap-1.5 rounded-full p-1.5 hover:bg-white/6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" aria-label="User menu">
                                        <Avatar src={session.user.image} name={session.user.name} />
                                        <ChevronDown className="h-4 w-4 text-[#71717a] transition-transform group-data-[state=open]:rotate-180" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                    <DropdownMenuLabel className="normal-case text-xs font-normal text-[#a1a1aa] tracking-normal">
                                        <p className="font-semibold text-white text-sm truncate">{session.user.name}</p>
                                        <p className="text-[#71717a] text-xs truncate">{session.user.email}</p>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href={`/profile/${session.user.uid}`}><User className="h-4 w-4" /> My Profile</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/my/soundboards"><LayoutGrid className="h-4 w-4" /> My Soundboards</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
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
                                    <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })} className="text-red-400 focus:text-red-300">
                                        <LogOut className="h-4 w-4" /> Sign out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Link href="/login"
                                className="rounded-full border border-white/15 hover:border-orange-500/50 hover:text-orange-400 px-4 py-2 text-sm font-medium transition-all hover:bg-orange-500/5">
                                Sign in
                            </Link>
                        )}
                    </div>
                </div>

                {/* ── Category strip (desktop only) ─────────────────────── */}
                <nav aria-label="Browse categories" className="hidden sm:block border-t border-white/5">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
                            {NAV_CATEGORIES.map((cat) => {
                                const Icon   = cat.icon;
                                const active = pathname === cat.href;
                                return (
                                    <Link key={cat.label} href={cat.href}
                                        className={cn(
                                            "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all shrink-0",
                                            active ? "bg-orange-500/15 text-orange-400" : "text-[#a1a1aa] hover:text-white hover:bg-white/6"
                                        )}>
                                        <Icon className={cn("h-3.5 w-3.5", active ? "text-orange-400" : cat.color)} />
                                        {cat.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </nav>
            </header>

            {/* Drawer & Search — rendered outside header to cover full viewport */}
            <HamburgerDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} session={session} />
            <MobileSearchOverlay open={searchOpen} onClose={closeSearch} />
        </>
    );
}
