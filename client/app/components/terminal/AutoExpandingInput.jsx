"use client";

import { cn } from "@/lib/utils";
import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function AutoExpandingInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder = "Reply to AI Assistant...",
  minHeight = 96, // Increased height
  className,
}) {
  const textareaRef = useRef(null);
  const [height, setHeight] = useState(minHeight);
  const [maxHeight, setMaxHeight] = useState(300);
  const hiddenDivRef = useRef(null);

  // Calculate max height as 20% of viewport
  useEffect(() => {
    const calculateMaxHeight = () => {
      const viewportHeight = window.innerHeight;
      setMaxHeight(Math.floor(viewportHeight * 0.2));
    };

    calculateMaxHeight();
    window.addEventListener("resize", calculateMaxHeight);
    return () => window.removeEventListener("resize", calculateMaxHeight);
  }, []);

  // Calculate height based on content
  useEffect(() => {
    if (hiddenDivRef.current && textareaRef.current) {
      // Copy content to hidden div to measure height
      hiddenDivRef.current.textContent = value || placeholder;

      // Calculate required height
      const scrollHeight = hiddenDivRef.current.scrollHeight;
      const contentHeight = scrollHeight + 16; // Buffer for growth

      // Apply constraints
      const newHeight = Math.min(Math.max(contentHeight, minHeight), maxHeight);
      setHeight(newHeight);
    }
  }, [value, minHeight, maxHeight, placeholder]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onSubmit(e);
    }
  };

  return (
    <div
      className={cn(
        "bg-gray-50 rounded-2xl border border-gray-200/80 transition-all duration-200 ease-out",
        "focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-200",
        className
      )}
    >
      <form
        onSubmit={handleSubmit}
        className="flex items-start gap-2 p-2"
        style={{ minHeight: `${height}px` }}
      >
        <div className="flex-1 flex items-start relative">
          {/* Hidden div for measuring content height */}
          <div
            ref={hiddenDivRef}
            className="absolute invisible whitespace-pre-wrap break-words font-sans text-base leading-relaxed"
            style={{
              width: "100%",
              wordBreak: "break-word",
              padding: "8px 0",
            }}
            aria-hidden="true"
          />

          {/* Actual textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "w-full flex-1 bg-transparent font-sans text-base text-slate-800",
              "outline-none placeholder:text-slate-400 resize-none px-2 pt-1 pb-2",
              "overflow-hidden"
            )}
            style={{
              height: `${Math.max(24, height - 16)}px`,
              overflowY: height >= maxHeight ? "auto" : "hidden",
            }}
            disabled={isLoading}
            autoComplete="off"
            spellCheck="false"
          />
        </div>
        {/* Submit button */}
        <button
          type="submit"
          disabled={!value.trim() || isLoading}
          className={cn(
            "w-9 h-9 rounded-lg transition-all duration-200",
            "flex items-center justify-center self-end",
            value.trim() && !isLoading
              ? "text-white"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
          style={{
            backgroundColor:
              value.trim() && !isLoading
                ? "var(--custom-primary-color)"
                : undefined,
          }}
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
