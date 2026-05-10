"use client";

import { useState } from "react";
import { CheckCircle2, Send, AlertCircle } from "lucide-react";

const TYPES = [
    { value: "contact",         label: "General Contact" },
    { value: "support",         label: "Support" },
    { value: "feedback",        label: "Feedback" },
    { value: "inquiry",         label: "Inquiry" },
    { value: "technical issue", label: "Technical Issue" },
    { value: "other",           label: "Other" },
];

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
    const [name,    setName]    = useState("");
    const [email,   setEmail]   = useState("");
    const [type,    setType]    = useState("contact");
    const [message, setMessage] = useState("");
    const [status,  setStatus]  = useState<Status>("idle");
    const [errMsg,  setErrMsg]  = useState("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setStatus("submitting");
        setErrMsg("");

        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, type, message }),
            });
            const data = await res.json();
            if (!res.ok) {
                setErrMsg(data.error ?? "Something went wrong.");
                setStatus("error");
            } else {
                setStatus("success");
            }
        } catch {
            setErrMsg("Network error. Please check your connection.");
            setStatus("error");
        }
    }

    if (status === "success") {
        return (
            <div className="rounded-2xl border border-white/8 bg-[#111113] p-10 flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold mb-2">Message Sent!</h2>
                    <p className="text-sm text-[#71717a]">
                        Thanks for reaching out. We&apos;ll get back to you within 24–48 hours.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setName(""); setEmail(""); setType("contact");
                        setMessage(""); setStatus("idle");
                    }}
                    className="mt-2 text-sm text-orange-400 hover:text-orange-300 transition-colors"
                >
                    Send another message
                </button>
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-white/8 bg-[#111113] p-6 sm:p-8 space-y-5"
        >
            {/* Name + Email */}
            <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Your Name" required>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="John Doe"
                        required
                        minLength={2}
                        maxLength={100}
                        className={inputCls}
                    />
                </Field>
                <Field label="Email Address" required>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className={inputCls}
                    />
                </Field>
            </div>

            {/* Type */}
            <Field label="Subject / Type" required>
                <select
                    value={type}
                    onChange={e => setType(e.target.value)}
                    className={inputCls}
                >
                    {TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
            </Field>

            {/* Message */}
            <Field label="Message" required>
                <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Describe your question or issue in detail…"
                    required
                    minLength={10}
                    maxLength={600}
                    rows={6}
                    className={`${inputCls} resize-none`}
                />
                <p className="text-xs text-[#52525b] text-right mt-1">{message.length}/600</p>
            </Field>

            {/* Error */}
            {status === "error" && (
                <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {errMsg}
                </div>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-orange-500 hover:bg-orange-400 disabled:opacity-60 disabled:cursor-not-allowed px-6 py-3 text-sm font-semibold text-white transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-px"
            >
                {status === "submitting" ? (
                    <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                        Sending…
                    </>
                ) : (
                    <>
                        <Send className="h-4 w-4" />
                        Send Message
                    </>
                )}
            </button>
        </form>
    );
}

const inputCls = "w-full rounded-xl border border-white/10 bg-[#18181b] px-4 py-2.5 text-sm text-white placeholder-[#52525b] outline-none focus:border-orange-500/50 focus:bg-[#1c1c1f] transition-colors";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#a1a1aa]">
                {label}{required && <span className="text-orange-500 ml-0.5">*</span>}
            </label>
            {children}
        </div>
    );
}
