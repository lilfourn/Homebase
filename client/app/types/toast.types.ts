export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  duration?: number;
  undoAction?: () => void;
  undoLabel?: string;
  countdown?: boolean;
}

export interface ToastContextType {
  toasts: Toast[];
  showToast: (
    message: string,
    type?: "success" | "error" | "info",
    options?: {
      duration?: number;
      undoAction?: () => void;
      undoLabel?: string;
      countdown?: boolean;
    }
  ) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}