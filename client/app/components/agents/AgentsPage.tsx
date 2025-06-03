"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { AlertCircle, BookOpen, ClipboardCheck, FileText, GraduationCap, Loader2, Plus, Search, X, Brain, FileSearch, MessageSquare, Zap, Sparkles, FlaskConical, Users, ArrowRight, Check, Clock, TrendingUp } from "lucide-react";
import React, { useEffect, useState } from "react";
import { generateTaskTitle } from "../../api/agents.api";
import { getImportedFiles } from "../../api/googleDrive.api";
import { fetchUserByClerkId, fetchUserAgentStats } from "../../api/users.api";
import { useAgents } from "../../hooks/agents/useAgents";
import AgentConfig from "../course/agent/AgentConfig";
import { AgentErrorBoundary } from "../course/agent/AgentErrorBoundary";
import FileLibrary from "../course/agent/FileLibrary";
import PastCompletions from "../course/agent/PastCompletions";
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

interface Course {
  _id: string;
  courseInstanceId: string;
  name: string;
  code: string;
}

// Agent types configuration
const AGENT_TYPES = [
  {
    id: 'note-taker',
    title: 'Note Taker',
    description: 'Transform lectures and documents into organized study notes',
    icon: '/agentIcons/NoteTaker.png',
    gradient: 'from-violet-600 to-indigo-600',
    borderColor: 'border-violet-200',
    bgColor: 'bg-violet-50',
    available: true,
    features: [
      'Smart summarization',
      'Key concept extraction',
      'Custom formatting',
      'Multiple file support'
    ],
    stats: { saved: '2.5hrs', accuracy: '95%' },
    activeColor: 'from-violet-400 to-indigo-400'
  },
  {
    id: 'researcher',
    title: 'Researcher',
    description: 'Analyze and synthesize information across multiple sources',
    icon: '/agentIcons/researcher.png',
    gradient: 'from-emerald-600 to-teal-600',
    borderColor: 'border-emerald-200',
    bgColor: 'bg-emerald-50',
    available: true,
    features: [
      'Cross-reference analysis',
      'Citation extraction',
      'Thematic synthesis',
      'Research insights'
    ],
    stats: { saved: '3hrs', accuracy: '92%' },
    activeColor: 'from-emerald-400 to-teal-400'
  },
  {
    id: 'flashcard-maker',
    title: 'Flashcard Maker',
    description: 'Create interactive flashcards for effective memorization',
    icon: '/agentIcons/FlashcardMaker.png',
    gradient: 'from-amber-600 to-orange-600',
    borderColor: 'border-amber-200',
    bgColor: 'bg-amber-50',
    available: false,
    features: [
      'Auto-generated cards',
      'Spaced repetition',
      'Image support',
      'Export to Anki'
    ],
    stats: { saved: '1.5hrs', accuracy: '90%' },
    activeColor: 'from-amber-400 to-orange-400'
  },
  {
    id: 'homework-assistant',
    title: 'Homework Assistant',
    description: 'Get guidance on assignments and problem-solving',
    icon: '/agentIcons/homeworkAssistant.png',
    gradient: 'from-rose-600 to-pink-600',
    borderColor: 'border-rose-200',
    bgColor: 'bg-rose-50',
    available: false,
    features: [
      'Step-by-step solutions',
      'Concept explanations',
      'Practice problems',
      'Progress tracking'
    ],
    stats: { saved: '2hrs', accuracy: '88%' },
    activeColor: 'from-rose-400 to-pink-400'
  }
];

