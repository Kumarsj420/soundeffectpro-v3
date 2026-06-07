import type { Metadata } from "next";
import { Mail, MessageSquare, Clock, Shield } from "lucide-react";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
    title: "Contact Us",
    description: "Get in touch with the SoundEffectPro team. We're here to help with questions, DMCA requests, and feedback.",
    alternates: { canonical: "/contact" },
};

const CONTACT_EMAIL = "soundeffectpro420@gmail.com";

const INFO = [
    {
        icon: Clock,
        title: "Response Time",
        body: "We typically respond within 24–48 hours on business days.",
    },
    {
        icon: Shield,
        title: "DMCA / Copyright",
        body: "For takedown requests, use the Report button on the sound page or contact us below.",
    },
    {
        icon: MessageSquare,
        title: "General Support",
        body: "Questions, feedback, or anything else — just fill out the form and we'll get back to you.",
    },
];

export default function ContactPage() {
    return (
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16">

            {/* Header */}
            <div className="mb-12 text-center">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-orange-500/15 border border-orange-500/25 mb-5">
                    <Mail className="h-6 w-6 text-orange-400" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">Contact Us</h1>
                <p className="text-[#71717a] max-w-md mx-auto text-sm sm:text-base">
                    Have a question, DMCA request, or just want to say hi? Drop us a message.
                </p>
                <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="inline-flex items-center gap-2 mt-4 text-orange-400 hover:text-orange-300 transition-colors text-sm font-medium"
                >
                    <Mail className="h-4 w-4" />
                    {CONTACT_EMAIL}
                </a>
            </div>

            <div className="grid lg:grid-cols-5 gap-8">

                {/* Info cards */}
                <aside className="lg:col-span-2 space-y-4">
                    {INFO.map(({ icon: Icon, title, body }) => (
                        <div key={title} className="rounded-2xl border border-white/8 bg-[#111113] p-5 flex gap-4">
                            <div className="h-9 w-9 shrink-0 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                <Icon className="h-4.5 w-4.5 text-orange-400" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-white mb-1">{title}</p>
                                <p className="text-xs text-[#71717a] leading-relaxed">{body}</p>
                            </div>
                        </div>
                    ))}

                    {/* Direct email box */}
                    <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5">
                        <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2">Direct Email</p>
                        <a
                            href={`mailto:${CONTACT_EMAIL}`}
                            className="text-sm text-white hover:text-orange-400 transition-colors break-all"
                        >
                            {CONTACT_EMAIL}
                        </a>
                        <p className="text-xs text-[#52525b] mt-1.5">You can also email us directly anytime.</p>
                    </div>
                </aside>

                {/* Form */}
                <div className="lg:col-span-3">
                    <ContactForm />
                </div>
            </div>
        </div>
    );
}
