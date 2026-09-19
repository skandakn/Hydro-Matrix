import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  onValueChange?: (val: number) => void;
  accentColor?: "cyan" | "rose" | "amber" | "emerald";
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, min = 0, max = 100, step = 1, value = 0, onValueChange, accentColor = "cyan", ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

    const getTrackBg = () => {
      if (accentColor === "rose") return `linear-gradient(to right, #f43f5e ${percentage}%, #1e293b ${percentage}%)`;
      if (accentColor === "amber") return `linear-gradient(to right, #f59e0b ${percentage}%, #1e293b ${percentage}%)`;
      if (accentColor === "emerald") return `linear-gradient(to right, #10b981 ${percentage}%, #1e293b ${percentage}%)`;
      return `linear-gradient(to right, #06b6d4 ${percentage}%, #1e293b ${percentage}%)`;
    };

    return (
      <div className="relative flex w-full touch-none select-none items-center py-1">
        <input
          type="range"
          ref={ref}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onValueChange?.(parseFloat(e.target.value))}
          style={{ background: getTrackBg() }}
          className={cn(
            "h-2 w-full appearance-none rounded-full cursor-pointer transition-all focus:outline-none",
            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-cyan-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
Slider.displayName = "Slider";
