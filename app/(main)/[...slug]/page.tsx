import { permanentRedirect, notFound } from "next/navigation";
import { connectDB } from "@/app/lib/db";
import File from "@/app/lib/models/File";

export const dynamic = "force-dynamic";

// Strip old random suffix like "-zqlmx" (4–6 lowercase letters appended by the old system)
function stripOldSuffix(slug: string): string | null {
    const m = slug.match(/^(.+)-([a-z]{4,6})$/);
    return m ? m[1] : null;
}

export default async function LegacyRedirectPage({
    params,
}: {
    params: Promise<{ slug: string[] }>;
}) {
    const { slug: segments } = await params;
    const [first, ...rest] = segments;

    // /search/:query → /search?q=:query  (next.config redirects handle this at the edge,
    // but catch it here too in case they arrive via a route group miss)
    if (first === "search" && rest.length > 0) {
        permanentRedirect(`/search?q=${encodeURIComponent(rest.join(" "))}`);
    }

    // /tag/:tag → /search?q=:tag
    if (first === "tag" && rest.length > 0) {
        permanentRedirect(`/search?q=${encodeURIComponent(rest[0])}`);
    }

    // Only treat single-segment paths as old sound slugs (e.g., /ahh-its-comming-out-zqlmx)
    if (segments.length !== 1) notFound();

    const slug = first;

    try {
        await connectDB();
    } catch {
        notFound();
    }

    // Try exact match first
    const exact = await File.findOne({ slug, visibility: true }).select("slug").lean();
    if (exact) permanentRedirect(`/sound/${slug}`);

    // Try stripping the old random suffix and look for the base slug
    const base = stripOldSuffix(slug);
    if (base) {
        const baseDoc = await File.findOne({ slug: base, visibility: true }).select("slug").lean();
        if (baseDoc) permanentRedirect(`/sound/${base}`);
    }

    notFound();
}
