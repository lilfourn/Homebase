import { useState, useCallback, useRef } from "react";
import { Toast } from "@/app/types/toast.types";

export const useToastWithUndo = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdCounter = useRef(0);

  const showToast = useCallback(
    (
      message: string,
      type: "success" | "error" | "info" = "info",
      options?: {
        duration?: number;
        undoAction?: () => void;
        undoLabel?: string;
        countdown?: boolean;
      }
    ) => {
      const id = `toast-${toastIdCounter.current++}`;
      const newToast: Toast = {
        id,
        message,
        type,
        duration: options?.duration || 5000,
        undoAction: options?.undoAction,
        undoLabel: options?.undoLabel,
        countdown: options?.countdown,
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto-remove if no undo action
      if (!options?.undoAction) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, options?.duration || 5000);
      }

      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    removeToast,
    clearToasts,
  };
};