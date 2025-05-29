"use client";

import { Toast } from "@/app/types/toast.types";
import { ToastWithUndo } from "./ToastWithUndo";

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const ToastContainer = ({ toasts, onClose }: ToastContainerProps) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {toasts.map((toast) => (
        <ToastWithUndo key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};