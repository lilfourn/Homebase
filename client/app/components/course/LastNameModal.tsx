"use client";

import { useState } from "react";
import { X, User, Hash } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

interface LastNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { lastName: string; studentId?: string }) => void;
  currentFullName?: string;
  assignmentRule?: string;
}

export function LastNameModal({
  isOpen,
  onClose,
  onSubmit,
  currentFullName,
  assignmentRule,
}: LastNameModalProps) {
  const [formData, setFormData] = useState({
    lastName: "",
    studentId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (formData.lastName.trim()) {
      setIsSubmitting(true);
      await onSubmit({
        lastName: formData.lastName.trim(),
        studentId: formData.studentId.trim() || undefined,
      });
      setIsSubmitting(false);
      setFormData({ lastName: "", studentId: "" });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 w-screen h-screen flex items-center justify-center p-4 z-50"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Complete Your Profile for TA Matching
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                We need your last name to match you with your assigned TA.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {currentFullName && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                Current name: <span className="font-medium">{currentFullName}</span>
              </p>
            </div>
          )}

          {assignmentRule && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                TA Assignment Rule: <span className="font-medium">{assignmentRule}</span>
              </p>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  placeholder="e.g., Smith"
                  className="pl-10 w-full"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This will be used to match you with your assigned TA
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Student ID / EID (optional)
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  value={formData.studentId}
                  onChange={(e) =>
                    setFormData({ ...formData, studentId: e.target.value })
                  }
                  placeholder="e.g., 12345678"
                  className="pl-10 w-full"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Some TAs are assigned based on student ID ranges
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleSubmit}
              disabled={!formData.lastName.trim() || isSubmitting}
              className="w-full bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
            >
              {isSubmitting ? "Saving..." : "Save Information"}
            </Button>

            <Button
              onClick={onClose}
              variant="outline"
              className="w-full cursor-pointer"
              disabled={isSubmitting}
            >
              Skip for Now
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            You can update this information later in your profile settings
          </p>
        </div>
      </div>
  );
}