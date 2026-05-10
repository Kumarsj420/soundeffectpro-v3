import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
        </>
    );
}
