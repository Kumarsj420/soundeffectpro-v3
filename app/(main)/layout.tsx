import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import MobileBottomNav from "@/app/components/MobileBottomNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
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
