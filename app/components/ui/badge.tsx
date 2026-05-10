import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/app/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-medium transition-colors",
  {
    variants: {
      variant: {
        default:  "bg-white/8 text-[#a1a1aa] text-xs px-2 py-0.5",
        primary:  "bg-orange-500/15 text-orange-400 text-xs px-2 py-0.5",
        meme:     "bg-orange-500/15  text-orange-400   text-xs px-2 py-0.5",
        anime:    "bg-pink-500/15    text-pink-400     text-xs px-2 py-0.5",
        gaming:   "bg-emerald-500/15 text-emerald-400  text-xs px-2 py-0.5",
        music:    "bg-violet-500/15  text-violet-400   text-xs px-2 py-0.5",
        movies:   "bg-sky-500/15     text-sky-400      text-xs px-2 py-0.5",
        sports:   "bg-amber-500/15   text-amber-400    text-xs px-2 py-0.5",
        series:   "bg-cyan-500/15    text-cyan-400     text-xs px-2 py-0.5",
        comedy:   "bg-yellow-500/15  text-yellow-400   text-xs px-2 py-0.5",
        politics: "bg-red-500/15     text-red-400      text-xs px-2 py-0.5",
        random:   "bg-purple-500/15  text-purple-400   text-xs px-2 py-0.5",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export type CategoryVariant = "meme" | "anime" | "gaming" | "music" | "movies" | "sports" | "series" | "comedy" | "politics" | "random";

export function getCategoryVariant(category: string | null | undefined): CategoryVariant {
  return ((category?.toLowerCase() ?? 'random') as CategoryVariant);
}
