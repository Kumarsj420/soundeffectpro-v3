import Link from "next/link";
import { Waves, Globe, Share2 } from "lucide-react";
import Logo from "./Logo";

const CATEGORIES = [
    { label: "Meme Sounds",    href: "/sounds/meme" },
    { label: "Anime Sounds",   href: "/sounds/anime" },
    { label: "Gaming Sounds",  href: "/sounds/gaming" },
    { label: "Music Sounds",   href: "/sounds/music" },
    { label: "Movie Sounds",   href: "/sounds/movies" },
    { label: "Comedy Sounds",  href: "/sounds/comedy" },
    { label: "TikTok Sounds",  href: "/search?q=tiktok" },
    { label: "Series Sounds",  href: "/sounds/series" },
];

const PLATFORM = [
    { label: "Browse All",     href: "/search" },
    { label: "Upload Sound",   href: "/upload" },
    { label: "Trending",       href: "/sounds/meme" },
    { label: "Contact Us",     href: "/contact" },
    { label: "Sign In",        href: "/login" },
];

const LEGAL = [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "DMCA / Copyright", href: "/dmca" },
    { label: "Content Policy", href: "/content-policy" },
    { label: "Contact Us", href: "/contact" },
];

export default function Footer() {
    return (
        <footer className="mt-auto border-t border-white/6 bg-[#0d0d0f]">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-12 grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">

                {/* Brand */}
                <div className="col-span-2 md:col-span-1 space-y-4">
                    <Link href="/" className="flex items-center gap-2 group w-fit">
                        <Logo />
                    </Link>
             
                    <p className="text-sm text-[#71717a] leading-relaxed max-w-50">
                        The internet's best meme sound effects. Free to play and download.
                    </p>

                </div>

                {/* Categories */}
                <div>
                    <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-4">Categories</p>
                    <ul className="space-y-2.5">
                        {CATEGORIES.map(c => (
                            <li key={c.href}>
                                <Link href={c.href} className="text-sm text-[#71717a] hover:text-white transition-colors">
                                    {c.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Platform */}
                <div>
                    <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-4">Platform</p>
                    <ul className="space-y-2.5">
                        {PLATFORM.map(c => (
                            <li key={c.href}>
                                <Link href={c.href} className="text-sm text-[#71717a] hover:text-white transition-colors">
                                    {c.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Legal */}
                <div>
                    <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-4">Legal</p>
                    <ul className="space-y-2.5">
                        {LEGAL.map(c => (
                            <li key={c.href}>
                                <Link href={c.href} className="text-sm text-[#71717a] hover:text-white transition-colors">
                                    {c.label}
                                </Link>
                            </li>
                        ))}
                        <li>
                            <a
                                href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@soundeffectpro.com"}`}
                                className="text-sm text-[#71717a] hover:text-white transition-colors"
                            >
                                Email Us
                            </a>
                        </li>
                         <li>
                            <a
                                href={`https://buymeacoffee.com/memecup`}
                                target="_blank"
                                className="text-sm  hover:brightness-125 transition-colors"
                            >
                                <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 via-blue-400 to-sky-300 ">
                                    Buy Me Coffee
                                </span> {' '}
                                 🥺🤌🏻
                            </a>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-white/5 py-5">
                <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-[#71717a]">
                        © {new Date().getFullYear()} SoundEffectPro. All rights reserved.
                    </p>
                    <p className="text-xs text-[#71717a]">
                        Made for meme lovers everywhere 🎵
                    </p>
                </div>
            </div>
        </footer>
    );
}
