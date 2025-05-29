"use client";

import { Toast } from "@/app/types/toast.types";
import { CheckCircle, X, AlertCircle, Undo2, Info } from "lucide-react";
import { useEffect, useState } from "react";

interface ToastWithUndoProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export const ToastWithUndo = ({ toast, onClose }: ToastWithUndoProps) => {
  const [timeLeft, setTimeLeft] = useState(toast.duration || 5000);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 100) {
          onClose(toast.id);
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [toast.id, onClose, isPaused]);

  const handleUndo = () => {
    console.log("🎆 Undo button clicked!", toast);
    if (toast.undoAction) {
      console.log("🚀 Calling undo action...");
      toast.undoAction();
      onClose(toast.id);
    } else {
      console.warn("⚠️ No undo action found on toast");
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case "success":
        return "bg-green-50 border-green-200 text-green-800";
      case "error":
        return "bg-red-50 border-red-200 text-red-800";
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-800";
    }
  };

  const progressPercentage = (timeLeft / (toast.duration || 5000)) * 100;

  return (
    <div
      className={`relative overflow-hidden rounded-lg shadow-lg border transition-all duration-300 ${getStyles()}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="p-4">
        <div className="flex items-center space-x-3">
          {getIcon()}
          <p className="text-sm font-medium flex-1">{toast.message}</p>
          
          {toast.undoAction && (
            <button
              onClick={handleUndo}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md bg-white/80 hover:bg-white border border-current/20 transition-colors cursor-pointer"
            >
              <Undo2 className="h-3.5 w-3.5" />
              {toast.undoLabel || "Undo"}
            </button>
          )}
          
          <button
            onClick={() => onClose(toast.id)}
            className="text-current/40 hover:text-current/60 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {toast.countdown !== false && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-current/10">
          <div
            className="h-full bg-current/30 transition-all duration-100 ease-linear"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      )}
    </div>
  );
};