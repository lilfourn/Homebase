"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { AlertCircle, ArrowLeft, Brain, FileText, Loader2, Plus, Sparkles, X, Zap } from "lucide-react";
import React, { useEffect, useState } from "react";
import { generateTaskTitle } from "../../../api/agents.api";
import { getImportedFiles } from "../../../api/googleDrive.api";
import { fetchUserByClerkId } from "../../../api/users.api";
import { useAgents } from "../../../hooks/agents/useAgents";
import { AgentErrorBoundary } from "../../../components/course/agent/AgentErrorBoundary";
import FileLibrary from "../../../components/course/agent/FileLibrary";
import PastCompletions from "../../../components/course/agent/PastCompletions";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface SelectedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  mimeType?: string;
}

interface AgentTask {
  id: string;
  jobId?: string;
  agentType: string;
  taskName: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress?: number;
  completedAt?: string;
  createdAt: string;
  files: SelectedFile[];
  result?: {
    content: string;
    format: string;
    metadata: any;
  };
  error?: string;
  courseInstanceId?: string;
}

export default function NoteTakerAgentPage() {
  const { user } = useUser();
  const router = useRouter();
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);

  const courseColors = React.useMemo(() => {
    if (typeof window !== "undefined") {
      const computedStyle = getComputedStyle(document.documentElement);
      const primaryColor =
        computedStyle.getPropertyValue("--custom-primary-color")?.trim() ||
        "#6366f1";
      const secondaryColor =
        computedStyle.getPropertyValue("--custom-secondary-color")?.trim() ||
        "#8b5cf6";
      return {
        primary: primaryColor,
        secondary: secondaryColor,
      };
    }
    return { primary: "#6366f1", secondary: "#8b5cf6" };
  }, []);

  const { getToken } = useAuth();
  const {
    tasks,
    createTask,
    fetchUsage,
    usage,
    isLoading,
    isInitialTasksLoading,
    error,
    clearError,
    fetchTasks,
    cancelTask,
  } = useAgents() as {
    tasks: AgentTask[];
    createTask: (taskData: any) => Promise<any>;
    fetchUsage: () => void;
    usage: any;
    isLoading: boolean;
    isInitialTasksLoading: boolean;
    error: string | null;
    clearError: () => void;
    fetchTasks: (courseId?: string) => void;
    cancelTask: (taskId: string) => Promise<void>;
  };

  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [courseFiles, setCourseFiles] = useState<SelectedFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [showFileLibrary, setShowFileLibrary] = useState(false);
  const [noteConfig, setNoteConfig] = useState({
    mode: "comprehensive",
    model: "gpt-4o-mini",
    customSettings: {
      includeKeyTerms: true,
      includeSummary: true,
      includeDiagrams: true,
    }
  });

  // Load note-taker tasks on mount
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Filter tasks for note-taker only
  const noteTakerTasks = React.useMemo(
    () => tasks.filter((task) => task.agentType === "note-taker"),
    [tasks]
  );

  // Convert tasks to completions format
  const completions = React.useMemo(
    () =>
      noteTakerTasks
        .filter((task) => task.status === "completed" || task.status === "failed")
        .map((task) => ({
          id: task.id,
          agentType: task.agentType,
          taskName: task.taskName,
          status: task.status as "completed" | "failed" | "processing",
          completedAt: task.completedAt
            ? new Date(task.completedAt)
            : new Date(task.createdAt),
          files: task.files || [],
          result: task.result,
        })),
    [noteTakerTasks]
  );

  // Find any currently processing tasks
  const activeTasks = React.useMemo(
    () =>
      noteTakerTasks.filter(
        (task) => task.status === "processing" || task.status === "queued"
      ),
    [noteTakerTasks]
  );
  const currentlyProcessingTask =
    activeTasks.length > 0 ? activeTasks[0] : null;

  // Function to load course files
  const loadCourseFiles = React.useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      setFilesLoading(true);
      const response = await getImportedFiles(token, null);

      if (response.files && Array.isArray(response.files)) {
        const files = response.files.map((file) => ({
          id: file.fileId,
          name: file.fileName,
          type: file.mimeType.split("/")[1] || "unknown",
          size: file.size || 0,
          mimeType: file.mimeType,
        }));
        setCourseFiles(files);
      } else {
        console.error("[NoteTakerAgent] Unexpected files response:", response);
        setCourseFiles([]);
      }
    } catch (error) {
      console.error("[NoteTakerAgent] Error loading files:", error);
      setCourseFiles([]);
    } finally {
      setFilesLoading(false);
    }
  }, [getToken]);

  // Check Google Drive connection
  useEffect(() => {
    const checkGoogleDriveConnection = async () => {
      if (!user?.id) return;

      try {
        const userData = await fetchUserByClerkId(user.id);
        const isConnected = userData?.googleDrive?.connected || false;
        setIsGoogleDriveConnected(isConnected);

        if (isConnected) {
          loadCourseFiles();
        }
      } catch (error) {
        console.error("Error checking Google Drive connection:", error);
        setIsGoogleDriveConnected(false);
      } finally {
        setCheckingConnection(false);
      }
    };

    checkGoogleDriveConnection();
  }, [user?.id, loadCourseFiles]);

  // Auto-refresh usage on mount and when needed
  useEffect(() => {
    if (usage === null) {
      fetchUsage();
    }
  }, [usage, fetchUsage]);

  const handleFileSelect = (file: SelectedFile) => {
    setSelectedFiles((prev) => {
      const isSelected = prev.some((f) => f.id === file.id);
      if (isSelected) {
        return prev.filter((f) => f.id !== file.id);
      }
      return [...prev, file];
    });
  };

  const handleGenerateTitle = async () => {
    if (selectedFiles.length === 0) {
      return;
    }

    setIsGeneratingTitle(true);
    try {
      const token = await getToken();
      if (!token) return;

      const titleResponse = await generateTaskTitle(
        token,
        selectedFiles.map((f) => ({
          fileId: f.id,
          fileName: f.name,
          mimeType: f.mimeType || "application/octet-stream",
          fileSize: f.size,
        })),
        "note-taker"
      );

      if (titleResponse.success && titleResponse.title) {
        await handleCreateTask(titleResponse.title);
      } else {
        await handleCreateTask();
      }
    } catch (error) {
      console.error("Error generating title:", error);
      await handleCreateTask();
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleCreateTask = async (generatedTitle?: string) => {
    if (selectedFiles.length === 0) {
      alert("Please select files for processing");
      return;
    }

    const defaultTitle = `Note Taker Task - ${new Date().toLocaleTimeString()}`;
    const taskName = generatedTitle || defaultTitle;

    try {
      await createTask({
        agentType: "note-taker",
        taskName,
        config: noteConfig,
        files: selectedFiles.map((f) => ({
          fileId: f.id,
          fileName: f.name,
          mimeType: f.mimeType || "application/octet-stream",
          fileSize: f.size,
        })),
      });

      // Reset form
      setSelectedFiles([]);

      // Refresh usage stats after creating task
      fetchUsage();
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  if (checkingConnection) {
    return (
      <div className="flex justify-center items-center h-96 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isGoogleDriveConnected) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
        <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Connect Google Drive
        </h3>
        <p className="text-gray-600 mb-6">
          To use the Note Taker agent, you need to connect your Google Drive first.
        </p>
        <a
          href="/dashboard/settings"
          className="inline-flex items-center px-6 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-opacity-90 transition-all duration-200"
        >
          Go to Settings
        </a>
      </div>
    );
  }

  return (
    <AgentErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard/agents")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-violet-50">
                <Image
                  src="/agentIcons/NoteTaker.png"
                  alt="Note Taker"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Note Taker Agent</h1>
                <p className="text-sm text-gray-600">Transform lectures and documents into organized study notes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Create Task Section */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-violet-100">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600" />
            Create New Note Taking Task
          </h3>

          {/* File Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-medium text-gray-900">
                Select Files to Process
              </h4>
              <button
                onClick={() => setShowFileLibrary(true)}
                className="inline-flex items-center px-4 py-2 bg-violet-50 text-violet-700 text-sm font-medium rounded-xl hover:bg-violet-100 border border-violet-200 transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Browse Files
              </button>
            </div>
            {selectedFiles.length > 0 ? (
              <div className="space-y-2">
                {selectedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-violet-50 rounded-xl border border-violet-100 hover:border-violet-200 transition-all duration-200"
                  >
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-violet-600 mr-3" />
                      <span className="text-sm text-gray-700 font-medium">{file.name}</span>
                    </div>
                    <button
                      onClick={() => handleFileSelect(file)}
                      className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No files selected</p>
              </div>
            )}
          </div>

          {/* Note Configuration */}
          <div className="mb-6 p-4 bg-violet-50 rounded-xl border border-violet-100">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Note Taking Configuration</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={noteConfig.customSettings.includeKeyTerms}
                  onChange={(e) =>
                    setNoteConfig({
                      ...noteConfig,
                      customSettings: {
                        ...noteConfig.customSettings,
                        includeKeyTerms: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-violet-600 rounded"
                />
                <span className="text-sm text-gray-700">Include key terms and definitions</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={noteConfig.customSettings.includeSummary}
                  onChange={(e) =>
                    setNoteConfig({
                      ...noteConfig,
                      customSettings: {
                        ...noteConfig.customSettings,
                        includeSummary: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-violet-600 rounded"
                />
                <span className="text-sm text-gray-700">Include chapter summaries</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={noteConfig.customSettings.includeDiagrams}
                  onChange={(e) =>
                    setNoteConfig({
                      ...noteConfig,
                      customSettings: {
                        ...noteConfig.customSettings,
                        includeDiagrams: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-violet-600 rounded"
                />
                <span className="text-sm text-gray-700">Include diagram references</span>
              </label>
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={() => handleGenerateTitle()}
            disabled={selectedFiles.length === 0 || isLoading || isGeneratingTitle}
            className={`w-full py-3.5 px-4 rounded-xl font-semibold transition-all duration-200 transform ${
              selectedFiles.length === 0 || isLoading || isGeneratingTitle
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-violet-600 text-white hover:bg-violet-700 hover:scale-[1.02] active:scale-[0.98]"
            }`}
          >
            {isLoading || isGeneratingTitle ? (
              <span className="flex items-center justify-center">
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                {isGeneratingTitle ? "Generating Title..." : "Creating Task..."}
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <Zap className="h-5 w-5 mr-2" />
                Create Note Taking Task
              </span>
            )}
          </button>
        </div>

        {/* Active Tasks */}
        {currentlyProcessingTask && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <Brain className="w-6 h-6 text-violet-600" />
                <div className="absolute -bottom-1 -right-1">
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Processing Task</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{currentlyProcessingTask.taskName}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Status: {currentlyProcessingTask.status}
                </p>
              </div>
              {currentlyProcessingTask.progress !== undefined && (
                <div>
                  <div className="w-full bg-violet-200 rounded-full h-2">
                    <div
                      className="bg-violet-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${currentlyProcessingTask.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {currentlyProcessingTask.progress}% complete
                  </p>
                </div>
              )}
              <button
                onClick={() => cancelTask(currentlyProcessingTask.id)}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Cancel Task
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800 transition-colors duration-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Past Completions */}
        {completions.length > 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Past Note Taking Tasks</h3>
            <PastCompletions
              completions={completions}
              courseColors={{ primary: "#8b5cf6", secondary: "#a78bfa" }}
            />
          </div>
        )}

        {/* File Selection Modal */}
        {showFileLibrary && (
          <div
            className="fixed inset-0 w-screen h-screen flex items-center justify-center p-4 z-50"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          >
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">
                Select Files
              </h2>
              <p className="text-gray-600 mb-6">
                Choose files from your Google Drive to process with the Note Taker agent.
              </p>
              <div className="flex-1 overflow-y-auto mb-6 -mx-2 px-2">
                <FileLibrary
                  onFileSelect={(files) => {
                    setSelectedFiles(files);
                  }}
                  selectedFiles={selectedFiles}
                  courseColors={{ primary: "#8b5cf6", secondary: "#a78bfa" }}
                  isDisabled={false}
                  courseFiles={courseFiles}
                  filesLoading={filesLoading}
                  courseId={null}
                  onFilesUploaded={() => {
                    loadCourseFiles();
                  }}
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowFileLibrary(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowFileLibrary(false)}
                  className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-600 cursor-pointer"
                >
                  Done ({selectedFiles.length} selected)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AgentErrorBoundary>
  );
}