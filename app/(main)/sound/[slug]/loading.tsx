import { Skeleton, SoundCardSkeleton } from "@/app/components/ui/skeleton";

export default function SoundPageLoading() {
    return (
        <div className="mx-auto max-w-5xl px-4 py-8">
            {/* Breadcrumb */}
            <Skeleton className="h-4 w-52 mb-6 rounded-lg" />

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-9 w-3/4 rounded-xl" />
                        <Skeleton className="h-4 w-64 rounded-lg" />
                    </div>

                    {/* Player */}
                    <Skeleton className="h-36 w-full rounded-2xl" />

                    {/* Description */}
                    <Skeleton className="h-28 w-full rounded-2xl" />

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <Skeleton key={i} className="h-7 w-20 rounded-full" />
                        ))}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3">
                        <Skeleton className="h-10 w-28 rounded-full" />
                        <Skeleton className="h-10 w-24 rounded-full" />
                        <Skeleton className="h-10 w-24 rounded-full" />
                    </div>
                </div>

                {/* Sidebar */}
                <aside className="space-y-3">
                    <Skeleton className="h-5 w-36 rounded-lg mb-1" />
                    {Array.from({ length: 5 }).map((_, i) => (
                        <SoundCardSkeleton key={i} />
                    ))}
                </aside>
            </div>
        </div>
    );
}
