import { ToastMessage, UseToastReturn } from "@/app/types/course.types";
import { useEffect, useState } from "react";

export const useToast = (): UseToastReturn & { clearToast: () => void } => {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Show toast notification
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  // Clear toast notification
  const clearToast = () => {
    setToast(null);
  };

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return {
    toast,
    showToast,
    clearToast,
  };
};
