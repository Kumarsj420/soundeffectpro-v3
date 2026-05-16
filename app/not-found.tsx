import Link from "next/link";

export default function RootNotFound() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-4 text-center">
            <p className="text-[10rem] font-black leading-none text-orange-500/10 select-none mb-2">
                404
            </p>
            <h1 className="text-2xl font-bold mb-2">Page not found</h1>
            <p className="text-white/50 mb-8 max-w-sm text-sm">
                This page doesn&apos;t exist or has been moved.
            </p>
            <Link
                href="/"
                className="px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-400 text-sm font-medium transition-colors"
            >
                Go to SoundEffectPro
            </Link>
        </div>
    );
}
