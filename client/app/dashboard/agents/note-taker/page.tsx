"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { AlertCircle, ArrowLeft, Brain, FileText, Loader2, Plus, Sparkles, X, Zap, Upload, ChevronLeft, Star, BookOpen, Info, BarChart, Target, Award, Clock, CheckCircle, RefreshCw } from "lucide-react";
import React, { useEffect, useState } from "react";
import { generateTaskTitle } from "../../../api/agents.api";
import { getImportedFiles } from "../../../api/googleDrive.api";
import { fetchUserByClerkId } from "../../../api/users.api";
import { useAgents } from "../../../hooks/agents/useAgents";
import { AgentErrorBoundary } from "../../../components/course/agent/AgentErrorBoundary";
import PastCompletions from "../../../components/course/agent/PastCompletions";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useGoogleDrivePicker } from "../../../hooks/useGoogleDrivePicker";

interface SelectedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  mimeType?: string;
  uploadedAt?: string;
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

  // Helper function to get file icon based on type
  const getFileIcon = (type: string) => {
    const iconClass = "w-5 h-5";
    const iconColor = "text-gray-600";
    
    switch (type.toLowerCase()) {
      case "pdf":
        return <FileText className={`${iconClass} text-red-600`} />;
      case "doc":
      case "docx":
        return <FileText className={`${iconClass} text-blue-600`} />;
      case "ppt":
      case "pptx":
        return <FileText className={`${iconClass} text-orange-600`} />;
      case "xls":
      case "xlsx":
        return <FileText className={`${iconClass} text-green-600`} />;
      default:
        return <FileText className={`${iconClass} ${iconColor}`} />;
    }
  };

  // Helper function to format upload date
  const formatUploadDate = (dateString?: string) => {
    if (!dateString) return "Recently";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes <= 1 ? "Just now" : `${diffMinutes} minutes ago`;
      }
      return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

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
  const [noteConfig, setNoteConfig] = useState({
    mode: "comprehensive",
    model: "gpt-4o-mini",
    customSettings: {
      includeKeyTerms: true,
      includeSummary: true,
      includeDiagrams: true,
    }
  });

  // Google Drive picker hook
  const { openPicker, isLoading: isImporting } = useGoogleDrivePicker({
    courseId: null, // No specific course for global files
    onFilesSelected: (result) => {
      // Reload files after successful import
      loadCourseFiles();
    },
    onError: (errorMessage) => {
      console.error("Error importing files:", errorMessage);
    },
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
        const files = response.files
          .map((file) => ({
            id: file.fileId,
            name: file.fileName,
            type: file.mimeType.split("/")[1] || "unknown",
            size: file.size || 0,
            mimeType: file.mimeType,
            uploadedAt: file.uploadedAt || file.createdAt || new Date().toISOString(),
          }))
          .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
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
      <div className="h-screen bg-gray-50 overflow-hidden">
        <div className="h-full mx-auto p-4 flex flex-col">
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col">
            {/* Header Section */}
            <div className="bg-[var(--custom-primary-color)] relative">
              <div className="relative px-8 py-6">
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.push("/dashboard/agents")}
                    className="text-white hover:opacity-80 transition-opacity"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-medium text-white">Note Taker Agent</h1>
                    <p className="text-white text-opacity-70 text-sm">AI-Powered Study Companion</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white rounded-xl px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-400" />
                      <span className="text-[var(--custom-primary-color)] font-semibold">2340 XP</span>
                    </div>
                  </div>
                  <button className="w-10 h-10 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md">
                    <Info className="h-5 w-5 text-[var(--custom-primary-color)]" />
                  </button>
                </div>
              </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden p-6">
              <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 overflow-y-auto space-y-6 pr-2">
              {/* Upload New Files */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Upload className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Upload New Files</h2>
                </div>
                
                <div className="space-y-4">
                  <div
                    onClick={() => openPicker()}
                    className={`border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer group ${
                      isImporting ? 'opacity-50 cursor-wait' : ''
                    }`}
                  >
                    <div className="flex justify-center mb-4">
                      <div className="p-3 bg-indigo-50 rounded-full group-hover:bg-indigo-100 transition-colors">
                        {isImporting ? (
                          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                        ) : (
                          <Upload className="w-8 h-8 text-indigo-600" />
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 mb-1">
                      {isImporting ? 'Importing files...' : 'Click to browse Google Drive'}
                    </p>
                    <p className="text-sm text-gray-500">Import PDF, DOC, PPT files • +50 XP per file</p>
                  </div>
                  
                  {/* Selected Files Preview */}
                  {selectedFiles.length > 0 && (
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-indigo-900">
                          {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                        </p>
                        <button
                          onClick={() => setSelectedFiles([])}
                          className="text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedFiles.slice(0, 3).map((file) => (
                          <span
                            key={file.id}
                            className="inline-flex items-center px-2 py-1 rounded-md bg-white text-xs font-medium text-gray-700"
                          >
                            {file.name.length > 20 ? `${file.name.substring(0, 20)}...` : file.name}
                          </span>
                        ))}
                        {selectedFiles.length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-white text-xs font-medium text-gray-500">
                            +{selectedFiles.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Files */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Files</h2>
                    {courseFiles.length > 0 && (
                      <span className="text-sm text-gray-500">({courseFiles.length})</span>
                    )}
                  </div>
                  <button
                    onClick={loadCourseFiles}
                    disabled={filesLoading}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Refresh files"
                  >
                    {filesLoading ? (
                      <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                </div>
                
                {filesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  </div>
                ) : courseFiles.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {courseFiles.map((file) => {
                      const isSelected = selectedFiles.some((f) => f.id === file.id);
                      return (
                        <div
                          key={file.id}
                          onClick={() => handleFileSelect(file)}
                          className={`flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-indigo-50 border-2 border-indigo-200 hover:bg-indigo-100' 
                              : 'bg-white border-2 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              isSelected ? 'bg-indigo-200' : 'bg-gray-100'
                            }`}>
                              {getFileIcon(file.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{file.name}</p>
                              <p className="text-sm text-gray-500">
                                {formatUploadDate(file.uploadedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <CheckCircle className="w-5 h-5 text-indigo-600" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p>No files uploaded yet</p>
                    <p className="text-sm mt-2">Import files from Google Drive to see them here</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="overflow-y-auto space-y-6 pl-2">
              {/* AI Configuration */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-gray-900">AI Configuration</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="font-medium text-gray-900">Key Terms & Definitions</p>
                        <p className="text-xs text-gray-600">Extract important terminology</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
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
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium text-gray-900">Chapter Summaries</p>
                        <p className="text-xs text-gray-600">Generate section overviews</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
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
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <BarChart className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="font-medium text-gray-900">Diagram Analysis</p>
                        <p className="text-xs text-gray-600">Analyze visual elements</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
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
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                      <div>
                        <p className="font-medium text-gray-900">Smart Highlights</p>
                        <p className="text-xs text-gray-600">AI-powered key points</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl opacity-60">
                    <div className="flex items-center gap-3">
                      <Brain className="w-5 h-5 text-purple-500" />
                      <div>
                        <p className="font-medium text-gray-900">AI Insights</p>
                        <p className="text-xs text-gray-600">Deep learning analysis</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={false}
                        disabled
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Achievements */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Achievements</h2>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Star className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">First Upload</p>
                      <p className="text-xs text-gray-600">Upload your first file</p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Zap className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Speed Reader</p>
                      <p className="text-xs text-gray-600">Process 5 files in one day</p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl opacity-60">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Brain className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Note Master</p>
                      <p className="text-xs text-gray-600">Create 100 AI notes</p>
                    </div>
                    <div className="text-xs text-gray-500">23/100</div>
                  </div>
                </div>
              </div>
            </div>
              </div>

              {/* Create Button */}
              <div className="mt-6">
            <button
              onClick={() => handleGenerateTitle()}
              disabled={selectedFiles.length === 0 || isLoading || isGeneratingTitle}
              className={`w-full py-4 px-6 rounded-2xl font-semibold transition-all duration-200 transform flex items-center justify-center gap-3 ${
                selectedFiles.length === 0 || isLoading || isGeneratingTitle
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
              }`}
            >
              {isLoading || isGeneratingTitle ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  <span>{isGeneratingTitle ? "Generating Title..." : "Creating Task..."}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>Create AI-Powered Notes</span>
                </>
              )}
            </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active Tasks and Errors - Outside main container for better visibility */}
        {(currentlyProcessingTask || error) && (
          <div className="fixed bottom-4 left-4 right-4 max-w-5xl mx-auto space-y-4">
            {currentlyProcessingTask && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <Brain className="w-6 h-6 text-indigo-600" />
                  <div className="absolute -bottom-1 -right-1">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
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
                    <div className="w-full bg-indigo-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
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

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-lg">
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
          </div>
        )}

      </div>
    </AgentErrorBoundary>
  );
}