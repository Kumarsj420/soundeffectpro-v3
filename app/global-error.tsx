"use client";

import { useEffect } from "react";

export default function GlobalError({
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
        <html lang="en">
            <body className="min-h-screen bg-[#0a0a0a] text-white antialiased flex flex-col items-center justify-center px-4 text-center">
                <p className="text-[10rem] font-black leading-none text-orange-500/10 select-none mb-2">
                    500
                </p>
                <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
                <p className="text-white/50 mb-6 max-w-sm text-sm">
                    A critical error occurred. Please try again.
                </p>
                <button
                    onClick={reset}
                    className="px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-400 text-sm font-medium transition-colors"
                >
                    Try again
                </button>
            </body>
        </html>
    );
}
