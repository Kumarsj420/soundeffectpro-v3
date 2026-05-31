"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { CATEGORIES, LICENSE_VALUES } from "@/app/lib/constants";
import { cn } from "@/app/lib/utils";
import { toast } from "sonner";
import SoundEditDialog from "./SoundEditDialog";
import ModerationActions from "./ModerationActions";
import {
    Search, ChevronLeft, ChevronRight, Eye, EyeOff,
    CheckSquare, Square, Loader2, Pencil, Trash2, Clock,
} from "lucide-react";

interface Sound {
    _id: string; s_id: string; slug: string; title: string;
    category: string; license: string; visibility: boolean;
    trendScore: number; views: number; createdAt: string;
}

interface PendingSound {
    _id: string; s_id: string; slug: string; title: string; category: string;
    duration: string; tags: string[]; description: string;
    user: { uid: string; name: string }; createdAt: string; moderationStatus: string;
}

type ActiveTab = "all" | "pending";

const LICENSE_COLOR: Record<string, string> = {
    "unknown":          "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    "copyrighted":      "bg-red-500/15    text-red-400    border-red-500/20",
    "royalty-free":     "bg-green-500/15  text-green-400  border-green-500/20",
    "creative-commons": "bg-blue-500/15   text-blue-400   border-blue-500/20",
    "public-domain":    "bg-violet-500/15 text-violet-400 border-violet-500/20",
};

function LicenseBadge({ value }: { value: string }) {
    return (
        <span className={cn("inline-block rounded-full border px-2 py-0.5 text-xs font-medium capitalize", LICENSE_COLOR[value] ?? "bg-white/8 text-white/50 border-white/10")}>
            {value.replace(/-/g, " ")}
        </span>
    );
}

function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
}

