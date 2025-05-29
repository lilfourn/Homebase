"use client";

import { useState } from "react";
import { X, UserPlus, SkipForward, BookOpen } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

interface TASetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTA: (taData: {
    name: string;
    email: string;
    officeHours?: string;
    assignmentRule?: string;
  }) => void;
  onSkip: () => void;
  onNoTA: () => void;
  courseName?: string;
}

export function TASetupModal({
  isOpen,
  onClose,
  onAddTA,
  onSkip,
  onNoTA,
  courseName,
}: TASetupModalProps) {
  const [taData, setTaData] = useState({
    name: "",
    email: "",
    officeHours: "",
    assignmentRule: "",
  });

  const handleAddTA = () => {
    if (taData.name && taData.email) {
      onAddTA(taData);
      setTaData({ name: "", email: "", officeHours: "", assignmentRule: "" });
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
                No TA Information Found
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                We couldn&apos;t find any teaching assistants in your syllabus
                {courseName ? ` for ${courseName}` : ""}.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <p className="text-sm text-gray-700">
              Would you like to add TA information manually?
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TA Name *
                </label>
                <Input
                  type="text"
                  value={taData.name}
                  onChange={(e) =>
                    setTaData({ ...taData, name: e.target.value })
                  }
                  placeholder="e.g., John Smith"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TA Email *
                </label>
                <Input
                  type="email"
                  value={taData.email}
                  onChange={(e) =>
                    setTaData({ ...taData, email: e.target.value })
                  }
                  placeholder="e.g., john.smith@university.edu"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Office Hours (optional)
                </label>
                <Input
                  type="text"
                  value={taData.officeHours}
                  onChange={(e) =>
                    setTaData({ ...taData, officeHours: e.target.value })
                  }
                  placeholder="e.g., MWF 2-4 PM, Room 302"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assignment Rule (optional)
                </label>
                <Input
                  type="text"
                  value={taData.assignmentRule}
                  onChange={(e) =>
                    setTaData({ ...taData, assignmentRule: e.target.value })
                  }
                  placeholder="e.g., Last names A-M"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleAddTA}
              disabled={!taData.name || !taData.email}
              className="w-full bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add TA Information
            </Button>

            <div className="flex gap-2">
              <Button
                onClick={onSkip}
                variant="outline"
                className="flex-1 cursor-pointer"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Skip for Now
              </Button>

              <Button
                onClick={onNoTA}
                variant="outline"
                className="flex-1 cursor-pointer"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Class Has No TA
              </Button>
            </div>
          </div>
        </div>
      </div>
  );
}