"use client";

import { useAuth } from "@clerk/nextjs";
import React, {
    createContext,
    useCallback,
    useContext,
    useReducer,
    useRef,
} from "react";
import * as agentsApi from "../api/agents.api";

// Action types
const ActionTypes = {
  SET_LOADING: "SET_LOADING",
  SET_INITIAL_TASKS_LOADING: "SET_INITIAL_TASKS_LOADING",
  SET_ERROR: "SET_ERROR",
  SET_TASKS: "SET_TASKS",
  ADD_TASK: "ADD_TASK",
  UPDATE_TASK: "UPDATE_TASK",
  DELETE_TASK: "DELETE_TASK",
  SET_CURRENT_TASK: "SET_CURRENT_TASK",
  SET_USAGE: "SET_USAGE",
  SET_QUEUE_STATUS: "SET_QUEUE_STATUS",
  CLEAR_ERROR: "CLEAR_ERROR",
  SET_TEMPLATES: "SET_TEMPLATES",
  SET_LOADING_TEMPLATES: "SET_LOADING_TEMPLATES",
  ADD_MESSAGE_SUCCESS: "ADD_MESSAGE_SUCCESS",
};

// Initial state
const initialState = {
  tasks: [],
  currentTask: null,
  templates: [],
  isLoadingTemplates: false,
  usage: null,
  queueStatus: null,
  isLoading: false,
  isInitialTasksLoading: true,
  error: null,
  pollingJobs: new Map(), // Map of jobId to polling stop function
};

// Reducer
function agentReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ActionTypes.SET_INITIAL_TASKS_LOADING:
      return { ...state, isInitialTasksLoading: action.payload };

    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };

    case ActionTypes.SET_TASKS:
      return { ...state, tasks: action.payload };

    case ActionTypes.ADD_TASK:
      return { ...state, tasks: [...state.tasks, action.payload] };

    case ActionTypes.UPDATE_TASK:
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task._id === action.payload._id
            ? { ...task, ...action.payload }
            : task
        ),
        currentTask:
          state.currentTask?._id === action.payload._id
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

    case ActionTypes.DELETE_TASK:
      return {
        ...state,
        tasks: state.tasks.filter((task) => task._id !== action.payload.taskId),
        currentTask: state.currentTask?._id === action.payload.taskId ? null : state.currentTask,
      };

    case ActionTypes.SET_TEMPLATES:
      return { ...state, templates: action.payload, isLoadingTemplates: false };

    case ActionTypes.SET_LOADING_TEMPLATES:
      return { ...state, isLoadingTemplates: action.payload };

    case ActionTypes.ADD_MESSAGE_SUCCESS:
      console.log("Message added successfully for task:", action.payload.taskId);
      return {
        ...state,
        tasks: state.tasks.map(task => 
          task._id === action.payload.taskId 
            ? { ...task, conversation: action.payload.conversation }
            : task
        ),
        currentTask: state.currentTask?._id === action.payload.taskId 
            ? { ...state.currentTask, conversation: action.payload.conversation } 
            : state.currentTask
      };

    default:
      return state;
  }
}

// Create context
const AgentContext = createContext(null);

