"use client";

import { useRef, useEffect, useState } from "react";
import { ChevronRight, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AutoExpandingInput({ 
  value, 
  onChange, 
  onSubmit, 
  isLoading, 
  placeholder = "Enter command or question...",
  minHeight = 40,
  customColors,
  className 
}) {
  const textareaRef = useRef(null);
  const [height, setHeight] = useState(minHeight);
  const [maxHeight, setMaxHeight] = useState(300);
  const hiddenDivRef = useRef(null);

  // Calculate max height as 10% of viewport
  useEffect(() => {
    const calculateMaxHeight = () => {
      const viewportHeight = window.innerHeight;
      setMaxHeight(Math.floor(viewportHeight * 0.1));
    };

    calculateMaxHeight();
    window.addEventListener('resize', calculateMaxHeight);
    return () => window.removeEventListener('resize', calculateMaxHeight);
  }, []);

  // Calculate height based on content
  useEffect(() => {
    if (hiddenDivRef.current && textareaRef.current) {
      // Copy content to hidden div to measure height
      hiddenDivRef.current.textContent = value || placeholder;
      
      // Get computed styles from textarea
      const textareaStyles = window.getComputedStyle(textareaRef.current);
      const lineHeight = parseFloat(textareaStyles.lineHeight);
      const paddingTop = parseFloat(textareaStyles.paddingTop) || 0;
      const paddingBottom = parseFloat(textareaStyles.paddingBottom) || 0;
      
      // Calculate required height
      const scrollHeight = hiddenDivRef.current.scrollHeight;
      const contentHeight = scrollHeight + 16; // Add larger buffer for more growth per line
      
      // Apply constraints
      const newHeight = Math.min(Math.max(contentHeight, minHeight), maxHeight);
      setHeight(newHeight);
    }
  }, [value, minHeight, maxHeight, placeholder]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
      className={cn("bg-white transition-all duration-200 ease-out", className)}
      style={{ minHeight: `${height}px` }}
    >
      <form onSubmit={handleSubmit} className="px-4 py-2.5">
        <div className="flex items-start gap-2">
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1.5" />
          <div className="flex-1 flex items-start gap-2 relative">
            {/* Hidden div for measuring content height */}
            <div
              ref={hiddenDivRef}
              className="absolute invisible whitespace-pre-wrap break-words font-mono text-sm leading-normal"
              style={{
                width: 'calc(100% - 90px)', // Account for button width
                wordBreak: 'break-word',
                padding: '6px 0'
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
                "flex-1 bg-transparent font-mono text-sm text-gray-700 leading-normal",
                "outline-none placeholder:text-gray-400 resize-none py-1",
                "overflow-hidden" // No scrollbar by default
              )}
              style={{
                height: `${Math.max(24, height - 16)}px`, // Subtract padding
                overflowY: height >= maxHeight ? 'auto' : 'hidden'
              }}
              disabled={isLoading}
              autoComplete="off"
              spellCheck="false"
            />
            
            {/* Submit button */}
            <button
              type="submit"
              disabled={!value.trim() || isLoading}
              className={cn(
                "px-3 py-1 rounded-lg transition-all duration-200",
                "flex-shrink-0 flex items-center gap-1.5 self-end mb-0.5",
                value.trim() && !isLoading
                  ? "text-white hover:shadow-md"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
              style={{
                backgroundColor: value.trim() && !isLoading ? customColors.primary : undefined
              }}
              onMouseEnter={(e) => {
                if (value.trim() && !isLoading) {
                  e.currentTarget.style.backgroundColor = customColors.primaryDark;
                }
              }}
              onMouseLeave={(e) => {
                if (value.trim() && !isLoading) {
                  e.currentTarget.style.backgroundColor = customColors.primary;
                }
              }}
            >
              <span className="text-sm font-medium">Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}