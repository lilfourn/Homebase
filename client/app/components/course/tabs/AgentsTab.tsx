"use client";

import React, { useState, useEffect } from 'react';
import FileLibrary from '../agent/FileLibrary';
import AgentTypeSelector from '../agent/AgentTypeSelector';
import AgentConfig from '../agent/AgentConfig';
import PastCompletions from '../agent/PastCompletions';
import { AgentErrorBoundary } from '../agent/AgentErrorBoundary';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAgents } from '../../../hooks/agents/useAgents';
import { getImportedFiles } from '../../../api/googleDrive.api';
import { fetchUserByClerkId } from '../../../api/users.api';
import { useAuth } from '@clerk/nextjs';
import { useUser } from '@clerk/nextjs';

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
  status: 'completed' | 'failed' | 'processing';
  completedAt: Date;
  files: SelectedFile[];
  result?: string;
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
    console.log('[AgentsTab] Component mounted', { course });
    return () => console.log('[AgentsTab] Component unmounted');
  }, []);

  const { user } = useUser();
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);

  // Use default colors - in the future these could come from user preferences
  const courseColors = React.useMemo(() => {
    // Extract colors from CSS variables if available, otherwise use defaults
    if (typeof window !== 'undefined') {
      const computedStyle = getComputedStyle(document.documentElement);
      const primaryColor = computedStyle.getPropertyValue('--custom-primary-color')?.trim() || '#6366f1';
      const secondaryColor = computedStyle.getPropertyValue('--custom-secondary-color')?.trim() || '#8b5cf6';
      console.log('[AgentsTab] Using CSS variable colors', { primaryColor, secondaryColor });
      return {
        primary: primaryColor,
        secondary: secondaryColor
      };
    }
    return { primary: '#6366f1', secondary: '#8b5cf6' };
  }, []);
  
  const { getToken } = useAuth();
  const { 
    tasks, 
    createTask, 
    fetchUsage, 
    usage, 
    isLoading, 
    error, 
    clearError 
  } = useAgents();
  
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [selectedAgentType, setSelectedAgentType] = useState<string>('');
  const [agentConfig, setAgentConfig] = useState<any>({});
  const [taskName, setTaskName] = useState('');
  const [courseFiles, setCourseFiles] = useState<SelectedFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  
  // Convert tasks to completions format
  const completions = tasks.map(task => ({
    id: task.id,
    agentType: task.agentType,
    taskName: task.taskName,
    status: task.status as 'completed' | 'failed' | 'processing',
    completedAt: task.completedAt ? new Date(task.completedAt) : new Date(task.createdAt),
    files: task.files || [],
    result: task.result
  }));

  // Function to load course files
  const loadCourseFiles = React.useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      
      console.log('[AgentsTab] Loading files for course._id:', course._id);
      setFilesLoading(true);
      // Load ALL user files (not filtered by course) to ensure we see everything
      // We'll pass null to get all files, then filter client-side if needed
      const response = await getImportedFiles(token, null);
      console.log('[AgentsTab] Files response:', response);
      
      // The backend returns { files, totalCount } directly, not { success, files }
      if (response.files && Array.isArray(response.files)) {
        // Show all files, but you could filter by courseId here if needed
        const files = response.files.map(file => ({
          id: file.fileId,
          name: file.fileName,
          type: file.mimeType.split('/')[1] || 'unknown',
          size: file.size || 0,
          courseId: file.courseId, // Keep track of which course it belongs to
          isFromThisCourse: file.courseId === course._id
        }));
        console.log('[AgentsTab] Total files:', files.length);
        console.log('[AgentsTab] Files from this course:', files.filter(f => f.isFromThisCourse).length);
        setCourseFiles(files);
      } else {
        console.log('[AgentsTab] No files found or invalid response format');
        setCourseFiles([]);
      }
    } catch (error) {
      console.error('Error loading course files:', error);
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
        console.error('Error checking Google Drive connection:', error);
        setIsGoogleDriveConnected(false);
      } finally {
        setCheckingConnection(false);
      }
    };

    checkGoogleDriveConnection();
  }, [user?.id]);

  // Load course files on mount
  useEffect(() => {
    if (isGoogleDriveConnected && !checkingConnection) {
      loadCourseFiles();
      fetchUsage();
    }
  }, [loadCourseFiles, fetchUsage, isGoogleDriveConnected, checkingConnection]);

  const handleFileSelect = (files: SelectedFile[]) => {
    console.log('[AgentsTab] Files selected', { count: files.length, files });
    setSelectedFiles(files);
  };

  const handleAgentSubmit = async () => {
    console.log('[AgentsTab] Submit clicked', { 
      selectedAgentType, 
      fileCount: selectedFiles.length,
      taskName,
      agentConfig 
    });

    if (!selectedAgentType || selectedFiles.length === 0) {
      console.warn('[AgentsTab] Submit validation failed', { 
        hasAgentType: !!selectedAgentType, 
        hasFiles: selectedFiles.length > 0 
      });
      return;
    }
    
    try {
      // Check usage limits
      if (usage && usage.remainingTasks <= 0) {
        alert('You have reached your monthly task limit. Please upgrade your plan.');
        return;
      }
      
      // Create agent task
      const taskData = {
        courseInstanceId: course.courseInstanceId,
        taskName: taskName || `${selectedAgentType} Task`,
        agentType: selectedAgentType.toLowerCase().replace(' ', '-'),
        config: agentConfig,
        files: selectedFiles.map(f => ({ fileId: f.id }))
      };
      
      await createTask(taskData);
      
      // Reset form
      setSelectedFiles([]);
      setSelectedAgentType('');
      setTaskName('');
      setAgentConfig({});
      
      // Refresh usage
      fetchUsage();
    } catch (error) {
      console.error('[AgentsTab] Error during task creation', error);
    }
  };

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
              Tasks remaining this month: <strong>{usage.remainingTasks}</strong> / {usage.monthlyLimit}
            </span>
            {usage.remainingTasks <= 5 && (
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                Low on tasks
              </span>
            )}
          </div>
        </div>
      )}
      {/* Task Name Input */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Working on:</span>
          <input
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="Assignment name (estimated time)"
            className="flex-1 px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 transition-colors"
            style={{ 
              borderColor: courseColors.primary + '40',
              focusBorderColor: courseColors.primary 
            }}
            disabled={isLoading}
          />
          {isLoading && (
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: courseColors.primary }} />
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {checkingConnection ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: courseColors.primary }} />
          <span className="ml-2 text-sm text-gray-600">Checking Google Drive connection...</span>
        </div>
      ) : !isGoogleDriveConnected ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <p className="text-amber-800 mb-4">
            Please connect your Google Drive account to use the Agents feature.
          </p>
          <button
            onClick={() => window.location.href = '/dashboard/settings'}
            className="px-4 py-2 rounded-md text-white font-medium"
            style={{ backgroundColor: courseColors.primary }}
          >
            Go to Settings
          </button>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File Library Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: courseColors.primary }}>
            File Library
          </h3>
          <FileLibrary 
            onFileSelect={handleFileSelect}
            selectedFiles={selectedFiles}
            courseColors={courseColors}
            isDisabled={isLoading}
            courseFiles={courseFiles}
            filesLoading={filesLoading}
            courseId={course._id}
            onFilesUploaded={loadCourseFiles}
          />
        </div>

        {/* Agent Configuration Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: courseColors.primary }}>
            Agent Configuration
          </h3>
          
          {selectedFiles.length > 0 && (
            <>
              <div className="mb-4 p-3 rounded-md" style={{ backgroundColor: courseColors.secondary + '10' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Selected: {selectedFiles.length} file(s)</span>
                  {isLoading && (
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Processing...</span>
                    </div>
                  )}
                </div>
              </div>

              <AgentTypeSelector
                value={selectedAgentType}
                onChange={setSelectedAgentType}
                courseColors={courseColors}
                isDisabled={isLoading}
              />

              {selectedAgentType && (
                <div className="mt-4">
                  <AgentConfig
                    agentType={selectedAgentType}
                    config={agentConfig}
                    onChange={setAgentConfig}
                    courseColors={courseColors}
                    isDisabled={isLoading}
                  />
                  
                  <button
                    onClick={handleAgentSubmit}
                    disabled={isLoading || !taskName}
                    className="w-full mt-4 px-4 py-2 text-white font-medium rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ 
                      backgroundColor: isLoading ? '#6b7280' : courseColors.primary,
                      boxShadow: !isLoading ? `0 4px 12px ${courseColors.primary}40` : 'none'
                    }}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      'Send'
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {selectedFiles.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">Select files from the library to configure an agent</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Past Completions Section - Show only if connected */}
      {isGoogleDriveConnected && !checkingConnection && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: courseColors.primary }}>
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