// Provider component
export function AgentProvider({ children }) {
  const [state, dispatch] = useReducer(agentReducer, initialState);
  const { getToken, userId } = useAuth();
  const pollingRefs = useRef(new Map());

  // Get auth token helper
  const getAuthToken = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    return token;
  }, [getToken]);

  // Create a new agent task
  const createTask = useCallback(
    async (taskData) => {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      try {
        const token = await getAuthToken();

        // Create task with queue processing
        const response = await agentsApi.createTaskWithQueue(taskData, token);

        if (!response.success || !response.task) {
          throw new Error(
            response.error || "Failed to create task or task data missing"
          );
        }

        const newTask = response.task;

        dispatch({
          type: ActionTypes.ADD_TASK,
          payload: { ...newTask, id: newTask._id },
        });

        // Start polling for status using response.jobId
        if (response.jobId) {
          startPolling(response.jobId, newTask._id);
        }

        return newTask;
      } catch (error) {
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
        throw error;
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      }
    },
    [getAuthToken]
  );

  // Start polling for job status
  const startPolling = useCallback(
    async (jobId, taskId) => {
      // Stop any existing polling for this job
      if (pollingRefs.current.has(jobId)) {
        pollingRefs.current.get(jobId)();
      }

      try {
        const token = await getAuthToken();
        const stopPolling = agentsApi.pollJobStatus(jobId, token, {
          interval: 2000,
          timeout: 600000,
          onProgress: (progress) => {
            dispatch({
              type: ActionTypes.UPDATE_TASK,
              payload: { _id: taskId, progress, status: "processing" },
            });
          },
          onComplete: (completedTaskData) => {
            dispatch({
              type: ActionTypes.UPDATE_TASK,
              payload: {
                ...completedTaskData,
                _id: taskId,
                status: "completed",
                progress: 100,
              },
            });
            pollingRefs.current.delete(jobId);
          },
          onError: (error) => {
            dispatch({
              type: ActionTypes.UPDATE_TASK,
              payload: {
                _id: taskId,
                status: "failed",
                error: error.message,
                completedAt: new Date().toISOString(),
              },
            });
            pollingRefs.current.delete(jobId);
          },
        });

        pollingRefs.current.set(jobId, stopPolling);
      } catch (error) {
        console.error("Error starting polling:", error);
        dispatch({
          type: ActionTypes.UPDATE_TASK,
          payload: {
            _id: taskId,
            status: "failed",
            error: error.message,
            completedAt: new Date().toISOString(),
          },
        });
      }
    },
    [getAuthToken]
  );

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
      console.error("Error fetching usage:", error);
      throw error;
    }
  }, [getAuthToken]);

  // Get queue status
  const fetchQueueStatus = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const response = await agentsApi.getQueueStatus(token);

      if (response.success) {
        dispatch({
          type: ActionTypes.SET_QUEUE_STATUS,
          payload: response.stats,
        });
      }

      return response.stats;
    } catch (error) {
      console.error("Error fetching queue status:", error);
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

  const fetchTasks = useCallback(
    async (courseId = null) => {
      dispatch({ type: ActionTypes.SET_INITIAL_TASKS_LOADING, payload: true });
      try {
        const token = await getAuthToken();
        const response = await agentsApi.getTasks(token, courseId);
        if (response.success) {
          const tasksWithId = response.data.map((task) => ({
            ...task,
            id: task._id,
          }));
          dispatch({ type: ActionTypes.SET_TASKS, payload: tasksWithId });
        } else {
          dispatch({
            type: ActionTypes.SET_ERROR,
            payload: response.error || "Failed to fetch tasks",
          });
        }
      } catch (error) {
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
      } finally {
        dispatch({
          type: ActionTypes.SET_INITIAL_TASKS_LOADING,
          payload: false,
        });
      }
    },
    [getAuthToken]
  );

  const fetchAgentTemplates = useCallback(async (agentType = null) => {
    dispatch({ type: ActionTypes.SET_LOADING_TEMPLATES, payload: true });
    try {
      const token = await getAuthToken();
      const response = await agentsApi.getAgentTemplates(token, agentType);
      if (response.success) {
        dispatch({ type: ActionTypes.SET_TEMPLATES, payload: response.data });
      }
    } catch (error) {
      console.error("Error fetching agent templates:", error);
      dispatch({ type: ActionTypes.SET_LOADING_TEMPLATES, payload: false });
    }
  }, [getAuthToken]);

  const deleteTask = useCallback(async (taskId) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });
    try {
      const token = await getAuthToken();
      const response = await agentsApi.deleteAgentTask(taskId, token);
      if (response.success) {
        dispatch({ type: ActionTypes.DELETE_TASK, payload: { taskId } });
      } else {
        dispatch({ type: ActionTypes.SET_ERROR, payload: response.error || "Failed to delete task" });
      }
    } catch (error) {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  }, [getAuthToken]);

  const cancelTask = useCallback(async (taskId) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });
    try {
      const token = await getAuthToken();
      const response = await agentsApi.cancelAgentTask(taskId, token);
      if (response.success) {
        // Stop polling for this task
        const task = state.tasks.find(t => t._id === taskId || t.id === taskId);
        if (task && task.jobId) {
          stopPolling(task.jobId);
        }
        // Update the task status in state
        dispatch({ 
          type: ActionTypes.UPDATE_TASK, 
          payload: response.task 
        });
      } else {
        dispatch({ type: ActionTypes.SET_ERROR, payload: response.error || "Failed to cancel task" });
      }
    } catch (error) {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  }, [getAuthToken, stopPolling, state.tasks]);

  const addMessage = useCallback(async (taskId, messageData) => {
    try {
      const token = await getAuthToken();
      const response = await agentsApi.addMessageToTask(taskId, messageData, token);
      if (response.success && response.conversation) {
        dispatch({ type: ActionTypes.ADD_MESSAGE_SUCCESS, payload: { taskId, conversation: response.conversation } });
      } else {
        dispatch({ type: ActionTypes.SET_ERROR, payload: response.error || "Failed to send message" });
      }
      return response;
    } catch (error) {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [getAuthToken]);

  // Cleanup on unmount
  React.useEffect(() => {
    if (userId) {
      fetchTasks();
      fetchUsage();
      fetchAgentTemplates();
    }
    return () => {
      stopAllPolling();
    };
  }, [userId, fetchTasks, fetchUsage, fetchAgentTemplates, stopAllPolling]);

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
    fetchTasks,
    fetchAgentTemplates,
    deleteTask,
    cancelTask,
    addMessage,
  };

  return (
    <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
  );
}

// Hook to use agent context
export function useAgents() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgents must be used within AgentProvider");
  }
  return context;
}

// Export action types for testing
export { ActionTypes };
