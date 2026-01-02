import React, { useState, useEffect, useRef } from "react";

interface ValueSliderProps {
  label: string;
  initialValue: number;
  min: number;
  max: number;
  step: number;
  onChange?: (value: number) => void;
}

export const ValueSlider = ({
  label,
  initialValue,
  min,
  max,
  step,
  onChange,
}: ValueSliderProps) => {
  const [value, setValue] = useState(initialValue);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Notify parent when value changes
  useEffect(() => {
    if (onChange) {
      onChange(value);
    }
  }, [value, onChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    updateValueFromEvent(e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      updateValueFromEvent(e as unknown as React.MouseEvent);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const updateValueFromEvent = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const position = e.clientX - rect.left;
    const percentage = Math.max(
      0,
      Math.min(100, (position / rect.width) * 100)
    );

    // Calculate value based on percentage
    const newValue = min + (percentage / 100) * (max - min);

    // Round to nearest step
    const stepValue = Math.round(newValue / step) * step;
    const clampedValue = Math.max(min, Math.min(max, stepValue));

    setValue(clampedValue);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, isDragging]);

  // Calculate percent directly in render
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="">
      <span className="text-sm">{label}</span>
      <div
        ref={containerRef}
        className="flex bg-zinc-70 h-10 gap-1 cursor-pointer relative"
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="bg-yellow-400 flex justify-end items-center font-bold text-zinc-600 p-2 select-none"
          style={{ flex: percent }}
        >
          {value.toFixed(1)}
        </div>
        <div className="bg-zinc-600" style={{ flex: 100 - percent }}></div>
      </div>
    </div>
  );
};
