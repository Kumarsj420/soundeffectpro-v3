import { permanentRedirect, notFound } from "next/navigation";

// Force dynamic — this page only redirects or 404s, never statically generated.
export const dynamic = "force-dynamic";

export default async function CatchAll({
    params,
}: {
    params: Promise<{ slug: string[] }>;
}) {
    const { slug: segments } = await params;
    const [first, ...rest] = segments;

    // These are also covered by next.config.ts redirects and middleware,
    // but kept here as a reliable fallback (especially in dev/preview).
    if (first === "search" && rest.length > 0) {
        permanentRedirect(`/search?q=${encodeURIComponent(rest.join(" "))}`);
    }
    if (first === "tag" && rest.length > 0) {
        permanentRedirect(`/search?q=${encodeURIComponent(rest[0])}`);
    }
    if (first === "category" && rest.length > 0) {
        permanentRedirect(`/sounds/${rest[0]}`);
    }
    if (first === "user" && rest.length > 0) {
        permanentRedirect(`/profile/${rest[0]}`);
    }

    notFound();
}
