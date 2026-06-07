import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Globe, Mail } from "lucide-react";

export const metadata: Metadata = {
    title: "Content Policy",
    description: "Community guidelines and content rules for SoundEffectPro.",
    alternates: { canonical: "/content-policy" },
};

export default function ContentPolicyPage() {
    const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@soundeffectpro.com";
    return (
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
            <Header title="Content Policy" effective="05 February, 2026" updated="05 February, 2026" />
            <div className="space-y-10">
                <P>
                    SoundEffectPro is a fun place to share meme sounds and viral audio. These guidelines help keep the community safe, respectful, and enjoyable for everyone.
                </P>

                <Section title="1. Allowed Content">
                    <P>You may upload:</P>
                    <List items={["Meme sounds and viral audio", "Reaction sounds and soundboard clips", "Original sound effects and voice recordings", "Parody and satire (non-harmful)", "Public domain or licensed audio", "Audio you have permission to share"]} />
                </Section>

                <Section title="2. Prohibited Content">
                    <Sub>Illegal or Copyright Infringing</Sub>
                    <List items={["Movie or TV audio without permission", "Copyrighted music or songs", "Audiobooks, podcasts, or paid content", "Pirated or leaked material"]} />
                    <Sub>Hate &amp; Harassment</Sub>
                    <List items={["Hate speech or slurs", "Bullying or harassment", "Threats or violence"]} />
                    <Sub>Adult &amp; Unsafe Content</Sub>
                    <List items={["Pornographic or sexual audio", "Sexual content involving minors", "Graphic or disturbing violence"]} />
                    <Sub>Spam &amp; Platform Abuse</Sub>
                    <List items={["Repeated uploads or spam", "Misleading titles or tags", "Bots or automation", "Attempts to hack or exploit the platform"]} />
                </Section>

                <Section title="3. Copyright Respect">
                    <P>Upload only content you created, have permission to use, or that is public domain. We respond to DMCA takedowns and may remove content at any time. See our <Link href="/dmca" className="text-orange-400 hover:text-orange-300 transition-colors">DMCA Policy</Link> for details.</P>
                </Section>

                <Section title="4. Respectful Behaviour">
                    <List items={["No harassment or bullying", "No impersonation of other users or public figures", "No sharing of personal information without consent", "Treat all community members respectfully"]} />
                </Section>

                <Section title="5. Moderation Actions">
                    <P>We may take the following actions if rules are broken:</P>
                    <List items={["Remove content", "Issue warnings", "Suspend accounts", "Permanently ban users"]} />
                    <P>Moderation decisions are final. Repeat violations result in escalating consequences.</P>
                </Section>

                <Section title="6. User Responsibility">
                    <P>You are responsible for your uploads and activity on the platform. Violations may result in content removal or account termination. If you see content that violates these guidelines, use the <strong className="text-white/80">Report</strong> button on any sound page.</P>
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
            <p className="text-sm text-[#a1a1aa]">If you have questions about these guidelines, reach us at:</p>
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
