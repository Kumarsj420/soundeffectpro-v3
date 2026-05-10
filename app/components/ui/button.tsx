import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/app/lib/utils";
import { forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] disabled:pointer-events-none disabled:opacity-40 select-none",
  {
    variants: {
      variant: {
        primary:   "bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30",
        secondary: "bg-[#27272a] hover:bg-[#3f3f46] text-white border border-white/8",
        ghost:     "hover:bg-white/6 text-[#a1a1aa] hover:text-white",
        outline:   "border border-white/12 hover:border-white/24 hover:bg-white/4 text-white",
        danger:    "bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20",
        success:   "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20",
      },
      size: {
        sm:   "h-8  px-3 text-xs",
        md:   "h-9  px-4 text-sm",
        lg:   "h-11 px-6 text-sm",
        icon: "h-9  w-9  text-sm",
        "icon-sm": "h-7 w-7 text-xs",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