export default function AgentsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [selectedAgentCard, setSelectedAgentCard] = useState<string | null>(null);
  // Remove course-related state

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
  const [userAgentStats, setUserAgentStats] = useState<any>(null);

  // Load all tasks on mount
  useEffect(() => {
    fetchTasks(); // Fetch all tasks without course filter
  }, [fetchTasks]);

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

  // Fetch user agent stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetchUserAgentStats(user.id);
        if (response.success) {
          setUserAgentStats(response.agentStats);
        }
      } catch (error) {
        console.error("Error fetching agent stats:", error);
      }
    };
    
    fetchStats();
  }, [user?.id]);

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
    if (selectedFiles.length > 0 || (agentType === 'researcher' && config.researchPrompt)) {
      await handleGenerateTitle(agentType, config);
    }
  };

  const handleGenerateTitle = async (agentType?: string, config?: any) => {
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
    if (!selectedAgentType) return;
    
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
      
      // Refresh user agent stats
      if (user?.id) {
        try {
          const response = await fetchUserAgentStats(user.id);
          if (response.success) {
            setUserAgentStats(response.agentStats);
          }
        } catch (error) {
          console.error("Error refreshing agent stats:", error);
        }
      }
    } catch (error) {
      console.error("Error creating task:", error);
      // Error is handled by the context/hook
    }
  };

  if (checkingConnection) {
    return (
      <div className="flex justify-center items-center h-96 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--custom-primary-color)] mx-auto mb-4" />
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
          To use AI Agents, you need to connect your Google Drive first.
        </p>
        <a
          href="/dashboard/settings"
          className="inline-flex items-center px-6 py-2.5 bg-[var(--custom-primary-color)] text-white rounded-xl hover:bg-opacity-90 transition-all duration-200"
        >
          Go to Settings
        </a>
      </div>
    );
  }


  // Handle agent card click
  const handleAgentCardClick = (agentId: string) => {
    if (agentId === 'note-taker') {
      router.push('/dashboard/agents/note-taker');
    } else if (agentId === 'researcher') {
      router.push('/dashboard/agents/researcher');
    }
    // Add more routes as needed
  };

  return (
    <AgentErrorBoundary>
      <style jsx>{`
        @keyframes float-up {
          0% {
            transform: translateY(100%) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 0.4;
            transform: translateY(90%) scale(1);
          }
          90% {
            opacity: 0.4;
            transform: translateY(10%) scale(1);
          }
          100% {
            transform: translateY(0%) scale(0);
            opacity: 0;
          }
        }
      `}</style>
      <div className="h-full flex flex-col p-6">
        {/* Agent Cards - Horizontal Grid Layout */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
          {AGENT_TYPES.map((agent) => (
            <div
              key={agent.id}
              onClick={() => agent.available && handleAgentCardClick(agent.id)}
              className={`group relative overflow-hidden bg-white rounded-2xl shadow-sm border transition-all duration-300 h-full ${
                agent.available 
                  ? `${agent.borderColor} hover:shadow-xl hover:border-opacity-50 cursor-pointer` 
                  : 'border-gray-200 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex flex-col h-full">
                {/* Icon Section */}
                <div className={`relative h-[40%] w-full overflow-hidden ${agent.bgColor}`}>
                  <Image
                    src={agent.icon}
                    alt={agent.title}
                    fill
                    className="object-cover"
                    priority
                  />
                  {/* Gradient Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${agent.gradient} opacity-10`} />
                  
                  {/* Available Indicator */}
                  {agent.available && (
                    <div className="absolute top-3 right-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    </div>
                  )}
                </div>

                {/* Text Content */}
                <div className="flex-1 p-5 flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{agent.title}</h3>
                    {agent.available && (
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0 ml-2" />
                    )}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">{agent.description}</p>
                  
                  {/* Features List */}
                  <div className="space-y-2 mb-auto">
                    {agent.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Check className={`w-3.5 h-3.5 ${agent.available ? 'text-green-500' : 'text-gray-400'}`} />
                        <span className="text-xs text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Creative Bottom Section */}
                  <div className="mt-4">
                    {/* Progress/Activity Visualization */}
                    <div className={`relative h-20 rounded-lg overflow-hidden ${agent.available ? agent.bgColor : 'bg-gray-50'}`}>
                      {/* Animated Wave Pattern */}
                      <div className="absolute inset-0">
                        <div className={`absolute inset-0 bg-gradient-to-r ${agent.available ? agent.activeColor : 'from-gray-300 to-gray-400'} opacity-20`}>
                          <div className="absolute inset-0 bg-white opacity-60" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-8">
                          <div className={`h-full bg-gradient-to-t from-white via-white to-transparent`} />
                        </div>
                        
                        {/* Floating Particles Animation */}
                        {agent.available && (
                          <div className="absolute inset-0 overflow-hidden">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`absolute w-1 h-1 bg-gradient-to-r ${agent.activeColor} rounded-full opacity-40`}
                                style={{
                                  left: `${20 + i * 15}%`,
                                  animation: `float-up ${3 + i}s ease-in-out infinite`,
                                  animationDelay: `${i * 0.5}s`
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Content Overlay */}
                      <div className="relative z-10 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {agent.available ? (
                            <>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  agent.id === 'note-taker' && userAgentStats?.noteTaker?.notesCreated > 0 ? 'bg-green-400 animate-pulse' : 
                                  agent.id === 'researcher' && userAgentStats?.researcher?.topicsResearched > 0 ? 'bg-green-400 animate-pulse' : 
                                  'bg-gray-400'
                                }`} />
                              </div>
                              <span className="text-xs font-medium text-gray-700">
                                {agent.id === 'note-taker' && `${userAgentStats?.noteTaker?.notesCreated || 0} notes created`}
                                {agent.id === 'researcher' && `${userAgentStats?.researcher?.topicsResearched || 0} topics researched`}
                                {agent.id === 'flashcard-maker' && `${userAgentStats?.flashcardMaker?.flashcardsCreated || 0} cards created`}
                                {agent.id === 'homework-assistant' && `${userAgentStats?.homeworkAssistant?.problemsSolved || 0} problems solved`}
                              </span>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-2 opacity-50">
                                {[...Array(3)].map((_, i) => (
                                  <div 
                                    key={i} 
                                    className={`w-6 h-6 rounded-full border-2 border-white bg-gray-300`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-gray-400">
                                {agent.id === 'flashcard-maker' && 'Coming soon'}
                                {agent.id === 'homework-assistant' && 'Coming soon'}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Mini Action Button */}
                        {agent.available && (
                          <div className={`p-1.5 rounded-full bg-white bg-opacity-80 group-hover:bg-opacity-100 transition-all`}>
                            <Sparkles className="w-3.5 h-3.5 text-gray-700" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  
                  {/* Subtle Background Pattern */}
                  <div className="absolute inset-0 opacity-5 pointer-events-none">
                    <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-br ${agent.gradient} rounded-full blur-3xl`} />
                    <div className={`absolute top-1/2 left-0 w-24 h-24 bg-gradient-to-tr ${agent.gradient} rounded-full blur-2xl`} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AgentErrorBoundary>
  );
}