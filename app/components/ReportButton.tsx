"use client";

import { useState } from "react";
import { Flag, CheckCircle2 } from "lucide-react";
import { REPORT_TYPES } from "@/app/lib/constants";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";

export default function ReportButton({ slug }: { slug: string }) {
    const [open, setOpen]       = useState(false);
    const [type, setType]       = useState<typeof REPORT_TYPES[number]>(REPORT_TYPES[0]);
    const [content, setContent] = useState("");
    const [status, setStatus]   = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');

    async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        setStatus('submitting');
        try {
            const res = await fetch(`/api/sound/${slug}/report`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, content }),
            });
            setStatus(res.ok ? 'done' : 'error');
        } catch {
            setStatus('error');
        }
    }

    function handleClose(open: boolean) {
        if (!open) {
            setOpen(false);
            if (status === 'done') {
                setContent('');
                setStatus('idle');
            }
        } else {
            setOpen(true);
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 rounded-full border border-white/10 hover:border-red-500/30 hover:text-red-400 px-4 py-2 text-sm text-[#71717a] transition-all"
                aria-label="Report this sound"
            >
                <Flag className="h-4 w-4" />
                Report
            </button>

            <DialogContent>
                {status === 'done' ? (
                    <div className="flex flex-col items-center gap-3 py-4 text-center">
                        <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                        <DialogTitle>Report submitted</DialogTitle>
                        <p className="text-sm text-[#a1a1aa]">
                            Thank you. Our moderation team will review it shortly.
                        </p>
                        <DialogClose asChild>
                            <Button variant="secondary" size="md" className="mt-2">Close</Button>
                        </DialogClose>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Report Sound</DialogTitle>
                            <DialogDescription>
                                Help us keep the platform safe. Reports are reviewed by our team.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#71717a] mb-2" htmlFor="report-type">
                                    Reason
                                </label>
                                <select
                                    id="report-type"
                                    value={type}
                                    onChange={e => setType(e.target.value as typeof REPORT_TYPES[number])}
                                    className="w-full rounded-xl border border-white/10 bg-[#27272a] px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50 transition-colors capitalize"
                                >
                                    {REPORT_TYPES.map(t => (
                                        <option key={t} value={t} className="capitalize">{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[#71717a] mb-2" htmlFor="report-content">
                                    Details
                                </label>
                                <textarea
                                    id="report-content"
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder="Describe the issue in detail…"
                                    required
                                    minLength={10}
                                    maxLength={1000}
                                    rows={4}
                                    className="w-full rounded-xl border border-white/10 bg-[#27272a] px-3 py-2.5 text-sm text-white placeholder-[#52525b] outline-none focus:border-orange-500/50 transition-colors resize-none"
                                />
                                <p className="text-xs text-[#52525b] mt-1 text-right">{content.length}/1000</p>
                            </div>

                            {status === 'error' && (
                                <p className="text-sm text-red-400 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
                                    Something went wrong. Please try again.
                                </p>
                            )}

                            <div className="flex justify-end gap-2 pt-1">
                                <DialogClose asChild>
                                    <Button variant="ghost" size="md" type="button">Cancel</Button>
                                </DialogClose>
                                <Button
                                    variant="danger"
                                    size="md"
                                    type="submit"
                                    disabled={status === 'submitting' || content.trim().length < 10}
                                >
                                    {status === 'submitting' ? 'Submitting…' : 'Submit Report'}
                                </Button>
                            </div>
                        </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
