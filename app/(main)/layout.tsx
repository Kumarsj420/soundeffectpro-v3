import Script from "next/script";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import MobileBottomNav from "@/app/components/MobileBottomNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {/* AdSense — main site only, not loaded in admin */}
            {process.env.NEXT_PUBLIC_GOOGLE_AD_CLIENT && (
                <>
                    <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="anonymous" />
                    <link rel="dns-prefetch" href="https://adservice.google.com" />
                    <link rel="dns-prefetch" href="https://tpc.googlesyndication.com" />
                    <Script
                        async
                        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_GOOGLE_AD_CLIENT}`}
                        crossOrigin="anonymous"
                        strategy="afterInteractive"
                    />
                </>
            )}
            <Navbar />
            {/* pb-16 on mobile leaves room above the fixed bottom nav */}
            <main className="flex-1 pb-16 sm:pb-0">{children}</main>
            {/* Footer only shown on desktop — bottom nav replaces it on mobile */}
            <div className="hidden sm:block">
                <Footer />
            </div>
            <MobileBottomNav />
        </>
    );
}
