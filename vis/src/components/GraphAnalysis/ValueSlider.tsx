import React, { useState, useEffect, useRef, useCallback } from "react";
import { memo } from "react";

interface ValueSliderProps {
  label: string;
  initialValue: number;
  min: number;
  max: number;
  step: number;
  onChange?: (value: number) => void;
  tooltip?: string;
}

const ValueSliderComponent = ({
  label,
  initialValue,
  min,
  max,
  step,
  onChange,
  tooltip,
}: ValueSliderProps) => {
  const [value, setValue] = useState(initialValue);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Define updateValueFromEvent before it's used in other callbacks
  const updateValueFromEvent = useCallback(
    (e: React.MouseEvent) => {
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
    },
    [min, max, step]
  );

  // Notify parent when value changes
  useEffect(() => {
    if (onChange) {
      onChange(value);
    }
  }, [value, onChange]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      setIsDragging(true);
      updateValueFromEvent(e);
    },
    [updateValueFromEvent]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        updateValueFromEvent(e as unknown as React.MouseEvent);
      }
    },
    [isDragging, updateValueFromEvent]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

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
    <div className="flex flex-col gap-0.5">
      <span className="text-sm">{label}</span>
      {tooltip && <span className="text-xs opacity-50">{tooltip}</span>}
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

export const ValueSlider = memo(ValueSliderComponent);
