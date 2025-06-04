"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Bot, 
  Trophy,
  Flame,
  CheckCircle2,
  Zap,
  FolderOpen,
  Settings,
  FileText,
  RefreshCw,
  Loader2,
  CheckCircle
} from "lucide-react";
import Terminal from "@/app/components/terminal/Terminal";
import { useAuth, useUser } from "@clerk/nextjs";
import { getImportedFiles } from "@/app/api/googleDrive.api";
import { fetchUserByClerkId } from "@/app/api/users.api";

export default function TerminalPage() {
  const [commandHistory, setCommandHistory] = useState([]);
  const [temperature, setTemperature] = useState(0.7);
  const [responseStyle, setResponseStyle] = useState("normal");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [courseFiles, setCourseFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [hasCompletedCycle, setHasCompletedCycle] = useState(false);
  
  const { getToken } = useAuth();
  const { user } = useUser();

  const tips = [
    {
      title: "Natural Language",
      content: "Just describe what you want in plain English"
    },
    {
      title: "File Context",
      content: "Select files to provide project context"
    },
    {
      title: "Creativity",
      content: "Lower for facts, higher for creative solutions"
    },
    {
      title: "Response Styles",
      content: "Try 'Tutor' for learning or 'Engineer' for code"
    },
    {
      title: "Multi-line",
      content: "Shift+Enter for new lines"
    },
    {
      title: "Fresh Start",
      content: "Hit 'clear' to begin a new conversation"
    }
  ];

  // Get custom colors from CSS variables - default values for SSR
  const [customColors, setCustomColors] = useState({ 
    primary: "#6366f1", 
    primaryLight: "#818cf8",
    primaryDark: "#4c1d95",
    textColor: "#ffffff" 
  });

  // Update colors on client side only
  useEffect(() => {
    const computedStyle = getComputedStyle(document.documentElement);
    const primaryColor = computedStyle.getPropertyValue("--custom-primary-color")?.trim() || "#6366f1";
    
    // Calculate if text should be white or black based on background
    const getTextColor = (hexColor) => {
      const r = parseInt(hexColor.substring(1, 3), 16);
      const g = parseInt(hexColor.substring(3, 5), 16);
      const b = parseInt(hexColor.substring(5, 7), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128 ? "#000000" : "#ffffff";
    };
    
    // Generate lighter/darker shades
    const adjustColor = (color, amount) => {
      const num = parseInt(color.replace("#", ""), 16);
      const r = Math.min(255, Math.max(0, (num >> 16) + amount));
      const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
      const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    };
    
    setCustomColors({
      primary: primaryColor,
      primaryLight: adjustColor(primaryColor, 40),
      primaryDark: adjustColor(primaryColor, -40),
      textColor: getTextColor(primaryColor)
    });
  }, []);

  // Helper function to get file icon based on type
  const getFileIcon = (type) => {
    const iconClass = "w-4 h-4";
    
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
        return <FileText className={`${iconClass} text-gray-600`} />;
    }
  };

  // Helper function to format upload date
  const formatUploadDate = (dateString) => {
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

  // Function to load course files
  const loadCourseFiles = useCallback(async () => {
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
        console.error("[Terminal] Unexpected files response:", response);
        setCourseFiles([]);
      }
    } catch (error) {
      console.error("[Terminal] Error loading files:", error);
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
      }
    };

    checkGoogleDriveConnection();
  }, [user?.id, loadCourseFiles]);

  // Auto-cycle through tips - stops after one complete cycle
  useEffect(() => {
    if (hasCompletedCycle) return;

    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex >= tips.length) {
          setHasCompletedCycle(true);
          return 0; // Reset to first tip after completing cycle
        }
        return nextIndex;
      });
    }, 8000); // Change tip every 8 seconds

    return () => clearInterval(interval);
  }, [tips.length, hasCompletedCycle]);

  const handleFileSelect = (file) => {
    setSelectedFiles((prev) => {
      const isSelected = prev.some((f) => f.id === file.id);
      if (isSelected) {
        return prev.filter((f) => f.id !== file.id);
      }
      return [...prev, file];
    });
  };

  const handleTerminalMessage = (message) => {
    setCommandHistory(prev => [...prev.slice(-4), message]);
  };

  return (
    <>
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: ${customColors.primary};
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: all 0.2s;
        }
        
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: ${customColors.primary};
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: all 0.2s;
          border: none;
        }
        
        .slider::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
      `}</style>
      <div className="h-full flex flex-col gap-4 p-4 bg-gray-50">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative inline-flex">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ 
                background: `linear-gradient(135deg, ${customColors.primary} 0%, ${customColors.primaryDark} 100%)` 
              }}
            >
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1">
              <div className="w-3 h-3 bg-green-400 rounded-full border-2 border-gray-50 animate-pulse" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: customColors.primary }}>AI Terminal</h1>
            <p className="text-sm text-gray-500">Your intelligent coding assistant</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Terminal Component - Takes 2 columns */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Terminal onMessage={handleTerminalMessage} className="flex-1" />
          
          {/* Tips Component - Below terminal, aligned with its bottom */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-24"
          >
            <div className="h-full flex items-center px-6">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <motion.div
                    key={currentTipIndex}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 min-w-0"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: customColors.primary }}>
                        {tips[currentTipIndex].title}
                      </span>
                      <span className="text-sm text-gray-600">
                        {tips[currentTipIndex].content}
                      </span>
                    </div>
                  </motion.div>
                </div>
                {/* Minimal progress indicator - vertical */}
                <div className="flex flex-col items-center gap-1.5 ml-4">
                  {tips.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentTipIndex(index);
                        setHasCompletedCycle(false); // Resume cycling when user manually changes
                      }}
                      className={`transition-all duration-300 ${
                        index === currentTipIndex 
                          ? 'w-1 h-6' 
                          : 'w-1 h-1'
                      } rounded-full`}
                      style={{
                        backgroundColor: index === currentTipIndex 
                          ? customColors.primary 
                          : `${customColors.primary}30`
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-3 flex flex-col">
          {/* Files List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-1"
          >
            <div 
              className="px-4 py-3 border-b border-gray-100"
              style={{ backgroundColor: `${customColors.primary}10` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5" style={{ color: customColors.primary }} />
                  <h2 className="text-lg font-semibold text-gray-900">Files</h2>
                  {courseFiles.length > 0 && (
                    <span className="text-sm text-gray-500">({courseFiles.length})</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedFiles.length > 0 && (
                    <span className="text-xs text-gray-500">{selectedFiles.length} selected</span>
                  )}
                  <button
                    onClick={loadCourseFiles}
                    disabled={filesLoading}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Refresh files"
                  >
                    {filesLoading ? (
                      <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              {!isGoogleDriveConnected ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500 mb-3">Connect Google Drive to see your files</p>
                  <a
                    href="/dashboard/settings"
                    className="text-sm font-medium hover:underline"
                    style={{ color: customColors.primary }}
                  >
                    Go to Settings
                  </a>
                </div>
              ) : filesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: customColors.primary }} />
                </div>
              ) : courseFiles.length > 0 ? (
                <div className="space-y-2 overflow-y-auto flex-1">
                  {courseFiles.map((file) => {
                    const isSelected = selectedFiles.some((f) => f.id === file.id);
                    return (
                      <div
                        key={file.id}
                        onClick={() => handleFileSelect(file)}
                        className={`flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-2 shadow-sm' 
                            : 'border border-gray-200 hover:bg-gray-50'
                        }`}
                        style={{
                          borderColor: isSelected ? customColors.primary : undefined,
                          backgroundColor: isSelected ? `${customColors.primary}08` : undefined
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-1.5 rounded-lg ${
                            isSelected ? 'bg-opacity-20' : 'bg-gray-100'
                          }`}
                          style={{
                            backgroundColor: isSelected ? `${customColors.primary}20` : undefined
                          }}
                          >
                            {getFileIcon(file.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatUploadDate(file.uploadedAt)}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: customColors.primary }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No files uploaded yet</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Terminal Config */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col"
          >
            <div 
              className="px-4 py-3 border-b border-gray-100"
              style={{ backgroundColor: `${customColors.primary}10` }}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" style={{ color: customColors.primary }} />
                <h2 className="text-lg font-semibold text-gray-900">Terminal Config</h2>
              </div>
            </div>
            <div className="p-4 space-y-4 flex-1 flex flex-col">
              {/* Temperature Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-900">
                    AI Creativity
                  </label>
                  <span className="text-sm font-mono px-2 py-1 rounded-md" 
                    style={{ 
                      backgroundColor: `${customColors.primary}15`,
                      color: customColors.primary 
                    }}
                  >
                    {temperature.toFixed(1)}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #e5e7eb 0%, ${customColors.primary} ${temperature * 100}%, #e5e7eb ${temperature * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>Focused</span>
                    <span>Balanced</span>
                    <span>Creative</span>
                  </div>
                </div>
              </div>

              {/* Response Style */}
              <div className="space-y-3 flex-1">
                <label className="text-sm font-semibold text-gray-900">
                  Response Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'normal', label: 'Normal', icon: '💬' },
                    { value: 'concise', label: 'Concise', icon: '📝' },
                    { value: 'verbose', label: 'Verbose', icon: '📚' },
                    { value: 'casual', label: 'Casual', icon: '😊' },
                    { value: 'academic', label: 'Academic', icon: '🎓' },
                    { value: 'tutor', label: 'Tutor', icon: '👨‍🏫' },
                    { value: 'engineer', label: 'Engineer', icon: '⚙️' }
                  ].map((style) => (
                    <button
                      key={style.value}
                      onClick={() => setResponseStyle(style.value)}
                      className={`p-3 rounded-xl border-2 transition-all duration-200 hover:shadow-sm ${
                        responseStyle === style.value 
                          ? 'border-opacity-100' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{
                        borderColor: responseStyle === style.value ? customColors.primary : undefined,
                        backgroundColor: responseStyle === style.value ? `${customColors.primary}08` : undefined
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{style.icon}</span>
                        <span className={`text-sm font-medium ${
                          responseStyle === style.value ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {style.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Commands Today</p>
              <p className="text-xl font-bold text-gray-900">{commandHistory.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl"
              style={{ backgroundColor: `${customColors.primary}15` }}
            >
              <Zap className="w-5 h-5" style={{ color: customColors.primary }} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">AI Suggestions</p>
              <p className="text-xl font-bold text-gray-900">24</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-xl">
              <Trophy className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Lines Improved</p>
              <p className="text-xl font-bold text-gray-900">156</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-50 rounded-xl">
              <Flame className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Learning Streak</p>
              <p className="text-xl font-bold text-gray-900">7 days</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
    </>
  );
}