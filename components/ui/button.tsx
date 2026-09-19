import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "cyan" | "neon";
  size?: "default" | "sm" | "lg" | "icon" | "xs";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium text-sm transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]",
          // Variants
          variant === "default" && "bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-sm shadow-cyan-500/30",
          variant === "destructive" && "bg-rose-600 text-white hover:bg-rose-500 shadow-sm shadow-rose-600/30",
          variant === "outline" && "border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-200 hover:text-white hover:border-slate-600",
          variant === "secondary" && "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-750",
          variant === "ghost" && "hover:bg-slate-800/60 text-slate-400 hover:text-slate-100",
          variant === "cyan" && "border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 hover:border-cyan-400 shadow-sm shadow-cyan-500/20",
          variant === "neon" && "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25",
          // Sizes
          size === "default" && "h-9 px-4 py-2",
          size === "xs" && "h-6 px-2 text-xs rounded",
          size === "sm" && "h-8 rounded-md px-3 text-xs",
          size === "lg" && "h-10 rounded-md px-6 text-base",
          size === "icon" && "h-8 w-8 p-0",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
