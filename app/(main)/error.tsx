"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function MainError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-[65vh] flex flex-col items-center justify-center px-4 text-center">
            <p className="text-[10rem] font-black leading-none text-orange-500/10 select-none mb-2">
                500
            </p>
            <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
            <p className="text-white/50 mb-8 max-w-sm text-sm leading-relaxed">
                An unexpected error occurred. Try again or head back home.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
                <button
                    onClick={reset}
                    className="px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-400 text-sm font-medium transition-colors"
                >
                    Try again
                </button>
                <Link
                    href="/"
                    className="px-5 py-2.5 rounded-full border border-white/15 hover:border-white/30 text-sm transition-colors"
                >
                    Go Home
                </Link>
            </div>
        </div>
    );
}
