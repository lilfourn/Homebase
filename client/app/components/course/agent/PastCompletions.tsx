"use client";

import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Eye,
  FileText,
  Trash2,
  XCircle,
} from "lucide-react";
import React, { useState } from "react";
import { useAgents } from "../../../hooks/agents/useAgents";

interface SelectedFile {
  id: string;
  name: string;
  type: string;
  size: number;
}

interface AgentCompletion {
  id: string;
  agentType: string;
  taskName: string;
  status: "completed" | "failed" | "processing";
  completedAt: Date;
  files: SelectedFile[];
  result?: {
    content: string;
    format: string;
    metadata: any;
  };
}

interface PastCompletionsProps {
  completions: AgentCompletion[];
  courseColors: { primary: string; secondary: string };
}

export default function PastCompletions({
  completions,
  courseColors,
}: PastCompletionsProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { deleteTask, isLoading: isContextLoading } = useAgents();

  // Component logging
  React.useEffect(() => {
    console.log("[PastCompletions] Component mounted", {
      completionCount: completions.length,
      courseColors,
    });
    return () => console.log("[PastCompletions] Component unmounted");
  }, [completions.length, courseColors]);

  const toggleExpand = (id: string) => {
    const isExpanded = expandedItems.has(id);
    console.log("[PastCompletions] Toggle expand", {
      completionId: id,
      action: isExpanded ? "collapse" : "expand",
    });

    const newExpanded = new Set(expandedItems);
    if (isExpanded) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5" style={{ color: "#10b981" }} />;
      case "failed":
        return <XCircle className="w-5 h-5" style={{ color: "#ef4444" }} />;
      case "processing":
        return (
          <Clock
            className="w-5 h-5 animate-spin"
            style={{ color: courseColors.primary }}
          />
        );
      default:
        return null;
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
      }
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getAgentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "note-taker": "Note Taker",
      researcher: "Researcher",
      "study-buddy": "Study Buddy",
      assignment: "Assignment Helper",
    };
    return labels[type] || type;
  };

  if (completions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">No past completions yet</p>
        <p className="text-xs mt-1">Your AI agent results will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {completions.map((completion) => {
        const isExpanded = expandedItems.has(completion.id);

        return (
          <div
            key={completion.id}
            className="border rounded-lg overflow-hidden transition-all duration-200"
            style={{
              borderColor:
                completion.status === "processing"
                  ? courseColors.primary + "40"
                  : "#e5e7eb",
            }}
          >
            {/* Header */}
            <div
              className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              onClick={() => toggleExpand(completion.id)}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(completion.status)}
                <div>
                  <h4 className="font-medium text-sm">{completion.taskName}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <span
                      className="px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: courseColors.primary + "20",
                        color: courseColors.primary,
                      }}
                    >
                      {getAgentTypeLabel(completion.agentType)}
                    </span>
                    <span>•</span>
                    <span>{formatDate(completion.completedAt)}</span>
                    <span>•</span>
                    <span>
                      {completion.files.length} file
                      {completion.files.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {completion.status === "completed" && (
                  <>
                    <button
                      title="View Result"
                      className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("View result");
                      }}
                    >
                      <Eye className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      title="Download Result"
                      className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("Download result");
                      }}
                    >
                      <Download className="w-4 h-4 text-gray-600" />
                    </button>
                  </>
                )}
                {completion.status !== "processing" && (
                  <button
                    title="Delete Task"
                    className="p-1.5 rounded-md hover:bg-red-100 transition-colors text-red-500 hover:text-red-700"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await deleteTask(completion.id);
                      } catch (error) {
                        console.error("Failed to delete task:", error);
                      }
                    }}
                    disabled={isContextLoading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  title={isExpanded ? "Collapse" : "Expand"}
                  className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(completion.id);
                  }}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-4 py-3 border-t bg-gray-50">
                <div className="space-y-3">
                  {/* Files Used */}
                  <div>
                    <h5 className="text-xs font-medium text-gray-700 mb-2">
                      Files Used:
                    </h5>
                    <div className="space-y-1">
                      {completion.files.map((file) => (
                        <div
                          key={`${completion.id}-${file.id}`}
                          className="flex items-center gap-2 text-xs text-gray-600"
                        >
                          <FileText className="w-3 h-3" />
                          <span>{file.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Result */}
                  {completion.result && completion.status === "completed" && (
                    <div>
                      <h5 className="text-xs font-medium text-gray-700 mb-2">
                        Result:
                      </h5>
                      <p className="text-xs text-gray-600 bg-white p-3 rounded-md border">
                        {completion.result.content}
                      </p>
                    </div>
                  )}

                  {/* Processing Message */}
                  {completion.status === "processing" && (
                    <div
                      className="flex items-center gap-2 text-sm"
                      style={{ color: courseColors.primary }}
                    >
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>Processing... This may take a few minutes</span>
                    </div>
                  )}

                  {/* Failed Message */}
                  {completion.status === "failed" && (
                    <div className="text-sm text-red-600">
                      Failed to process. Please try again.
                    </div>
                  )}

                  {/* Actions */}
                  {completion.status === "completed" && (
                    <div className="flex gap-2 pt-2">
                      <button
                        className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                        style={{
                          backgroundColor: courseColors.primary,
                          color: "white",
                        }}
                      >
                        View Full Result
                      </button>
                      <button
                        className="px-3 py-1.5 text-xs font-medium rounded-md border transition-colors hover:bg-gray-100"
                        style={{
                          borderColor: courseColors.primary,
                          color: courseColors.primary,
                        }}
                      >
                        Re-run Agent
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
