import { ToastNotificationProps } from "@/app/types/course.types";
import { CheckCircle, X } from "lucide-react";

export const ToastNotification = ({
  toast,
  onClose,
}: ToastNotificationProps) => {
  if (!toast) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-3 min-w-80 max-w-md transition-all duration-300 ${
        toast.type === "success"
          ? "bg-green-50 border border-green-200 text-green-800"
          : "bg-red-50 border border-red-200 text-red-800"
      }`}
    >
      {toast.type === "success" ? (
        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
      ) : (
        <X className="h-5 w-5 text-red-600 flex-shrink-0" />
      )}
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
