import type { ReactNode } from "react";
import { Toaster } from "sonner";

export default function AdminRootLayout({ children }: { children: ReactNode }) {
    return (
        <>
            {children}
            <Toaster theme="dark" position="bottom-right" richColors />
        </>
    );
}
