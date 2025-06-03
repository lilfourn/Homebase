"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { AlertCircle, BookOpen, ClipboardCheck, FileText, GraduationCap, Loader2, Plus, Search, X, Brain, FileSearch, MessageSquare, Zap } from "lucide-react";
import React, { useEffect, useState } from "react";
import { generateTaskTitle } from "../../../api/agents.api";
import { getImportedFiles } from "../../../api/googleDrive.api";
import { fetchUserByClerkId } from "../../../api/users.api";
import { useAgents } from "../../../hooks/agents/useAgents";
import AgentConfig from "../agent/AgentConfig";
import { AgentErrorBoundary } from "../agent/AgentErrorBoundary";
import FileLibrary from "../agent/FileLibrary";
import PastCompletions from "../agent/PastCompletions";

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

interface Task {
  _id: string;
  agentType: string;
  taskName: string;
  status: string;
  completedAt?: string;
  files: SelectedFile[];
  result?: {
    content: string;
    format: string;
    metadata: any;
  };
}

interface AgentsTabProps {
  course: {
    _id: string;
    courseInstanceId: string;
    name: string;
    code: string;
  };
}

export default function AgentsTab({ course }: AgentsTabProps) {
  // Component initialization logging
  useEffect(() => {
    console.log("[AgentsTab] Component mounted", { course });
    // Initial data fetching is now handled by AgentContext's useEffect
    // We might call fetchTasks here if we need to re-fetch based on course changes specifically handled by this tab.
    // For now, relying on AgentContext's initial load.
    return () => console.log("[AgentsTab] Component unmounted");
  }, [course]);

  const { user } = useUser();
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);

  // Use default colors - in the future these could come from user preferences
  const courseColors = React.useMemo(() => {
    // Extract colors from CSS variables if available, otherwise use defaults
    if (typeof window !== "undefined") {
      const computedStyle = getComputedStyle(document.documentElement);
      const primaryColor =
        computedStyle.getPropertyValue("--custom-primary-color")?.trim() ||
        "#6366f1";
      const secondaryColor =
        computedStyle.getPropertyValue("--custom-secondary-color")?.trim() ||
        "#8b5cf6";
      console.log("[AgentsTab] Using CSS variable colors", {
        primaryColor,
        secondaryColor,
      });
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
    isLoading, // This is for action loading (e.g., creating task)
    isInitialTasksLoading, // New: for the initial list of tasks
    error,
    clearError,
    fetchTasks, // Added fetchTasks from context
    cancelTask, // Added cancelTask from context
  } = useAgents() as {
    tasks: AgentTask[];
    createTask: (taskData: any) => Promise<any>;
    fetchUsage: () => void;
    usage: any;
    isLoading: boolean;
    isInitialTasksLoading: boolean; // Added type
    error: string | null;
    clearError: () => void;
    fetchTasks: (courseId?: string) => void; // Added type
    cancelTask: (taskId: string) => Promise<void>; // Added type
  };

  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [selectedAgentType, setSelectedAgentType] = useState<string>("");
  const [agentConfig, setAgentConfig] = useState<any>({});
  const [courseFiles, setCourseFiles] = useState<SelectedFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [researchPrompt, setResearchPrompt] = useState<string>("");

  // Convert tasks to completions format
  const completions = React.useMemo(() => 
    tasks
      .filter((task) => task.status === "completed" || task.status === "failed") // Only show completed or failed tasks
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
    [tasks] // Only recalculate when tasks array changes
  );

  // Find any currently processing tasks
  const activeTasks = React.useMemo(() => 
    tasks.filter(
      (task) => task.status === "processing" || task.status === "queued"
    ),
    [tasks]
  );
  const currentlyProcessingTask =
    activeTasks.length > 0 ? activeTasks[0] : null;

  // Function to load course files
  const loadCourseFiles = React.useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      console.log("[AgentsTab] Loading files for course._id:", course._id);
      setFilesLoading(true);
      // Load ALL user files (not filtered by course) to ensure we see everything
      // We'll pass null to get all files, then filter client-side if needed
      const response = await getImportedFiles(token, null);
      console.log("[AgentsTab] Files response:", response);

      // The backend returns { files, totalCount } directly, not { success, files }
      if (response.files && Array.isArray(response.files)) {
        // Show all files, but you could filter by courseId here if needed
        const files = response.files.map((file) => ({
          id: file.fileId,
          name: file.fileName,
          type: file.mimeType.split("/")[1] || "unknown",
          size: file.size || 0,
          mimeType: file.mimeType, // Preserve the full mimeType
          courseId: file.courseId, // Keep track of which course it belongs to
          isFromThisCourse: file.courseId === course._id,
        }));
        console.log("[AgentsTab] Total files:", files.length);
        console.log(
          "[AgentsTab] Files from this course:",
          files.filter((f) => f.isFromThisCourse).length
        );
        setCourseFiles(files);
      } else {
        console.log("[AgentsTab] No files found or invalid response format");
        setCourseFiles([]);
      }
    } catch (error) {
      console.error("Error loading course files:", error);
    } finally {
      setFilesLoading(false);
    }
  }, [course._id, getToken]); // Keep course._id for the isFromThisCourse check

  // Check Google Drive connection
  useEffect(() => {
    const checkGoogleDriveConnection = async () => {
      if (!user?.id) return;

      try {
        const userData = await fetchUserByClerkId(user.id);
        setIsGoogleDriveConnected(userData?.googleDrive?.connected || false);
      } catch (error) {
        console.error("Error checking Google Drive connection:", error);
        setIsGoogleDriveConnected(false);
      } finally {
        setCheckingConnection(false);
      }
    };

    checkGoogleDriveConnection();
  }, [user?.id]);

  // Load course files and initial agent data on mount and when GDrive connection is ready
  useEffect(() => {
    if (isGoogleDriveConnected && !checkingConnection) {
      loadCourseFiles();
      // fetchTasks(course.courseInstanceId); // AgentContext now handles initial load based on userId.
      // Call here if specific re-fetch for *this course* needed on tab activation.
      // fetchUsage(); // AgentContext also handles initial usage fetch.
    }
    // If tasks are course-specific and AgentContext loads all user tasks,
    // you might filter tasks here or have fetchTasks in context accept courseInstanceId.
    // AgentContext's fetchTasks can be called without args to get all user tasks.
  }, [
    isGoogleDriveConnected,
    checkingConnection,
    loadCourseFiles,
    course.courseInstanceId,
  ]); // Removed fetchTasks, fetchUsage from deps as context handles initial general load

  // Get the 3 most recent files for this course
  const recentCourseFiles = React.useMemo(() => {
    return courseFiles
      .filter(file => (file as any).courseId === course._id)
      .sort((a, b) => {
        // Sort by upload date (newest first) - assuming there's a timestamp
        // If no timestamp, files will maintain their original order
        return 0; // TODO: Add proper date sorting when timestamp field is available
      })
      .slice(0, 3);
  }, [courseFiles, course._id]);

  const handleFileSelect = (files: SelectedFile[]) => {
    console.log("[AgentsTab] Files selected", { count: files.length, files });
    setSelectedFiles(files);
  };

  const handleAgentCardClick = (agentId: string) => {
    if (agentTypes.find(a => a.id === agentId)?.available) {
      setSelectedAgentType(agentId);
      setShowAgentModal(true);
    }
  };

  const handleAgentSubmit = async () => {
    console.log("[AgentsTab] Submit clicked", {
      selectedAgentType,
      fileCount: selectedFiles.length,
      agentConfig,
    });

    // Validation: researcher needs either prompt or files, others need files
    if (selectedAgentType === 'researcher') {
      if (!researchPrompt && selectedFiles.length === 0) {
        console.warn("[AgentsTab] Researcher validation failed - needs prompt or files");
        alert("Please enter a research topic or select files to analyze.");
        return;
      }
    } else if (!selectedAgentType || selectedFiles.length === 0) {
      console.warn("[AgentsTab] Submit validation failed", {
        hasAgentType: !!selectedAgentType,
        hasFiles: selectedFiles.length > 0,
      });
      return;
    }

    try {
      // Check usage limits
      if (usage && usage.remainingTasks <= 0) {
        alert(
          "You have reached your monthly task limit. Please upgrade your plan."
        );
        return;
      }

      // Generate AI-powered title
      let taskName = "";
      try {
        const token = await getToken();
        if (token) {
          console.log("[AgentsTab] Generating AI title...");
          setIsGeneratingTitle(true);
          const titleResponse = await generateTaskTitle(
            token,
            selectedFiles.map((f) => ({
              fileId: f.id,
              fileName: f.name,
              fileSize: f.size,
              mimeType: (f as any).mimeType || `application/${f.type}`,
            })),
            selectedAgentType,
            selectedAgentType === 'researcher' ? researchPrompt : null
          );
          
          if (titleResponse.success && titleResponse.title) {
            taskName = titleResponse.title;
            console.log("[AgentsTab] Generated title:", taskName);
          }
        }
      } catch (titleError) {
        console.error("[AgentsTab] Error generating title:", titleError);
      } finally {
        setIsGeneratingTitle(false);
      }

      // Fallback to default title if AI generation failed
      if (!taskName) {
        taskName = `${selectedAgentType.replace("-", " ")} Task - ${new Date().toLocaleTimeString()}`;
      }

      // Create agent task
      const taskData = {
        courseInstanceId: course.courseInstanceId,
        taskName,
        agentType: selectedAgentType.toLowerCase().replace(" ", "-"),
        config: {
          ...agentConfig,
          ...(selectedAgentType === 'researcher' && researchPrompt ? { researchPrompt } : {})
        },
        files: selectedFiles.map((f) => ({ 
          fileId: f.id,
          fileName: f.name,
          fileSize: f.size,
          mimeType: (f as any).mimeType || `application/${f.type}` // Use full mimeType if available, fallback to constructed one
        })),
      };

      await createTask(taskData);

      // Reset form and close modal
      setSelectedFiles([]);
      setSelectedAgentType("");
      setAgentConfig({});
      setResearchPrompt("");
      setShowAgentModal(false);

      // Refresh usage
      fetchUsage();
    } catch (error) {
      console.error("[AgentsTab] Error during task creation", error);
    }
  };

  const agentTypes = [
    {
      id: 'note-taker',
      name: 'Note Taker',
      description: 'Extracts and organizes key information from your documents into structured notes',
      icon: <FileText className="w-8 h-8" />,
      gradient: 'from-purple-400 to-pink-400',
      shadowGradient: 'from-purple-200/50 to-pink-200/50',
      available: true
    },
    {
      id: 'researcher', 
      name: 'Researcher',
      description: 'Analyzes multiple documents for research insights with web search capabilities',
      icon: <FileSearch className="w-8 h-8" />,
      gradient: 'from-blue-400 to-cyan-400',
      shadowGradient: 'from-blue-200/50 to-cyan-200/50',
      available: true
    },
    {
      id: 'study-buddy',
      name: 'Study Buddy',
      description: 'Creates study materials, flashcards, and practice questions from your content',
      icon: <Brain className="w-8 h-8" />,
      gradient: 'from-green-400 to-teal-400',
      shadowGradient: 'from-green-200/50 to-teal-200/50',
      available: false
    },
    {
      id: 'assignment',
      name: 'Assignment Assistant',
      description: 'Helps plan, structure, and develop your assignments with proper citations',
      icon: <Zap className="w-8 h-8" />,
      gradient: 'from-orange-400 to-yellow-400',
      shadowGradient: 'from-orange-200/50 to-yellow-200/50',
      available: false
    }
  ];

  return (
    <AgentErrorBoundary>
      <div className="space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={clearError}
                className="text-sm text-red-600 underline hover:text-red-700 mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Usage Stats */}
        {usage && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                Tasks remaining this month:{" "}
                <strong>{usage.remainingTasks}</strong> / {usage.monthlyLimit}
              </span>
              {usage.remainingTasks <= 5 && (
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  Low on tasks
                </span>
              )}
            </div>
          </div>
        )}
        {/* Active Task Status - Only show when a task is processing */}
        {currentlyProcessingTask && (
          <div
            className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-4"
            style={{
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <div className="absolute inset-0 animate-ping">
                    <Loader2 className="w-5 h-5 text-blue-400 opacity-75" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      Working on:
                    </span>
                    <span className="text-sm text-gray-900 font-semibold">
                      {currentlyProcessingTask.taskName ||
                        `${currentlyProcessingTask.agentType} Task`}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-gray-600">
                      Agent:{" "}
                      <span className="font-medium capitalize">
                        {currentlyProcessingTask.agentType?.replace("-", " ")}
                      </span>
                    </span>
                    {currentlyProcessingTask.files &&
                      currentlyProcessingTask.files.length > 0 && (
                        <span className="text-xs text-gray-600">
                          Files:{" "}
                          <span className="font-medium">
                            {currentlyProcessingTask.files.length}
                          </span>
                        </span>
                      )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentlyProcessingTask.progress !== undefined && (
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300 ease-out"
                        style={{
                          width: `${currentlyProcessingTask.progress || 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">
                      {currentlyProcessingTask.progress || 0}%
                    </span>
                  </div>
                )}
                <span className="text-xs text-blue-600 font-medium">
                  {currentlyProcessingTask.status === "queued"
                    ? "Queued"
                    : "Processing"}
                </span>
                <button
                  onClick={async () => {
                    if (confirm("Are you sure you want to cancel this task?")) {
                      try {
                        await cancelTask(currentlyProcessingTask.id);
                      } catch (error) {
                        console.error("Failed to cancel task:", error);
                      }
                    }
                  }}
                  className="ml-2 p-1.5 rounded-md hover:bg-red-100 transition-colors text-red-500 hover:text-red-700"
                  title="Cancel task"
                  disabled={isLoading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {checkingConnection || isInitialTasksLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2
              className="w-6 h-6 animate-spin"
              style={{ color: courseColors.primary }}
            />
            <span className="ml-2 text-sm text-gray-600">
              {isInitialTasksLoading
                ? "Loading agent data..."
                : "Checking Google Drive connection..."}
            </span>
          </div>
        ) : !isGoogleDriveConnected ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
            <p className="text-amber-800 mb-4">
              Please connect your Google Drive account to use the Agents
              feature.
            </p>
            <button
              onClick={() => (window.location.href = "/dashboard/settings")}
              className="px-4 py-2 rounded-md text-white font-medium"
              style={{ backgroundColor: courseColors.primary }}
            >
              Go to Settings
            </button>
          </div>
        ) : (
          <>
            {/* Agent Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {agentTypes.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => handleAgentCardClick(agent.id)}
                  className={`
                    relative group cursor-pointer transition-all duration-300 transform hover:scale-105
                    ${!agent.available ? 'opacity-60 cursor-not-allowed hover:scale-100' : ''}
                  `}
                >
                  {/* Gradient Shadow */}
                  <div 
                    className={`
                      absolute inset-0 bg-gradient-to-r ${agent.shadowGradient} 
                      blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-300
                      rounded-2xl transform translate-y-4
                    `}
                  />
                  
                  {/* Card Content */}
                  <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-lg h-full flex flex-col">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${agent.gradient} text-white flex-shrink-0`}>
                        {agent.icon}
                      </div>
                      <div className="flex-1 flex flex-col">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {agent.name}
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed flex-1">
                          {agent.description}
                        </p>
                        {!agent.available && (
                          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-500">
                            Coming Soon
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Agent Configuration Modal */}
            {showAgentModal && selectedAgentType && (
              <div
                className="fixed inset-0 w-screen h-screen flex items-center justify-center p-4 z-50"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                  {/* Modal Header */}
                  <div className="px-8 py-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          Configure {agentTypes.find(a => a.id === selectedAgentType)?.name}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          Select files and configure your agent to get started.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setShowAgentModal(false);
                          setSelectedFiles([]);
                          setAgentConfig({});
                          setResearchPrompt("");
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-8 py-6">
                    {/* Research Prompt Section - Only for Researcher Agent */}
                    {selectedAgentType === 'researcher' && (
                      <div className="mb-6">
                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
                          <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Search className="w-5 h-5 text-blue-600" />
                            Research Topic
                          </h3>
                          <p className="text-sm text-gray-600 mb-4">
                            What would you like to research? Be specific about your topic or question.
                          </p>
                          <textarea
                            value={researchPrompt}
                            onChange={(e) => setResearchPrompt(e.target.value)}
                            placeholder="e.g., 'Compare the environmental impact of electric vs hydrogen vehicles' or 'Analyze the role of artificial intelligence in modern healthcare'"
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                            rows={3}
                            disabled={isLoading || currentlyProcessingTask !== null}
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            Files below are optional and will be used as additional context for your research.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Files Section */}
                      <div className="bg-gray-50 rounded-xl p-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-gray-600" />
                          Files {selectedAgentType === 'researcher' && <span className="text-xs text-gray-500 font-normal">(Optional)</span>}
                        </h3>
                        
                        {/* Recent Files Display - Show when there are recent files */}
                        {recentCourseFiles.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-3">Recently uploaded</p>
                            <div className="space-y-2">
                              {recentCourseFiles.map((file) => {
                                const isSelected = selectedFiles.some(f => f.id === file.id);
                                const selectedAgent = agentTypes.find(a => a.id === selectedAgentType);
                                return (
                                  <button
                                    key={file.id}
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedFiles(selectedFiles.filter(f => f.id !== file.id));
                                      } else {
                                        setSelectedFiles([...selectedFiles, file]);
                                      }
                                    }}
                                    className={`
                                      w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left
                                      ${isSelected 
                                        ? 'bg-white border-2' 
                                        : 'bg-white hover:bg-gray-50 border border-gray-200'
                                      }
                                    `}
                                    style={{
                                      borderColor: isSelected 
                                        ? selectedAgent?.gradient.includes('purple') ? '#a855f7' 
                                          : selectedAgent?.gradient.includes('blue') ? '#3b82f6'
                                          : selectedAgent?.gradient.includes('green') ? '#10b981'
                                          : '#f97316'
                                        : undefined,
                                    }}
                                  >
                                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                                    {isSelected && (
                                      <div className="w-2 h-2 rounded-full bg-gradient-to-r" 
                                        style={{
                                          background: selectedAgent?.gradient.includes('purple') ? '#a855f7' 
                                            : selectedAgent?.gradient.includes('blue') ? '#3b82f6'
                                            : selectedAgent?.gradient.includes('green') ? '#10b981'
                                            : '#f97316'
                                        }}
                                      />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                
                {/* Selected files that aren't in recent files */}
                {(() => {
                  const additionalSelectedFiles = selectedFiles.filter(
                    selected => !recentCourseFiles.some(recent => recent.id === selected.id)
                  );
                  return additionalSelectedFiles.length > 0 ? (
                    <div className="mb-3">
                      {recentCourseFiles.length > 0 && <div className="border-t border-gray-100 mb-3" />}
                      <p className="text-xs text-gray-500 mb-2">Also selected</p>
                      <div className="space-y-2">
                        {additionalSelectedFiles.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="text-xs text-gray-700 truncate">{file.name}</span>
                            </div>
                            <button
                              onClick={() => setSelectedFiles(selectedFiles.filter(f => f.id !== file.id))}
                              className="text-gray-400 hover:text-gray-600 ml-2"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
                
                {/* Show "No files selected" only when there are no recent files and no selected files */}
                {recentCourseFiles.length === 0 && selectedFiles.length === 0 && (
                  <p className="text-xs text-gray-500 mb-3">No files selected</p>
                )}

                        <button
                          onClick={() => setShowFileModal(true)}
                          disabled={isLoading || currentlyProcessingTask !== null}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-gray-50 rounded-lg border border-dashed border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            {selectedFiles.length > 0 ? 'Add More Files' : 'Select Files'}
                          </span>
                        </button>
              </div>

                      {/* Agent Selection */}
                      <div className="bg-gray-50 rounded-xl p-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Zap className="w-5 h-5 text-gray-600" />
                          Agent Type
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          {agentTypes.filter(agent => agent.available).map((agent) => {
                            const isSelected = selectedAgentType === agent.id;
                            return (
                              <button
                                key={agent.id}
                                onClick={() => setSelectedAgentType(agent.id)}
                                disabled={isLoading || currentlyProcessingTask !== null || !agent.available}
                                className={`
                                  p-4 rounded-lg transition-all text-left relative overflow-hidden
                                  ${isSelected 
                                    ? 'bg-white shadow-md' 
                                    : 'bg-white hover:shadow-sm'}
                                  ${isLoading || currentlyProcessingTask !== null ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                              >
                                {isSelected && (
                                  <div 
                                    className={`absolute inset-0 bg-gradient-to-r ${agent.gradient} opacity-5`}
                                  />
                                )}
                                <div className="relative flex items-start gap-3">
                                  <div className={`p-2 rounded-lg bg-gradient-to-r ${agent.gradient} text-white`}>
                                    {React.cloneElement(agent.icon, { className: "w-5 h-5" })}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900">{agent.name}</p>
                                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{agent.description}</p>
                                  </div>
                                  {isSelected && (
                                    <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${agent.gradient} flex-shrink-0 mt-2`} />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Configuration */}
                      <div className="bg-gray-50 rounded-xl p-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-gray-600" />
                          Configuration
                        </h3>
                        
                        <div className="mb-6">
                          <AgentConfig
                            agentType={selectedAgentType}
                            config={agentConfig}
                            onChange={setAgentConfig}
                            courseColors={courseColors}
                            isDisabled={isLoading || currentlyProcessingTask !== null}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-8 py-6 border-t border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {selectedAgentType === 'researcher' && researchPrompt && (
                          <span className="mr-3">Research topic provided</span>
                        )}
                        {selectedFiles.length > 0 && (
                          <span>{selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setShowAgentModal(false);
                            setSelectedFiles([]);
                            setAgentConfig({});
                            setResearchPrompt("");
                          }}
                          className="px-6 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAgentSubmit}
                          disabled={
                            isLoading || 
                            isGeneratingTitle || 
                            currentlyProcessingTask !== null || 
                            !selectedAgentType || 
                            (selectedAgentType === 'researcher' 
                              ? (!researchPrompt && selectedFiles.length === 0)
                              : selectedFiles.length === 0)
                          }
                          className={`
                            px-6 py-2.5 text-sm font-medium text-white rounded-lg transition-all 
                            disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2
                            ${selectedAgentType && agentTypes.find(a => a.id === selectedAgentType)?.gradient 
                              ? `bg-gradient-to-r ${agentTypes.find(a => a.id === selectedAgentType)?.gradient}` 
                              : 'bg-gray-400'}
                          `}
                        >
                          {isGeneratingTitle ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Generating Title...</span>
                            </>
                          ) : isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : currentlyProcessingTask ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Agent Busy...</span>
                            </>
                          ) : (
                            <span>Process Files</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* File Selection Modal */}
            {showFileModal && (
              <div
                className="fixed inset-0 w-screen h-screen flex items-center justify-center p-4 z-50"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
              >
                <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
                  <div className="mb-6">
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-3">
                      Select Files
                    </h2>
                    <p className="text-gray-600">
                      Choose files from your Google Drive to process with AI agents. You can select multiple files at once.
                    </p>
                  </div>
                  
                  {/* Recent Files Section */}
                  {recentCourseFiles.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Recent uploads for this course</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {recentCourseFiles.map((file) => {
                          const isSelected = selectedFiles.some(f => f.id === file.id);
                          return (
                            <button
                              key={file.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedFiles(selectedFiles.filter(f => f.id !== file.id));
                                } else {
                                  setSelectedFiles([...selectedFiles, file]);
                                }
                              }}
                              className={`
                                flex items-center gap-3 p-3 rounded-lg border transition-all text-left
                                ${isSelected 
                                  ? 'border-gray-900 bg-gray-50' 
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }
                              `}
                            >
                              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {file.type.toUpperCase()} • {(file.size / 1024).toFixed(1)}KB
                                </p>
                              </div>
                              {isSelected && (
                                <div 
                                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: courseColors.primary }}
                                >
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 border-t pt-3">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">All files</h3>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex-1 overflow-y-auto min-h-0 mb-6">
                    <FileLibrary
                      onFileSelect={(files) => {
                        setSelectedFiles(files);
                      }}
                      selectedFiles={selectedFiles}
                      courseColors={courseColors}
                      isDisabled={false}
                      courseFiles={courseFiles}
                      filesLoading={filesLoading}
                      courseId={course._id}
                      onFilesUploaded={() => {
                        loadCourseFiles();
                      }}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                    <button
                      onClick={() => setShowFileModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setShowFileModal(false);
                      }}
                      disabled={selectedFiles.length === 0}
                      className="px-4 py-2 text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      style={{
                        backgroundColor: selectedFiles.length === 0 ? "#9ca3af" : courseColors.primary,
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Select {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Past Completions Section - Show only if connected */}
        {isGoogleDriveConnected && !checkingConnection && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3
              className="text-lg font-semibold mb-4"
              style={{ color: courseColors.primary }}
            >
              Past Completions
            </h3>
            <PastCompletions
              completions={completions}
              courseColors={courseColors}
            />
          </div>
        )}
      </div>
    </AgentErrorBoundary>
  );
}
