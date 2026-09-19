import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "safe" | "warning" | "critical" | "outline" | "cyan" | "purple";
  size?: "default" | "sm" | "xs";
}

function Badge({ className, variant = "default", size = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border font-semibold uppercase tracking-wider transition-colors",
        size === "default" && "px-2.5 py-0.5 text-xs",
        size === "sm" && "px-2 py-0.5 text-[11px]",
        size === "xs" && "px-1.5 py-0.2 text-[9px]",
        variant === "default" && "border-transparent bg-slate-800 text-slate-200",
        variant === "safe" && "border-emerald-500/40 bg-emerald-950/60 text-emerald-400 shadow-sm shadow-emerald-500/10",
        variant === "warning" && "border-amber-500/40 bg-amber-950/60 text-amber-400 shadow-sm shadow-amber-500/10",
        variant === "critical" && "border-rose-500/50 bg-rose-950/70 text-rose-300 shadow-sm shadow-rose-500/20 animate-pulse",
        variant === "cyan" && "border-cyan-500/40 bg-cyan-950/50 text-cyan-300",
        variant === "purple" && "border-purple-500/40 bg-purple-950/50 text-purple-300",
        variant === "outline" && "border-slate-700 text-slate-300",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
