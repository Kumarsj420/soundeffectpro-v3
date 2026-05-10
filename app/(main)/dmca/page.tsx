import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Globe, Mail } from "lucide-react";

export const metadata: Metadata = {
    title: "DMCA / Copyright Policy",
    description: "How to report copyright infringement and how SoundEffectPro handles DMCA takedown requests.",
};

export default function DmcaPage() {
    const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@soundeffectpro.com";
    return (
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
            <Header title="DMCA / Copyright Policy" effective="05 February, 2026" updated="05 February, 2026" />
            <div className="space-y-10">
                <P>
                    <Link href="/" className="text-orange-400 hover:text-orange-300 transition-colors">SoundEffectPro</Link> respects the intellectual property rights of others and expects users to do the same. This policy outlines how copyright owners can report alleged infringements and how we respond in accordance with the Digital Millennium Copyright Act (DMCA) and international copyright laws.
                </P>

                <Section title="1. Copyright Respect Statement">
                    <P>SoundEffectPro hosts user-generated sound clips. We do not claim ownership of user uploads and do not actively monitor all content. We are committed to:</P>
                    <List items={["Responding promptly to valid copyright complaints", "Removing infringing content when properly notified", "Protecting the rights of copyright owners and users"]} />
                </Section>

                <Section title="2. Filing a DMCA Takedown Request">
                    <P>If you believe content on SoundEffectPro infringes your copyright, submit a DMCA Takedown Notice by clicking the <strong className="text-white/80">Report</strong> button on any sound page, or via the contact email below. Incomplete notices may not be processed.</P>
                </Section>

                <Section title="3. Required Information for Takedown Notice">
                    <P>To be valid, your DMCA notice must include:</P>
                    <Sub>Identification of the copyrighted work</Sub>
                    <P>Description of the original work claimed to be infringed.</P>
                    <Sub>Identification of the infringing material</Sub>
                    <P>Direct URL(s) of the sound clip or page on SoundEffectPro.</P>
                    <Sub>Your contact information</Sub>
                    <List items={["Full legal name", "Email address", "Mailing address (optional but recommended)"]} />
                    <Sub>Good faith statement</Sub>
                    <P>A statement that you believe in good faith that the use is not authorized by the copyright owner, its agent, or the law.</P>
                    <Sub>Accuracy and authority statement</Sub>
                    <P>A statement that the information in the notice is accurate and that you are the copyright owner or authorized to act on behalf of the owner.</P>
                </Section>

                <Section title="4. Takedown Process">
                    <P>Upon receiving a valid DMCA notice, SoundEffectPro will:</P>
                    <List items={["Review the complaint for completeness", "Remove or disable access to the reported content", "Notify the user who uploaded the content", "Record the incident for repeat-infringer tracking"]} />
                    <P>We act promptly but do not guarantee specific timelines.</P>
                </Section>

                <Section title="5. Counter-Notification Process">
                    <P>If you believe your content was removed by mistake, you may submit a Counter-Notification. Your counter-notice must include:</P>
                    <List items={["Identification of the removed content and its previous location", "Your full legal name and contact information", "A statement under penalty of perjury that you have a good faith belief the content was removed due to error or misidentification", "Consent to jurisdiction of the appropriate courts", "Your electronic or physical signature"]} />
                    <P>If a valid counter-notice is received, we may restore the content unless the original complainant files a legal action within the legally required timeframe.</P>
                </Section>

                <Section title="6. Repeat Infringer Policy">
                    <P>SoundEffectPro maintains a zero-tolerance policy for repeat copyright infringement. We may issue warnings, remove uploaded content, suspend accounts, or permanently terminate repeat infringers without prior notice.</P>
                </Section>

                <Section title="7. Misuse of DMCA Claims">
                    <P>Submitting false or misleading DMCA claims may result in legal liability. We reserve the right to take action against parties who abuse this process.</P>
                </Section>

                <Section title="8. Changes to This Policy">
                    <P>We may update this policy periodically. Continued use of the platform constitutes acceptance of any updates.</P>
                </Section>

                <ContactSection email={email} label="DMCA requests and copyright inquiries" />
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

function ContactSection({ email, label }: { email: string; label?: string }) {
    return (
        <section className="rounded-2xl border border-white/8 bg-[#111113] p-6 space-y-4">
            <h2 className="text-lg font-bold text-white border-l-2 border-orange-500 pl-3">Contact Us</h2>
            <p className="text-sm text-[#a1a1aa]">{label ?? "For questions or requests, reach us at:"}</p>
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
