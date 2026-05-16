import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

const CATEGORIES = ["meme", "anime", "gaming", "music", "comedy", "series"];

export default function RootNotFound() {
    return (
        <>
            <Navbar />
            <main className="flex-1 min-h-[65vh] flex flex-col items-center justify-center px-4 text-center">
                <p className="text-[10rem] font-black leading-none text-orange-500/10 select-none mb-2">
                    404
                </p>
                <h1 className="text-2xl font-bold mb-2">Sound not found</h1>
                <p className="text-white/50 mb-8 max-w-sm text-sm leading-relaxed">
                    This sound or page doesn&apos;t exist. It may have been removed or the URL might be wrong.
                </p>

                <div className="flex flex-wrap gap-3 justify-center mb-10">
                    <Link
                        href="/"
                        className="px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-400 text-sm font-medium transition-colors"
                    >
                        Browse Sounds
                    </Link>
                    <Link
                        href="/search"
                        className="px-5 py-2.5 rounded-full border border-white/15 hover:border-white/30 text-sm transition-colors"
                    >
                        Search
                    </Link>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                    {CATEGORIES.map((cat) => (
                        <Link
                            key={cat}
                            href={`/sounds/${cat}`}
                            className="text-sm text-white/40 hover:text-orange-400 border border-white/8 hover:border-orange-500/30 rounded-full px-3 py-1 transition-colors capitalize"
                        >
                            {cat}
                        </Link>
                    ))}
                </div>
            </main>
            <Footer />
        </>
    );
}
