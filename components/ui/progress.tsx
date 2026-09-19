import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  indicatorColor?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  indicatorColor = "bg-cyan-500",
  className,
  ...props
}) => {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-slate-800", className)}
      {...props}
    >
      <div
        className={cn("h-full transition-all duration-300 ease-out", indicatorColor)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
};
