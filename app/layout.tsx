import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/app/components/SessionProvider";
import Script from 'next/script'

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

export const metadata: Metadata = {
    title: {
        default: "SoundEffectPro — Meme & Viral Sound Effects",
        template: "%s | SoundEffectPro",
    },
    description: "Discover, play, and download the best meme sound effects, viral audio clips, and trending sounds. Free sound effects for gaming, anime, TikTok, and more.",
    keywords: ["free sound effects", "meme sounds", "royalty free sound effects", "no copyright sounds", "sound effects download", "YouTube sound effects", "TikTok sounds", "Discord soundboard", "gaming sounds", "anime sounds", "viral audio", "MP3 download free"],
    metadataBase: new URL((process.env.NEXT_PUBLIC_BASE_URL ?? "https://soundeffectpro.com").replace(/\/$/, "")),
    openGraph: {
        type: "website",
        siteName: "SoundEffectPro",
        locale: "en_US",
        images: [{ url: "/licon.webp", width: 512, height: 512, alt: "SoundEffectPro Logo" }],
    },
    twitter: {
        card: "summary_large_image",
        images: ["/licon.webp"],
    },
    robots: { index: true, follow: true },
};

const R2_ORIGIN = (() => {
    try { return new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').origin; } catch { return ''; }
})();

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={geist.variable}>
            <head>
                {/* Preload sprite — used on every page with sound cards */}
                <link rel="preload" as="image" href="/btns.avif" type="image/avif" />
                {/* Warm up CDN connection for audio files */}
                {R2_ORIGIN && <link rel="dns-prefetch" href={R2_ORIGIN} />}
                {/* Preconnect to GTM origin for Analytics */}
                <link rel="preconnect" href="https://googletagmanager.com" crossOrigin="anonymous" />
                {/* Google Analytics */}
                <Script
                    src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
                    strategy="afterInteractive"
                />

                <Script id="ga-script" strategy="afterInteractive">
                    {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
              page_path: window.location.pathname,
            });
          `}
                </Script>

                {/* Microsoft Clarity */}
                <Script id="clarity-script" strategy="afterInteractive">
                    {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_CLARITY_ID}");
          `}
                </Script>

            </head>
            <body className="min-h-screen bg-[#0a0a0a] text-white antialiased flex flex-col">
                <SessionProvider>{children}</SessionProvider>
            </body>
        </html>
    );
}
