import Image from "next/image";
import localFont from "next/font/local";
import { ArrowRight } from "lucide-react";

/* Cross-promo for Cry Me Art (crymeart.com), our sister brand under Tech Vinya.
   Pure server markup — no client JS, so it costs nothing on ISR pages.

   Placement: the (main) layout renders a fallback copy at the end of <main>
   so every page shows it. Pages that want it higher up (below their sound
   grids) render <CryMeArtBanner inline /> themselves, and a :has() rule in
   globals.css hides the layout's copy so it never appears twice. */

const HREF =
    "https://crymeart.com/starmap?utm_source=soundeffectpro&utm_medium=banner&utm_campaign=sister_brand";

// Cry Me Art's own typefaces (copied from its repo): Fraunces for the
// headline, Jost for everything else. Not preloaded — the banner sits below
// the fold, so the files load only when it renders.
const fraunces = localFont({
    src: [
        { path: "../fonts/fraunces-300-700-normal.woff2", weight: "300 700", style: "normal" },
        { path: "../fonts/fraunces-300-700-italic.woff2", weight: "300 700", style: "italic" },
    ],
    display: "swap",
    preload: false,
});
const jost = localFont({
    src: [{ path: "../fonts/jost-300-700-normal.woff2", weight: "300 700", style: "normal" }],
    display: "swap",
    preload: false,
});

// Fixed star positions (percent) so server and client render identically.
const STARS: [number, number, number][] = [
    [4, 18, 1], [9, 72, 1.5], [15, 40, 1], [22, 88, 1], [28, 12, 1.5], [34, 60, 1],
    [41, 30, 1], [47, 84, 1.5], [53, 16, 1], [58, 52, 1], [63, 92, 1], [69, 8, 1.5],
    [74, 64, 1], [80, 26, 1], [86, 80, 1.5], [91, 44, 1], [96, 14, 1], [98, 70, 1],
];

export default function CryMeArtBanner({ inline = false }: { inline?: boolean }) {
    return (
        <aside
            aria-label="From our sister brand, Cry Me Art"
            className={inline ? "crymeart-promo-inline" : undefined}
        >
            <a
                href={HREF}
                target="_blank"
                rel="noopener sponsored"
                className="group relative flex items-center gap-4 sm:gap-8 overflow-hidden rounded-2xl border border-white/10 bg-linear-to-b from-[#1B2A4A] to-[#070B14] px-5 py-6 sm:px-10 sm:py-8 transition-[border-color,box-shadow] duration-300 hover:border-amber-300/30 hover:shadow-2xl hover:shadow-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
                {/* Starfield */}
                <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none">
                    {STARS.map(([x, y, r], i) => (
                        <circle key={i} cx={`${x}%`} cy={`${y}%`} r={r} fill="#fff" fillOpacity={0.35} />
                    ))}
                </svg>
                <div aria-hidden className="pointer-events-none absolute -right-10 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-amber-400/10 blur-3xl" />

                {/* Copy */}
                <div className={`${jost.className} relative flex-1 min-w-0 space-y-2 sm:space-y-3`}>
                    <p className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] text-amber-200/70">
                        From our sister brand · Cry Me Art
                    </p>
                    <p className={`${fraunces.className} text-2xl sm:text-4xl lg:text-5xl font-light leading-[1.05] text-white`}>
                        Every feeling has{" "}
                        <span className="italic text-transparent bg-clip-text bg-linear-to-r from-amber-300 via-amber-200 to-yellow-100">
                            its own art.
                        </span>
                    </p>
                    <p className="hidden sm:block text-sm lg:text-base font-light text-white/75">
                        Personalised star maps of the night that mattered. Prints, posters &amp; wallpapers.
                    </p>
                    {/* Text colour set inline so no inherited link colour can
                        turn it white on the yellow */}
                    <span
                        className="mt-1 sm:mt-2 inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold shadow-lg shadow-black/30 transition-colors group-hover:bg-amber-200"
                        style={{ color: "#070B14" }}
                    >
                        Create your star map
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                    <p className="text-[11px] sm:text-xs text-white/50">crymeart.com</p>
                </div>

                {/* Star Maps collection artwork */}
                <Image
                    src="/promo/crymeart-star-maps.webp"
                    alt="Three personalised star map posters from Cry Me Art"
                    width={720}
                    height={602}
                    loading="lazy"
                    className="relative w-32 sm:w-64 lg:w-80 shrink-0 h-auto select-none drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                />
            </a>
        </aside>
    );
}
