"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { AlertCircle, BookOpen, ClipboardCheck, FileText, GraduationCap, Loader2, Plus, Search, X, Brain, FileSearch, MessageSquare, Zap } from "lucide-react";
import React, { useEffect, useState } from "react";
import { generateTaskTitle } from "../../api/agents.api";
import { getImportedFiles } from "../../api/googleDrive.api";
import { fetchUserByClerkId } from "../../api/users.api";
import { useAgents } from "../../hooks/agents/useAgents";
import AgentConfig from "../course/agent/AgentConfig";
import { AgentErrorBoundary } from "../course/agent/AgentErrorBoundary";
import FileLibrary from "../course/agent/FileLibrary";
import PastCompletions from "../course/agent/PastCompletions";

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

interface Course {
  _id: string;
  courseInstanceId: string;
  name: string;
  code: string;
}

export default function AgentsPage() {
  const { user } = useUser();
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [coursesLoading, setCoursesLoading] = useState(true);

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
  const [selectedAgentType, setSelectedAgentType] = useState<string>("");
  const [agentConfig, setAgentConfig] = useState<any>({});
  const [courseFiles, setCourseFiles] = useState<SelectedFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [showFileLibrary, setShowFileLibrary] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [researchPrompt, setResearchPrompt] = useState<string>("");

  // Load courses on mount
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        setCoursesLoading(true);
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/mine`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const coursesData = await response.json();
        setCourses(coursesData);
        
        // Select the first course by default if available
        if (coursesData.length > 0) {
          setSelectedCourse(coursesData[0]);
        }
      } catch (error) {
        console.error("Error loading courses:", error);
      } finally {
        setCoursesLoading(false);
      }
    };

    loadCourses();
  }, [getToken]);

  // Load tasks when selected course changes
  useEffect(() => {
    if (selectedCourse) {
      fetchTasks(selectedCourse.courseInstanceId);
    }
  }, [selectedCourse, fetchTasks]);

  // Convert tasks to completions format
  const completions = React.useMemo(() => 
    tasks
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
    [tasks]
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

      setFilesLoading(true);
      // Load ALL user files
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
        console.error("[AgentsPage] Unexpected files response:", response);
        setCourseFiles([]);
      }
    } catch (error) {
      console.error("[AgentsPage] Error loading files:", error);
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

  const handleAgentSelect = async (agentType: string, config: any) => {
    setSelectedAgentType(agentType);
    setAgentConfig(config);
    
    // For researcher agent, set research prompt from config
    if (agentType === 'researcher' && config.researchPrompt) {
      setResearchPrompt(config.researchPrompt);
    }
    
    setShowAgentModal(false);
    
    // Only generate title if we have files or research prompt
    if ((selectedFiles.length > 0 || (agentType === 'researcher' && config.researchPrompt)) && selectedCourse) {
      await handleGenerateTitle(agentType, config);
    }
  };

  const handleGenerateTitle = async (agentType?: string, config?: any) => {
    if (!selectedCourse) return;
    
    const typeToUse = agentType || selectedAgentType;
    const configToUse = config || agentConfig;
    
    // Skip title generation if no files and no research prompt
    if (selectedFiles.length === 0 && !(typeToUse === 'researcher' && configToUse.researchPrompt)) {
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
        typeToUse,
        configToUse.researchPrompt
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
    if (!selectedAgentType || !selectedCourse) return;
    
    // For researcher agent, require either files or research prompt
    if (selectedAgentType === 'researcher' && selectedFiles.length === 0 && !researchPrompt) {
      alert("Please select files or enter a research prompt");
      return;
    }
    
    // For other agents, require files
    if (selectedAgentType !== 'researcher' && selectedFiles.length === 0) {
      alert("Please select files for processing");
      return;
    }

    const defaultTitle = `${selectedAgentType.replace("-", " ")} Task - ${new Date().toLocaleTimeString()}`;
    const taskName = generatedTitle || defaultTitle;

    try {
      // Include research prompt in config for researcher agent
      const finalConfig = selectedAgentType === 'researcher' 
        ? { ...agentConfig, researchPrompt }
        : agentConfig;

      await createTask({
        courseInstanceId: selectedCourse.courseInstanceId,
        agentType: selectedAgentType,
        taskName,
        config: finalConfig,
        files: selectedFiles.map((f) => ({
          fileId: f.id,
          fileName: f.name,
          mimeType: f.mimeType || "application/octet-stream",
          fileSize: f.size,
        })),
      });

      // Reset form
      setSelectedFiles([]);
      setSelectedAgentType("");
      setAgentConfig({});
      setResearchPrompt("");
      
      // Refresh usage stats after creating task
      fetchUsage();
    } catch (error) {
      console.error("Error creating task:", error);
      // Error is handled by the context/hook
    }
  };

  if (checkingConnection || coursesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isGoogleDriveConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Connect Google Drive
        </h3>
        <p className="text-gray-600 mb-4">
          To use AI Agents, you need to connect your Google Drive first.
        </p>
        <a
          href="/dashboard/settings"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Go to Settings
        </a>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Courses Found
        </h3>
        <p className="text-gray-600 mb-4">
          Create a course first to use AI Agents.
        </p>
      </div>
    );
  }

  return (
    <AgentErrorBoundary>
      <div className="space-y-6">
        {/* Course Selector */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Course
          </label>
          <select
            value={selectedCourse?._id || ""}
            onChange={(e) => {
              const course = courses.find(c => c._id === e.target.value);
              setSelectedCourse(course || null);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {courses.map((course) => (
              <option key={course._id} value={course._id}>
                {course.name} ({course.code})
              </option>
            ))}
          </select>
        </div>

        {/* Agent Creation Section */}
        {selectedCourse && (
          <>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Create New Agent Task</h3>
              
              {/* Step 1: Select Files */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">
                    Step 1: Select Files {selectedAgentType === 'researcher' && '(Optional for Researcher)'}
                  </h4>
                  <button
                    onClick={() => setShowFileLibrary(true)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm rounded-md hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Browse Files
                  </button>
                </div>
                {selectedFiles.length > 0 ? (
                  <div className="space-y-2">
                    {selectedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                      >
                        <span className="text-sm">{file.name}</span>
                        <button
                          onClick={() => handleFileSelect(file)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No files selected</p>
                )}
              </div>

              {/* Step 2: Select Agent Type */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">
                    Step 2: Select Agent Type
                  </h4>
                  <button
                    onClick={() => setShowAgentModal(true)}
                    disabled={!selectedCourse}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Brain className="h-4 w-4 mr-1" />
                    Choose Agent
                  </button>
                </div>
                {selectedAgentType ? (
                  <div className="p-2 bg-gray-50 rounded-md">
                    <span className="text-sm font-medium">
                      {selectedAgentType.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No agent selected</p>
                )}
              </div>

              {/* Research Prompt for Researcher Agent */}
              {selectedAgentType === 'researcher' && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Research Prompt {!selectedFiles.length && '(Required when no files selected)'}
                  </h4>
                  <textarea
                    value={researchPrompt}
                    onChange={(e) => setResearchPrompt(e.target.value)}
                    placeholder="Enter your research question or topic..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              )}

              {/* Create Task Button */}
              <button
                onClick={() => handleGenerateTitle()}
                disabled={
                  !selectedAgentType || 
                  isLoading || 
                  isGeneratingTitle || 
                  (selectedAgentType === 'researcher' ? (selectedFiles.length === 0 && !researchPrompt) : selectedFiles.length === 0)
                }
                className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                  !selectedAgentType || isLoading || isGeneratingTitle || 
                  (selectedAgentType === 'researcher' ? (selectedFiles.length === 0 && !researchPrompt) : selectedFiles.length === 0)
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isLoading || isGeneratingTitle ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    {isGeneratingTitle ? "Generating Title..." : "Creating Task..."}
                  </span>
                ) : (
                  "Create Agent Task"
                )}
              </button>
            </div>

            {/* Usage Stats */}
            {usage && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Usage This Month</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Tasks Used</p>
                    <p className="text-2xl font-bold">{usage.tasksUsed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tasks Remaining</p>
                    <p className="text-2xl font-bold">{usage.remainingTasks}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(usage.tasksUsed / usage.taskLimit) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {usage.tasksUsed} of {usage.taskLimit} tasks used
                  </p>
                </div>
              </div>
            )}

            {/* Active Tasks */}
            {currentlyProcessingTask && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Processing Task</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">{currentlyProcessingTask.taskName}</p>
                    <p className="text-sm text-gray-600">
                      Status: {currentlyProcessingTask.status}
                    </p>
                  </div>
                  {currentlyProcessingTask.progress !== undefined && (
                    <div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${currentlyProcessingTask.progress}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {currentlyProcessingTask.progress}% complete
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => cancelTask(currentlyProcessingTask.id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Cancel Task
                  </button>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                  <button
                    onClick={clearError}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Past Completions */}
            <PastCompletions
              completions={completions}
              isLoading={isInitialTasksLoading}
              courseColors={courseColors}
            />
          </>
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
                Choose files from your Google Drive to process with AI agents. You can select multiple files at once.
              </p>
              <div className="flex-1 overflow-y-auto mb-6 -mx-2 px-2">
                <FileLibrary
                  onFileSelect={(files) => {
                    setSelectedFiles(files);
                  }}
                  selectedFiles={selectedFiles}
                  courseColors={courseColors}
                  isDisabled={false}
                  courseFiles={courseFiles}
                  filesLoading={filesLoading}
                  courseId={selectedCourse?._id}
                  onFilesUploaded={() => {
                    loadCourseFiles();
                  }}
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowFileLibrary(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--custom-primary-color)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowFileLibrary(false)}
                  className="px-4 py-2 bg-[var(--custom-primary-color)] text-white rounded-md hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--custom-primary-color)] cursor-pointer"
                >
                  Done ({selectedFiles.length} selected)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Agent Selection Modal */}
        {showAgentModal && selectedCourse && (
          <AgentConfig
            onSelect={handleAgentSelect}
            onClose={() => setShowAgentModal(false)}
            courseColors={courseColors}
            courseName={selectedCourse.name}
          />
        )}
      </div>
    </AgentErrorBoundary>
  );
}