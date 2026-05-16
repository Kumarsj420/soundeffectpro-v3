import { Skeleton, SoundGridSkeleton } from "@/app/components/ui/skeleton";

export default function SearchLoading() {
    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="mb-6 space-y-2">
                <Skeleton className="h-8 w-72 rounded-xl" />
                <Skeleton className="h-4 w-36 rounded-lg" />
            </div>

            {/* Search bar */}
            <Skeleton className="h-11 w-full max-w-xl rounded-full mb-6" />

            {/* Sort pills */}
            <div className="flex gap-2 mb-6">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-28 rounded-full" />
                ))}
            </div>

            <SoundGridSkeleton count={9} />
        </div>
    );
}
