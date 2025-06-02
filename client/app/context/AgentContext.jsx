'use client';

import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import * as agentsApi from '../api/agents.api';

// Action types
const ActionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_TASKS: 'SET_TASKS',
  ADD_TASK: 'ADD_TASK',
  UPDATE_TASK: 'UPDATE_TASK',
  SET_CURRENT_TASK: 'SET_CURRENT_TASK',
  SET_USAGE: 'SET_USAGE',
  SET_QUEUE_STATUS: 'SET_QUEUE_STATUS',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Initial state
const initialState = {
  tasks: [],
  currentTask: null,
  usage: null,
  queueStatus: null,
  isLoading: false,
  error: null,
  pollingJobs: new Map(), // Map of jobId to polling stop function
};

// Reducer
function agentReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };
    
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };
    
    case ActionTypes.SET_TASKS:
      return { ...state, tasks: action.payload };
    
    case ActionTypes.ADD_TASK:
      return { ...state, tasks: [...state.tasks, action.payload] };
    
    case ActionTypes.UPDATE_TASK:
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id ? { ...task, ...action.payload } : task
        ),
        currentTask: state.currentTask?.id === action.payload.id
          ? { ...state.currentTask, ...action.payload }
          : state.currentTask,
      };
    
    case ActionTypes.SET_CURRENT_TASK:
      return { ...state, currentTask: action.payload };
    
    case ActionTypes.SET_USAGE:
      return { ...state, usage: action.payload };
    
    case ActionTypes.SET_QUEUE_STATUS:
      return { ...state, queueStatus: action.payload };
    
    case ActionTypes.CLEAR_ERROR:
      return { ...state, error: null };
    
    default:
      return state;
  }
}

// Create context
const AgentContext = createContext(null);

// Provider component
export function AgentProvider({ children }) {
  const [state, dispatch] = useReducer(agentReducer, initialState);
  const { getToken } = useAuth();
  const pollingRefs = useRef(new Map());

  // Get auth token helper
  const getAuthToken = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');
    return token;
  }, [getToken]);

  // Create a new agent task
  const createTask = useCallback(async (taskData) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });
    try {
      const token = await getAuthToken();
      
      // Create task with queue processing
      const response = await agentsApi.createTaskWithQueue(taskData, token);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create task');
      }

      const { taskId, jobId } = response;
      
      // Create initial task object
      const newTask = {
        id: taskId,
        jobId,
        ...taskData,
        status: 'queued',
        progress: 0,
        createdAt: new Date().toISOString(),
      };
      
      dispatch({ type: ActionTypes.ADD_TASK, payload: newTask });
      
      // Start polling for status
      startPolling(jobId, taskId);
      
      return newTask;
    } catch (error) {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
      throw error;
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  }, [getAuthToken]);

  // Start polling for job status
  const startPolling = useCallback(async (jobId, taskId) => {
    // Stop any existing polling for this job
    if (pollingRefs.current.has(jobId)) {
      pollingRefs.current.get(jobId)();
    }

    try {
      const token = await getAuthToken();
      const stopPolling = agentsApi.pollJobStatus(
        jobId,
        token,
        {
          interval: 2000,
          timeout: 600000,
          onProgress: (progress) => {
            dispatch({
              type: ActionTypes.UPDATE_TASK,
              payload: { id: taskId, progress, status: 'processing' },
            });
          },
          onComplete: (result) => {
            dispatch({
              type: ActionTypes.UPDATE_TASK,
              payload: {
                id: taskId,
                status: 'completed',
                progress: 100,
                result,
                completedAt: new Date().toISOString(),
              },
            });
            pollingRefs.current.delete(jobId);
          },
          onError: (error) => {
            dispatch({
              type: ActionTypes.UPDATE_TASK,
              payload: {
                id: taskId,
                status: 'failed',
                error: error.message,
                completedAt: new Date().toISOString(),
              },
            });
            pollingRefs.current.delete(jobId);
          },
        }
      );

      pollingRefs.current.set(jobId, stopPolling);
    } catch (error) {
      console.error('Error starting polling:', error);
      dispatch({
        type: ActionTypes.UPDATE_TASK,
        payload: {
          id: taskId,
          status: 'failed',
          error: error.message,
          completedAt: new Date().toISOString(),
        },
      });
    }
  }, [getAuthToken]);

  // Stop polling for a specific job
  const stopPolling = useCallback((jobId) => {
    if (pollingRefs.current.has(jobId)) {
      pollingRefs.current.get(jobId)();
      pollingRefs.current.delete(jobId);
    }
  }, []);

  // Stop all polling
  const stopAllPolling = useCallback(() => {
    pollingRefs.current.forEach((stop) => stop());
    pollingRefs.current.clear();
  }, []);

  // Get user usage statistics
  const fetchUsage = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const response = await agentsApi.getUserUsage(token);
      
      if (response.success) {
        dispatch({ type: ActionTypes.SET_USAGE, payload: response.data });
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching usage:', error);
      throw error;
    }
  }, [getAuthToken]);

  // Get queue status
  const fetchQueueStatus = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const response = await agentsApi.getQueueStatus(token);
      
      if (response.success) {
        dispatch({ type: ActionTypes.SET_QUEUE_STATUS, payload: response.stats });
      }
      
      return response.stats;
    } catch (error) {
      console.error('Error fetching queue status:', error);
      throw error;
    }
  }, [getAuthToken]);

  // Select a task as current
  const selectTask = useCallback((task) => {
    dispatch({ type: ActionTypes.SET_CURRENT_TASK, payload: task });
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: ActionTypes.CLEAR_ERROR });
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopAllPolling();
    };
  }, [stopAllPolling]);

  const value = {
    // State
    ...state,
    
    // Actions
    createTask,
    selectTask,
    fetchUsage,
    fetchQueueStatus,
    clearError,
    stopPolling,
    stopAllPolling,
  };

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

// Hook to use agent context
export function useAgents() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgents must be used within AgentProvider');
  }
  return context;
}

// Export action types for testing
export { ActionTypes };