export default function AdminSoundsTable({ initialTab = "all" }: { initialTab?: ActiveTab }) {
    const [tab, setTab]             = useState<ActiveTab>(initialTab);

    // All sounds state
    const [sounds,   setSounds]     = useState<Sound[]>([]);
    const [total,    setTotal]      = useState(0);
    const [pages,    setPages]      = useState(1);
    const [loading,  setLoading]    = useState(false);
    const [page,     setPage]       = useState(1);
    const [search,   setSearch]     = useState("");
    const [license,  setLicense]    = useState("");
    const [category, setCategory]   = useState("");
    const [visFilter,setVisFilter]  = useState("");
    const [selected, setSelected]   = useState<Set<string>>(new Set());
    const [bulkField,  setBulkField]  = useState("license");
    const [bulkValue,  setBulkValue]  = useState("");
    const [applying,   setApplying]   = useState(false);
    const [bulkMsg,    setBulkMsg]    = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Edit dialog state
    const [editSId, setEditSId]     = useState<string | null>(null);
    const [editOpen, setEditOpen]   = useState(false);

    // Pending moderation state
    const [pending,     setPending]     = useState<PendingSound[]>([]);
    const [pendingTotal,setPendingTotal]= useState(0);
    const [pendingLoad, setPendingLoad] = useState(false);

    // Debounced search
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    }, [search]);

    // Fetch all sounds
    const fetchSounds = useCallback(async () => {
        setLoading(true); setSelected(new Set()); setBulkMsg("");
        const sp = new URLSearchParams({
            page: String(page), limit: "50",
            ...(license    && { license }),
            ...(category   && { category }),
            ...(visFilter  && { visibility: visFilter }),
            ...(debouncedSearch && { search: debouncedSearch }),
        });
        try {
            const res  = await fetch(`/api/admin/sounds?${sp}`);
            const data = await res.json() as { sounds: Sound[]; total: number; pages: number };
            setSounds(data.sounds); setTotal(data.total); setPages(data.pages);
        } finally { setLoading(false); }
    }, [page, license, category, visFilter, debouncedSearch]);

    useEffect(() => { if (tab === "all") fetchSounds(); }, [tab, fetchSounds]);
    useEffect(() => { setPage(1); }, [license, category, visFilter]);

    // Fetch pending moderation queue
    const fetchPending = useCallback(async () => {
        setPendingLoad(true);
        try {
            const res = await fetch("/api/admin/sounds?moderationStatus=pending&limit=100&page=1");
            const d   = await res.json() as { sounds: Array<Sound & { duration?: string; tags?: string[]; description?: string; user?: { uid: string; name: string }; moderationStatus?: string }>; total: number };
            const mapped = d.sounds.map(s => ({
                _id: s._id, s_id: s.s_id, slug: s.slug, title: s.title,
                category: s.category, duration: s.duration ?? "—",
                tags: s.tags ?? [], description: s.description ?? "",
                user: s.user ?? { uid: "", name: "Unknown" },
                createdAt: s.createdAt, moderationStatus: "pending",
            }));
            setPending(mapped); setPendingTotal(d.total);
        } catch { toast.error("Failed to load pending"); }
        finally { setPendingLoad(false); }
    }, []);

    useEffect(() => { if (tab === "pending") fetchPending(); }, [tab, fetchPending]);

    const allOnPageSelected = sounds.length > 0 && sounds.every(s => selected.has(s.s_id));
    function toggleAll() {
        if (allOnPageSelected) setSelected(prev => { const n = new Set(prev); sounds.forEach(s => n.delete(s.s_id)); return n; });
        else setSelected(prev => { const n = new Set(prev); sounds.forEach(s => n.add(s.s_id)); return n; });
    }
    function toggleOne(s_id: string) {
        setSelected(prev => { const n = new Set(prev); n.has(s_id) ? n.delete(s_id) : n.add(s_id); return n; });
    }

    async function applyBulk() {
        if (selected.size === 0 || !bulkValue) return;
        setApplying(true); setBulkMsg("");
        const update = bulkField === "visibility" ? { visibility: bulkValue === "true" } : { [bulkField]: bulkValue };
        try {
            const res  = await fetch("/api/admin/sounds", {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: Array.from(selected), update }),
            });
            const data = await res.json() as { modified?: number; error?: string };
            if (!res.ok) throw new Error(data.error);
            setBulkMsg(`✓ Updated ${data.modified} sound(s)`);
            setSelected(new Set()); await fetchSounds();
        } catch (err) { setBulkMsg(`✗ ${(err as Error).message}`); }
        finally { setApplying(false); }
    }

    async function deleteSound(s_id: string, title: string) {
        if (!confirm(`Delete "${title}"? This is permanent and will remove the audio from R2.`)) return;
        setDeletingId(s_id);
        try {
            const res = await fetch(`/api/admin/sounds/${s_id}`, { method: "DELETE" });
            if (!res.ok) { const d = await res.json() as { error?: string }; throw new Error(d.error); }
            toast.success("Sound deleted");
            setSounds(prev => prev.filter(s => s.s_id !== s_id));
            setTotal(prev => prev - 1);
        } catch (err) { toast.error((err as Error).message); }
        finally { setDeletingId(null); }
    }

    function openEdit(s_id: string) { setEditSId(s_id); setEditOpen(true); }

    return (
        <div className="space-y-5">
            {/* Header + tabs */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Sounds</h1>
                    <p className="text-white/40 text-sm mt-0.5">{total.toLocaleString()} sounds total</p>
                </div>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 border-b border-white/8 mx-0">
                <TabBtn active={tab === "all"}     onClick={() => setTab("all")}>All Sounds</TabBtn>
                <TabBtn active={tab === "pending"} onClick={() => setTab("pending")}>
                    Pending Moderation
                    {pendingTotal > 0 && (
                        <span className="ml-1.5 rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">{pendingTotal}</span>
                    )}
                </TabBtn>
            </div>

            {/* ── Pending tab ── */}
            {tab === "pending" && (
                <div>
                    {pendingLoad ? (
                        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/30" /></div>
                    ) : (
                        <ModerationActions sounds={pending} />
                    )}
                </div>
            )}

            {/* ── All sounds tab ── */}
            {tab === "all" && (
                <>
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3">
                        <div className="relative flex-1 min-w-48">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
                            <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Search titles…"
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-orange-500/50 transition-colors" />
                        </div>
                        <select value={license} onChange={e => setLicense(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500/50 transition-colors">
                            <option value="">All licenses</option>
                            {LICENSE_VALUES.map(l => <option key={l} value={l}>{l.replace(/-/g, " ")}</option>)}
                        </select>
                        <select value={category} onChange={e => setCategory(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500/50 transition-colors">
                            <option value="">All categories</option>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={visFilter} onChange={e => setVisFilter(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500/50 transition-colors">
                            <option value="">All visibility</option>
                            <option value="true">Visible</option>
                            <option value="false">Hidden</option>
                        </select>
                    </div>

                    {/* Bulk action bar */}
                    {selected.size > 0 && (
                        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-orange-500/10 border border-orange-500/20 px-4 py-3">
                            <span className="text-sm font-semibold text-orange-400">{selected.size} selected</span>
                            <span className="text-white/20">|</span>
                            <select value={bulkField} onChange={e => { setBulkField(e.target.value); setBulkValue(""); }}
                                className="bg-[#0d0d0f] border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none">
                                <option value="license">Update license</option>
                                <option value="visibility">Update visibility</option>
                                <option value="category">Update category</option>
                            </select>
                            {bulkField === "license" && (
                                <select value={bulkValue} onChange={e => setBulkValue(e.target.value)}
                                    className="bg-[#0d0d0f] border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none">
                                    <option value="">— pick license —</option>
                                    {LICENSE_VALUES.map(l => <option key={l} value={l}>{l.replace(/-/g, " ")}</option>)}
                                </select>
                            )}
                            {bulkField === "visibility" && (
                                <select value={bulkValue} onChange={e => setBulkValue(e.target.value)}
                                    className="bg-[#0d0d0f] border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none">
                                    <option value="">— pick —</option>
                                    <option value="true">Visible</option>
                                    <option value="false">Hidden</option>
                                </select>
                            )}
                            {bulkField === "category" && (
                                <select value={bulkValue} onChange={e => setBulkValue(e.target.value)}
                                    className="bg-[#0d0d0f] border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none">
                                    <option value="">— pick category —</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            )}
                            <button onClick={applyBulk} disabled={applying || !bulkValue}
                                className="flex items-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 px-3 py-1.5 text-sm font-semibold text-white transition-colors">
                                {applying && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Apply
                            </button>
                            <button onClick={() => setSelected(new Set())} className="text-sm text-white/40 hover:text-white transition-colors">Deselect</button>
                            {bulkMsg && <span className={cn("text-sm", bulkMsg.startsWith("✓") ? "text-green-400" : "text-red-400")}>{bulkMsg}</span>}
                        </div>
                    )}

                    {/* Table */}
                    <div className="rounded-2xl border border-white/8 overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-white/30" /></div>
                        ) : sounds.length === 0 ? (
                            <div className="py-20 text-center text-white/30 text-sm">No sounds found</div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="border-b border-white/8 bg-white/2">
                                    <tr>
                                        <th className="w-10 px-4 py-3">
                                            <button onClick={toggleAll} className="text-white/40 hover:text-white transition-colors">
                                                {allOnPageSelected ? <CheckSquare className="h-4 w-4 text-orange-400" /> : <Square className="h-4 w-4" />}
                                            </button>
                                        </th>
                                        <th className="text-left px-3 py-3 text-white/50 font-medium">Title</th>
                                        <th className="text-left px-3 py-3 text-white/50 font-medium hidden md:table-cell">Category</th>
                                        <th className="text-left px-3 py-3 text-white/50 font-medium">License</th>
                                        <th className="text-center px-3 py-3 text-white/50 font-medium hidden lg:table-cell">Vis</th>
                                        <th className="text-right px-3 py-3 text-white/50 font-medium hidden lg:table-cell">Views</th>
                                        <th className="text-right px-4 py-3 text-white/50 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {sounds.map(s => (
                                        <tr key={s._id} className={cn("transition-colors", selected.has(s.s_id) ? "bg-orange-500/8" : "hover:bg-white/2")}>
                                            <td className="px-4 py-3">
                                                <button onClick={() => toggleOne(s.s_id)} className="text-white/40 hover:text-orange-400 transition-colors">
                                                    {selected.has(s.s_id) ? <CheckSquare className="h-4 w-4 text-orange-400" /> : <Square className="h-4 w-4" />}
                                                </button>
                                            </td>
                                            <td className="px-3 py-3 max-w-55">
                                                <Link href={`/sound/${s.slug || s.s_id}-${s.s_id}`} target="_blank"
                                                    className="text-white hover:text-orange-400 transition-colors line-clamp-1">{s.title}</Link>
                                            </td>
                                            <td className="px-3 py-3 text-white/40 hidden md:table-cell">{s.category}</td>
                                            <td className="px-3 py-3"><LicenseBadge value={s.license} /></td>
                                            <td className="px-3 py-3 text-center hidden lg:table-cell">
                                                {s.visibility ? <Eye className="h-4 w-4 text-green-400 mx-auto" /> : <EyeOff className="h-4 w-4 text-white/20 mx-auto" />}
                                            </td>
                                            <td className="px-3 py-3 text-right text-white/40 tabular-nums hidden lg:table-cell">{fmt(s.views)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => openEdit(s.s_id)}
                                                        className="p-1.5 rounded-lg text-white/30 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                                                        title="Edit">
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteSound(s.s_id, s.title)}
                                                        disabled={deletingId === s.s_id}
                                                        className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-colors"
                                                        title="Delete">
                                                        {deletingId === s.s_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination */}
                    {pages > 1 && (
                        <div className="flex items-center justify-between text-sm text-white/40">
                            <span>{((page - 1) * 50) + 1}–{Math.min(page * 50, total)} of {total.toLocaleString()}</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 hover:border-orange-500/40 hover:text-orange-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                    <ChevronLeft className="h-4 w-4" /> Prev
                                </button>
                                <span className="px-2">Page {page} / {pages}</span>
                                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                                    className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 hover:border-orange-500/40 hover:text-orange-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                    Next <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Edit dialog */}
            {editSId && (
                <SoundEditDialog
                    s_id={editSId}
                    open={editOpen}
                    onOpenChange={o => { setEditOpen(o); if (!o) setEditSId(null); }}
                    onSaved={fetchSounds}
                />
            )}
        </div>
    );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button onClick={onClick}
            className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                active ? "border-orange-500 text-orange-400" : "border-transparent text-white/50 hover:text-white"
            )}>
            {active && <Clock className="h-3.5 w-3.5" />}
            {children}
        </button>
    );
}
