import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Globe, Mail } from "lucide-react";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description: "How SoundEffectPro collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
    const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@soundeffectpro.com";
    return (
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
            <Header
                title="Privacy Policy"
                effective="05 February, 2026"
                updated="05 February, 2026"
            />
            <div className="space-y-10">
                <P>
                    Welcome to <Link href="/" className="text-orange-400 hover:text-orange-300 transition-colors">SoundEffectPro</Link> ("we", "our", "us"). Your privacy is important to us. This Privacy Policy explains how we collect, use, store, and protect your information when you use our website and services. By accessing or using SoundEffectPro, you agree to the terms of this Privacy Policy.
                </P>

                <Section title="1. Information We Collect">
                    <P>We collect information to provide better services and improve user experience.</P>
                    <Sub>1.1 Information You Provide Directly</Sub>
                    <P>When you create an account or use our platform, we may collect:</P>
                    <List items={["Name or username", "Email address", "Profile picture (if provided via OAuth)", "Uploaded sound clips and metadata (title, tags, description)", "Account preferences", "Messages sent to support"]} />
                    <Sub>1.2 Authentication Information</Sub>
                    <P>If you sign in using third-party services, we receive limited profile data:</P>
                    <List items={["Google OAuth (name, email, profile image)", "Discord OAuth (username, email, avatar)", "Twitch OAuth (username, email, profile image)"]} />
                    <P>We do not access your passwords from third-party providers.</P>
                    <Sub>1.3 Automatically Collected Data</Sub>
                    <P>We may collect IP address, browser type, device information, pages visited, usage activity, and referring URLs via cookies and analytics tools.</P>
                </Section>

                <Section title="2. How We Use Your Data">
                    <P>We use collected information to:</P>
                    <List items={["Create and manage user accounts", "Enable content uploads and sharing", "Provide authentication and login services", "Improve website performance and features", "Prevent fraud and misuse", "Communicate important service updates", "Respond to support requests", "Comply with legal obligations"]} />
                    <P>We do not sell personal data to third parties.</P>
                </Section>

                <Section title="3. Cookies and Tracking Technologies">
                    <P>SoundEffectPro uses cookies to maintain login sessions, remember user preferences, improve performance, and analyze traffic. You may control cookies through your browser settings. Disabling cookies may affect some features.</P>
                </Section>

                <Section title="4. Third-Party Services">
                    <P>We use trusted third-party services for authentication, hosting, analytics, and advertising, including Google OAuth, Discord OAuth, Twitch OAuth, cloud hosting providers, and Google Ads. Each service follows its own privacy policy.</P>
                </Section>

                <Section title="5. User-Generated Content">
                    <P>When you upload sound clips, content becomes publicly accessible unless deleted. You retain ownership of your uploads and grant SoundEffectPro a limited license to display and distribute your content on the platform. You are responsible for ensuring uploaded content does not violate copyright or platform rules.</P>
                </Section>

                <Section title="6. Account Deletion and Data Removal">
                    <P>You may delete uploaded content or your account at any time. Upon deletion, your profile data, uploaded content, and authentication records are removed. Residual backups may remain temporarily for legal or security reasons.</P>
                </Section>

                <Section title="7. User Rights (GDPR)">
                    <P>As a user, you have the right to:</P>
                    <List items={["Access your personal data", "Correct inaccurate information", 'Request data deletion ("Right to be Forgotten")', "Restrict or object to processing", "Download your data (data portability)", "Withdraw consent at any time"]} />
                </Section>

                <Section title="8. Data Security">
                    <P>We implement industry-standard security including HTTPS encryption, secure authentication, access controls, and regular monitoring. No system is 100% secure — please protect your account credentials.</P>
                </Section>

                <Section title="9. Data Retention">
                    <P>We retain personal data only while your account is active, to comply with legal requirements, or for legitimate business purposes. After deletion, data is permanently removed within a reasonable timeframe.</P>
                </Section>

                <Section title="10. Children's Privacy (13+)">
                    <P>SoundEffectPro is not intended for children under 13. We do not knowingly collect personal data from children under 13. If you believe a child has provided personal information, please contact us immediately.</P>
                </Section>

                <Section title="11. Changes to This Policy">
                    <P>We may update this Privacy Policy from time to time. Continued use of the platform indicates acceptance. We recommend reviewing this page periodically.</P>
                </Section>

                <ContactSection email={email} />
            </div>
        </div>
    );
}

/* ---- shared sub-components ---- */

function Header({ title, effective, updated }: { title: string; effective: string; updated: string }) {
    return (
        <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-5">{title}</h1>
            <div className="flex flex-wrap gap-5 text-sm text-[#71717a]">
                <span className="flex items-center gap-2"><Calendar className="h-4 w-4 shrink-0" />Effective: {effective}</span>
                <span className="flex items-center gap-2"><Calendar className="h-4 w-4 shrink-0" />Updated: {updated}</span>
            </div>
            <div className="mt-6 h-px bg-white/8" />
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3">
            <h2 className="text-lg font-bold text-white border-l-2 border-orange-500 pl-3">{title}</h2>
            <div className="space-y-3 text-[#a1a1aa] leading-relaxed text-sm">{children}</div>
        </section>
    );
}

function Sub({ children }: { children: React.ReactNode }) {
    return <h3 className="text-sm font-semibold text-white/80 mt-4">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
    return <p className="text-[#a1a1aa] text-sm leading-relaxed">{children}</p>;
}

function List({ items }: { items: string[] }) {
    return (
        <ul className="space-y-1.5">
            {items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-[#a1a1aa]">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500/70" />
                    {item}
                </li>
            ))}
        </ul>
    );
}

function ContactSection({ email }: { email: string }) {
    return (
        <section className="rounded-2xl border border-white/8 bg-[#111113] p-6 space-y-4">
            <h2 className="text-lg font-bold text-white border-l-2 border-orange-500 pl-3">Contact Us</h2>
            <p className="text-sm text-[#a1a1aa]">For questions, concerns, or privacy requests, reach us at:</p>
            <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm text-[#a1a1aa]">
                    <Globe className="h-4 w-4 shrink-0 text-orange-400" />
                    <Link href="/" className="hover:text-orange-400 transition-colors">soundeffectpro.com</Link>
                </div>
                <div className="flex items-center gap-3 text-sm text-[#a1a1aa]">
                    <Mail className="h-4 w-4 shrink-0 text-orange-400" />
                    <a href={`mailto:${email}`} className="hover:text-orange-400 transition-colors">{email}</a>
                </div>
            </div>
        </section>
    );
}
