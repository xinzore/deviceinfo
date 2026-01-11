"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "./utils";

interface DualRangeSliderProps {
    className?: string;
    min: number;
    max: number;
    value: [number, number];
    onValueChange: (value: [number, number]) => void;
    step?: number;
    unit?: string;
    showLabels?: boolean;
    showTooltip?: boolean;
    formatValue?: (value: number) => string;
}

function DualRangeSlider({
    className,
    min,
    max,
    value,
    onValueChange,
    step = 1,
    unit = "",
    showLabels = true,
    showTooltip = true,
    formatValue,
    ...props
}: DualRangeSliderProps) {
    const [isHovering, setIsHovering] = React.useState<number | null>(null);
    const [isDragging, setIsDragging] = React.useState<number | null>(null);

    const formatDisplay = (val: number) => {
        if (formatValue) return formatValue(val);
        return unit ? `${val} ${unit}` : `${val}`;
    };

    const getPercentage = (val: number) => ((val - min) / (max - min)) * 100;

    return (
        <div className="relative w-full select-none px-4">
            {/* Min/Max labels at the edges */}
            {showLabels && (
                <div className="flex justify-between mb-3 text-xs text-muted-foreground/70">
                    <span>{formatDisplay(min)}</span>
                    <span>{formatDisplay(max)}</span>
                </div>
            )}

            {/* Floating value indicators */}
            <div className="relative h-8 mb-1">
                {/* Min value bubble */}
                <div
                    className={cn(
                        "absolute -translate-x-1/2 transition-all duration-200 ease-out",
                        (isHovering === 0 || isDragging === 0) ? "scale-110" : "scale-100"
                    )}
                    style={{ left: `${getPercentage(value[0])}%` }}
                >
                    <div className={cn(
                        "relative px-2.5 py-1 rounded-lg text-xs font-medium",
                        "bg-gradient-to-b from-blue-500 to-blue-600",
                        "text-white shadow-lg shadow-blue-500/25",
                        "border border-blue-400/30",
                        "transition-all duration-200",
                        (isHovering === 0 || isDragging === 0) && "shadow-xl shadow-blue-500/40"
                    )}>
                        {formatDisplay(value[0])}
                        {/* Arrow pointing down */}
                        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-blue-600 rotate-45 border-r border-b border-blue-400/30" />
                    </div>
                </div>

                {/* Max value bubble */}
                <div
                    className={cn(
                        "absolute -translate-x-1/2 transition-all duration-200 ease-out",
                        (isHovering === 1 || isDragging === 1) ? "scale-110" : "scale-100"
                    )}
                    style={{ left: `${getPercentage(value[1])}%` }}
                >
                    <div className={cn(
                        "relative px-2.5 py-1 rounded-lg text-xs font-medium",
                        "bg-gradient-to-b from-violet-500 to-violet-600",
                        "text-white shadow-lg shadow-violet-500/25",
                        "border border-violet-400/30",
                        "transition-all duration-200",
                        (isHovering === 1 || isDragging === 1) && "shadow-xl shadow-violet-500/40"
                    )}>
                        {formatDisplay(value[1])}
                        {/* Arrow pointing down */}
                        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-violet-600 rotate-45 border-r border-b border-violet-400/30" />
                    </div>
                </div>
            </div>

            <SliderPrimitive.Root
                min={min}
                max={max}
                step={step}
                value={value}
                onValueChange={onValueChange as (value: number[]) => void}
                className={cn(
                    "relative flex w-full touch-none items-center py-2",
                    className
                )}
                {...props}
            >
                {/* Track background with gradient glow effect */}
                <SliderPrimitive.Track className="relative h-3 w-full overflow-hidden rounded-full bg-white/5 backdrop-blur-sm border border-white/10 shadow-inner">
                    {/* Inactive track gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-800/50 via-slate-700/50 to-slate-800/50" />

                    {/* Active range with gradient */}
                    <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]" />
                </SliderPrimitive.Track>

                {/* Min thumb */}
                <SliderPrimitive.Thumb
                    className={cn(
                        "block h-6 w-6 rounded-full",
                        "bg-gradient-to-b from-white to-slate-100",
                        "border-2 border-blue-500",
                        "shadow-lg shadow-blue-500/30",
                        "ring-0 ring-blue-400/50 transition-all duration-200",
                        "hover:ring-4 hover:scale-110 hover:shadow-xl hover:shadow-blue-500/50",
                        "focus:outline-none focus:ring-4 focus:scale-110",
                        "active:scale-95",
                        "cursor-grab active:cursor-grabbing",
                        "before:absolute before:inset-1.5 before:rounded-full before:bg-gradient-to-b before:from-blue-400 before:to-blue-600"
                    )}
                    onPointerEnter={() => setIsHovering(0)}
                    onPointerLeave={() => setIsHovering(null)}
                    onPointerDown={() => setIsDragging(0)}
                    onPointerUp={() => setIsDragging(null)}
                />

                {/* Max thumb */}
                <SliderPrimitive.Thumb
                    className={cn(
                        "block h-6 w-6 rounded-full",
                        "bg-gradient-to-b from-white to-slate-100",
                        "border-2 border-violet-500",
                        "shadow-lg shadow-violet-500/30",
                        "ring-0 ring-violet-400/50 transition-all duration-200",
                        "hover:ring-4 hover:scale-110 hover:shadow-xl hover:shadow-violet-500/50",
                        "focus:outline-none focus:ring-4 focus:scale-110",
                        "active:scale-95",
                        "cursor-grab active:cursor-grabbing",
                        "before:absolute before:inset-1.5 before:rounded-full before:bg-gradient-to-b before:from-violet-400 before:to-violet-600"
                    )}
                    onPointerEnter={() => setIsHovering(1)}
                    onPointerLeave={() => setIsHovering(null)}
                    onPointerDown={() => setIsDragging(1)}
                    onPointerUp={() => setIsDragging(null)}
                />
            </SliderPrimitive.Root>

            {/* Glow effect under active range */}
            <div
                className="absolute h-1 bottom-0 left-0 rounded-full bg-gradient-to-r from-blue-500/20 via-indigo-500/30 to-violet-500/20 blur-md pointer-events-none"
                style={{
                    left: `${getPercentage(value[0])}%`,
                    width: `${getPercentage(value[1]) - getPercentage(value[0])}%`
                }}
            />
        </div>
    );
}

export { DualRangeSlider };
