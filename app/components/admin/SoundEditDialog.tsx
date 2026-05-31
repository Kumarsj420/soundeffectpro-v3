"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CATEGORIES, LICENSE_VALUES } from "@/app/lib/constants";
import { X, Loader2, Save, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/app/lib/utils";

interface SoundFull {
    s_id: string; slug: string; title: string; description: string;
    duration: string; tags: string[]; category: string; license: string;
    btnColor: string; visibility: boolean; moderationStatus: string;
    createdAt: string; views: number; downloads: number;
}

interface Props {
    s_id: string;
    open: boolean;
    onOpenChange: (o: boolean) => void;
    onSaved?: () => void;
}

const BTN_COLORS = ["0","20","125","145","195","225","255","280","305","335"] as const;
const MOD_STATUS = ["pending","approved","rejected"] as const;

export default function SoundEditDialog({ s_id, open, onOpenChange, onSaved }: Props) {
    const [sound, setSound]     = useState<SoundFull | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving]   = useState(false);

    // form state
    const [title, setTitle]               = useState("");
    const [description, setDescription]   = useState("");
    const [category, setCategory]         = useState("");
    const [license, setLicense]           = useState("");
    const [tagsStr, setTagsStr]           = useState("");
    const [visibility, setVisibility]     = useState(true);
    const [modStatus, setModStatus]       = useState("approved");
    const [btnColor, setBtnColor]         = useState("0");

    useEffect(() => {
        if (!open || !s_id) return;
        setLoading(true);
        fetch(`/api/admin/sounds/${s_id}`)
            .then(r => r.json())
            .then((d: SoundFull) => {
                setSound(d);
                setTitle(d.title);
                setDescription(d.description ?? "");
                setCategory(d.category);
                setLicense(d.license);
                setTagsStr(d.tags.join(", "));
                setVisibility(d.visibility);
                setModStatus(d.moderationStatus);
                setBtnColor(d.btnColor ?? "0");
            })
            .catch(() => toast.error("Failed to load sound"))
            .finally(() => setLoading(false));
    }, [open, s_id]);

    async function save() {
        if (!title.trim()) { toast.error("Title is required"); return; }
        setSaving(true);
        try {
            const tags = tagsStr.split(/[,\s]+/).map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 10);
            const res = await fetch(`/api/admin/sounds/${s_id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: title.trim(), description, category, license, tags, visibility, moderationStatus: modStatus, btnColor }),
            });
            if (!res.ok) {
                const d = await res.json() as { error?: string };
                throw new Error(d.error ?? "Save failed");
            }
            toast.success("Sound updated");
            onSaved?.();
            onOpenChange(false);
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#111113] shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 sticky top-0 bg-[#111113] z-10">
                        <Dialog.Title className="font-semibold">Edit Sound</Dialog.Title>
                        <div className="flex items-center gap-2">
                            {sound && (
                                <a
                                    href={`/sound/${sound.slug}-${sound.s_id}`}
                                    target="_blank"
                                    className="flex items-center gap-1 text-xs text-white/40 hover:text-orange-400 transition-colors"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" /> Preview
                                </a>
                            )}
                            <Dialog.Close className="rounded-lg p-1.5 text-white/40 hover:text-white hover:bg-white/8 transition-colors">
                                <X className="h-4 w-4" />
                            </Dialog.Close>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-6 w-6 animate-spin text-white/30" />
                        </div>
                    ) : (
                        <div className="p-6 space-y-5">
                            {/* Stats strip */}
                            {sound && (
                                <div className="flex gap-4 text-xs text-white/30 border border-white/6 rounded-xl px-4 py-2.5 bg-white/2">
                                    <span>s_id: <code className="text-white/50">{sound.s_id}</code></span>
                                    <span>·</span>
                                    <span>{sound.views.toLocaleString()} views</span>
                                    <span>·</span>
                                    <span>{sound.downloads.toLocaleString()} downloads</span>
                                    <span>·</span>
                                    <span>{sound.duration}</span>
                                </div>
                            )}

                            {/* Title */}
                            <Field label="Title">
                                <input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    maxLength={100}
                                    className="input-field"
                                    placeholder="Sound title"
                                />
                            </Field>

                            {/* Description */}
                            <Field label="Description">
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    maxLength={600}
                                    rows={3}
                                    className="input-field resize-none"
                                    placeholder="Optional description…"
                                />
                                <p className="text-xs text-white/20 mt-1 text-right">{description.length}/600</p>
                            </Field>

                            {/* Category + License */}
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Category">
                                    <select value={category} onChange={e => setCategory(e.target.value)} className="input-field">
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </Field>
                                <Field label="License">
                                    <select value={license} onChange={e => setLicense(e.target.value)} className="input-field">
                                        {LICENSE_VALUES.map(l => <option key={l} value={l}>{l.replace(/-/g, " ")}</option>)}
                                    </select>
                                </Field>
                            </div>

                            {/* Tags */}
                            <Field label="Tags" hint="comma or space separated, max 10">
                                <input
                                    value={tagsStr}
                                    onChange={e => setTagsStr(e.target.value)}
                                    className="input-field"
                                    placeholder="funny, meme, gaming…"
                                />
                            </Field>

                            {/* Moderation status + visibility */}
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Moderation Status">
                                    <select value={modStatus} onChange={e => setModStatus(e.target.value)} className="input-field">
                                        {MOD_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </Field>
                                <Field label="Visibility">
                                    <select value={String(visibility)} onChange={e => setVisibility(e.target.value === "true")} className="input-field">
                                        <option value="true">Visible</option>
                                        <option value="false">Hidden</option>
                                    </select>
                                </Field>
                            </div>

                            {/* Button color */}
                            <Field label="Button Color (hue)">
                                <div className="flex flex-wrap gap-2">
                                    {BTN_COLORS.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setBtnColor(c)}
                                            className={cn(
                                                "w-7 h-7 rounded-full border-2 transition-all",
                                                btnColor === c ? "border-white scale-110" : "border-transparent opacity-60 hover:opacity-100"
                                            )}
                                            style={{ background: `hsl(${c}, 90%, 55%)` }}
                                            title={`Hue ${c}`}
                                        />
                                    ))}
                                </div>
                            </Field>
                        </div>
                    )}

                    {/* Footer */}
                    {!loading && (
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/8 sticky bottom-0 bg-[#111113]">
                            <Dialog.Close className="px-4 py-2 rounded-xl border border-white/10 text-sm text-white/50 hover:text-white hover:border-white/20 transition-colors">
                                Cancel
                            </Dialog.Close>
                            <button
                                onClick={save}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-sm font-semibold text-white transition-colors"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save Changes
                            </button>
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
                {label}
                {hint && <span className="text-white/30 font-normal ml-1.5 text-xs">{hint}</span>}
            </label>
            {children}
        </div>
    );
}
