import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Globe, Mail } from "lucide-react";

export const metadata: Metadata = {
    title: "Terms of Service",
    description: "Terms and conditions governing your use of SoundEffectPro.",
    alternates: { canonical: "/terms" },
};

export default function TermsPage() {
    const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@soundeffectpro.com";
    return (
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
            <Header title="Terms of Service" effective="05 February, 2026" updated="05 February, 2026" />
            <div className="space-y-10">
                <P>
                    Welcome to <Link href="/" className="text-orange-400 hover:text-orange-300 transition-colors">SoundEffectPro</Link> ("Platform", "we", "our", "us"). These Terms govern your access to and use of our website and services. By accessing or using SoundEffectPro, you agree to be bound by these Terms.
                </P>

                <Section title="1. About SoundEffectPro">
                    <P>SoundEffectPro is a community platform that allows users to:</P>
                    <List items={["Upload and share short sound clips (under 2 minutes)", "Create soundboards", "Share public sound links", "Manage user profiles", "Log in via OAuth providers"]} />
                </Section>

                <Section title="2. Eligibility">
                    <P>To use the platform, you must be at least 13 years old, have legal capacity to enter into these Terms, and comply with all applicable laws. Users under 18 must have parental or guardian permission.</P>
                </Section>

                <Section title="3. User Accounts">
                    <P>You may create an account using Google, Discord, or Twitch OAuth. You agree to provide accurate information, maintain account security, be responsible for all activity under your account, and notify us of unauthorized access immediately.</P>
                </Section>

                <Section title="4. User Responsibilities">
                    <P>When using SoundEffectPro, you agree to use the platform lawfully and respectfully, upload only content you own or have permission to use, respect the rights of others, and not misuse or attempt to disrupt the platform.</P>
                </Section>

                <Section title="5. User-Generated Content">
                    <P>You retain ownership of your content. By uploading, you grant SoundEffectPro a worldwide, non-exclusive, royalty-free license to host, store, display, stream, distribute, and share your content publicly on the platform. This license exists only to operate and promote the service. You may delete your content at any time.</P>
                </Section>

                <Section title="6. Copyright and Intellectual Property">
                    <P>You must only upload content you created yourself or have legal rights to use. Uploading copyrighted content without permission is strictly prohibited. If you believe your copyright has been violated, submit a takedown request via our contact email. We reserve the right to remove content upon receiving valid complaints.</P>
                </Section>

                <Section title="7. Prohibited Content">
                    <Sub>Illegal Content</Sub>
                    <List items={["Copyright infringement", "Pirated audio or media", "Fraud or scams"]} />
                    <Sub>Harmful or Abusive Content</Sub>
                    <List items={["Hate speech", "Harassment or bullying", "Threats or violence", "Defamation"]} />
                    <Sub>Explicit or Inappropriate Content</Sub>
                    <List items={["Pornographic material", "Sexual exploitation content", "Content involving minors", "Graphic violence"]} />
                    <Sub>Platform Abuse</Sub>
                    <List items={["Spam or misleading metadata", "Malware or harmful code", "Attempts to hack or exploit the platform", "Automated scraping or mass downloads"]} />
                </Section>

                <Section title="8. Content Moderation">
                    <P>We reserve the right to review uploaded content, remove content at our discretion, restrict visibility or access, and suspend or terminate accounts. We are not obligated to monitor all content but may do so to maintain platform safety.</P>
                </Section>

                <Section title="9. Account Suspension and Termination">
                    <P>We may suspend or terminate accounts for violations of these Terms, uploading prohibited content, abusing or exploiting the platform, or repeatedly infringing copyright. We may terminate accounts without prior notice. Users may delete their accounts at any time.</P>
                </Section>

                <Section title="10. Sharing and Public Links">
                    <P>Sound clips may be shared publicly via links. By uploading content, you acknowledge that your content may be publicly accessible and that others may listen to, embed, and share your content.</P>
                </Section>

                <Section title="11. Limitation of Liability">
                    <P>SoundEffectPro is provided "as is" and "as available." We do not guarantee continuous availability, error-free operation, or security from all threats. We are not liable for loss of data, loss of profits, business interruption, or indirect damages. Your use of the platform is at your own risk.</P>
                </Section>

                <Section title="12. Disclaimer">
                    <P>SoundEffectPro hosts user-generated content. We do not endorse or verify the accuracy, legality, or reliability of uploaded content. Users are solely responsible for content they upload or share.</P>
                </Section>

                <Section title="13. Indemnification">
                    <P>You agree to indemnify and hold SoundEffectPro harmless from any claims, damages, or legal disputes arising from your content, your misuse of the platform, or your violation of these Terms.</P>
                </Section>

                <Section title="14. Changes to the Service">
                    <P>We may modify or discontinue features, update these Terms, or restrict access to parts of the platform. Continued use means acceptance of updated Terms.</P>
                </Section>

                <Section title="15. Governing Law">
                    <P>These Terms are governed by international laws and principles, with primary consideration to United States laws and European Union regulations. Any disputes shall be resolved in a competent jurisdiction chosen by SoundEffectPro.</P>
                </Section>

                <ContactSection email={email} />
            </div>
        </div>
    );
}

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
            <p className="text-sm text-[#a1a1aa]">For legal inquiries or questions, reach us at:</p>
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
