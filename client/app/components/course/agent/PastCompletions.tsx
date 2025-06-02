"use client";

import {
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileText,
  Trash2,
  XCircle,
} from "lucide-react";
import React, { useState } from "react";
import { useAgents } from "../../../hooks/agents/useAgents";
import AgentResultDialog from "./AgentResultDialog";

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
  const [selectedCompletion, setSelectedCompletion] =
    useState<AgentCompletion | null>(null);
  const { deleteTask, isLoading: isContextLoading } = useAgents();

  // Component logging
  React.useEffect(() => {
    console.log("[PastCompletions] Component mounted", {
      completionCount: completions.length,
      courseColors,
    });
    return () => console.log("[PastCompletions] Component unmounted");
  }, [completions.length, courseColors]);

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

  const handleDownloadResult = (completion: AgentCompletion) => {
    if (!completion.result) return;

    const blob = new Blob([completion.result.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${completion.taskName}.${
      completion.result.format === "json" ? "json" : "md"
    }`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    <>
      <div className="space-y-3">
        {completions.map((completion) => (
          <div
            key={completion.id}
            className="border rounded-lg px-4 py-3 hover:bg-gray-50 transition-colors"
            style={{
              borderColor:
                completion.status === "processing"
                  ? courseColors.primary + "40"
                  : "#e5e7eb",
            }}
          >
            <div className="flex items-center justify-between">
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
                {completion.status === "completed" && completion.result && (
                  <>
                    <button
                      title="View Result"
                      className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                      onClick={() => setSelectedCompletion(completion)}
                    >
                      <Eye className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      title="Download Result"
                      className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                      onClick={() => handleDownloadResult(completion)}
                    >
                      <Download className="w-4 h-4 text-gray-600" />
                    </button>
                  </>
                )}
                {completion.status !== "processing" && (
                  <button
                    title="Delete Task"
                    className="p-1.5 rounded-md hover:bg-red-100 transition-colors text-red-500 hover:text-red-700"
                    onClick={async () => {
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
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Result Dialog */}
      {selectedCompletion && selectedCompletion.result && (
        <AgentResultDialog
          isOpen={!!selectedCompletion}
          onClose={() => setSelectedCompletion(null)}
          taskName={selectedCompletion.taskName}
          agentType={selectedCompletion.agentType}
          result={selectedCompletion.result}
          files={selectedCompletion.files}
          completedAt={selectedCompletion.completedAt}
          onEdit={() => {
            console.log("Edit functionality to be implemented");
            // TODO: Implement edit functionality
          }}
        />
      )}
    </>
  );
}
