import { SoundGridSkeleton } from "@/app/components/ui/skeleton";
import { Skeleton } from "@/app/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="mx-auto max-w-7xl px-4 py-8 space-y-12">
            {/* Hero skeleton */}
            <div className="text-center py-8 space-y-4">
                <Skeleton className="h-12 w-3/4 mx-auto rounded-2xl" />
                <Skeleton className="h-5 w-1/2 mx-auto rounded-xl" />
                <Skeleton className="h-12 w-full max-w-xl mx-auto rounded-full" />
            </div>

            {/* Category chips skeleton */}
            <div className="flex flex-wrap gap-2 justify-center">
                {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-24 rounded-full" />
                ))}
            </div>

            {/* Section skeleton */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-44 rounded-xl" />
                    <Skeleton className="h-4 w-16 rounded-lg" />
                </div>
                <SoundGridSkeleton count={9} />
            </div>

            <div className="space-y-4">
                <Skeleton className="h-6 w-52 rounded-xl" />
                <SoundGridSkeleton count={6} />
            </div>
        </div>
    );
}
