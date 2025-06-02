"use client";

import { Edit, FileText, X } from "lucide-react";
import React from "react";

interface AgentResultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskName: string;
  agentType: string;
  result: {
    content: string;
    format: string;
    metadata: any;
  };
  files: Array<{
    id: string;
    name: string;
  }>;
  completedAt: Date;
  onEdit?: () => void;
}

export default function AgentResultDialog({
  isOpen,
  onClose,
  taskName,
  agentType,
  result,
  files,
  completedAt,
  onEdit,
}: AgentResultDialogProps) {
  const getAgentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "note-taker": "Note Taker",
      researcher: "Researcher",
      "study-buddy": "Study Buddy",
      assignment: "Assignment Helper",
    };
    return labels[type] || type;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 w-screen h-screen flex items-center justify-center p-8 z-50"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col"
        style={{ maxHeight: "calc(100vh - 4rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-start justify-between flex-shrink-0">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-800">{taskName}</h2>
            <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
              <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium">
                {getAgentTypeLabel(agentType)}
              </span>
              <span>•</span>
              <span>{formatDate(completedAt)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Files Used Section */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Files Used
            </h3>
            <div className="space-y-1">
              {files.map((file, index) => (
                <div
                  key={`${file.id || index}-${file.name}`}
                  className="flex items-center gap-2 text-xs text-gray-600"
                >
                  <FileText className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Result Content */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Result</h3>
            {result.format === "json" ? (
              <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-x-auto border border-gray-200">
                {JSON.stringify(JSON.parse(result.content), null, 2)}
              </pre>
            ) : (
              <div className="whitespace-pre-wrap text-xs bg-gray-50 p-3 rounded-md border border-gray-200">
                {result.content}
              </div>
            )}
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="px-6 py-3 border-t bg-gray-50 flex-shrink-0 rounded-b-lg">
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (onEdit) {
                  onEdit();
                }
                onClose();
              }}
              className="px-3 py-1.5 text-sm bg-[var(--custom-primary-color)] text-white rounded-md hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--custom-primary-color)] flex items-center gap-2 cursor-pointer"
            >
              <Edit className="w-3 h-3" />
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
