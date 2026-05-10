import { cn } from "@/app/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-white/6", className)}
      {...props}
    />
  );
}

export function SoundCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/7 bg-[#111113] p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-[51px] w-[62px] rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SoundGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SoundCardSkeleton key={i} />
      ))}
    </div>
  );
}
