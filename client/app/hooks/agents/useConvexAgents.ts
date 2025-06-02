import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

// Hook for creating agent tasks
export function useCreateAgentTask() {
  const createTask = useMutation(api.agents.createTask);
  
  return {
    createTask: async (params: {
      userId: string;
      courseInstanceId: string;
      taskName: string;
      agentType: "note-taker" | "researcher" | "study-buddy" | "assignment";
      config: {
        mode: string;
        model: string;
        customSettings: any;
      };
      files: Array<{
        fileId: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
      }>;
    }) => {
      try {
        const result = await createTask(params);
        return result;
      } catch (error) {
        console.error('[useCreateAgentTask] Error creating task:', error);
        throw error;
      }
    }
  };
}

// Hook for listing agent tasks with real-time updates
export function useAgentTasks(params: {
  userId: string;
  courseInstanceId?: string;
  status?: "queued" | "processing" | "completed" | "failed";
  limit?: number;
}) {
  const data = useQuery(api.agents.listTasks, params);
  
  return {
    tasks: data?.tasks || [],
    hasMore: data?.hasMore || false,
    isLoading: data === undefined
  };
}

// Hook for getting a single task with real-time updates
export function useAgentTask(taskId: Id<"agentTasks"> | null, userId: string) {
  const task = useQuery(
    api.agents.getTask, 
    taskId ? { taskId, userId } : "skip"
  );
  
  return {
    task,
    isLoading: task === undefined
  };
}

// Hook for updating task status
export function useUpdateTaskStatus() {
  const updateStatus = useMutation(api.agents.updateTaskStatus);
  
  return {
    updateStatus: async (params: {
      taskId: Id<"agentTasks">;
      status?: "queued" | "processing" | "completed" | "failed";
      progress?: number;
      result?: {
        content: string;
        format: string;
        metadata: any;
      };
      error?: string;
      usage?: {
        tokensUsed: number;
        processingTime: number;
        cost: number;
      };
    }) => {
      try {
        const result = await updateStatus(params);
        return result;
      } catch (error) {
        console.error('[useUpdateTaskStatus] Error updating task:', error);
        throw error;
      }
    }
  };
}

// Hook for deleting tasks
export function useDeleteAgentTask() {
  const deleteTask = useMutation(api.agents.deleteTask);
  
  return {
    deleteTask: async (taskId: Id<"agentTasks">, userId: string) => {
      try {
        const result = await deleteTask({ taskId, userId });
        return result;
      } catch (error) {
        console.error('[useDeleteAgentTask] Error deleting task:', error);
        throw error;
      }
    }
  };
}

// Hook for adding messages to task conversation
export function useAddMessage() {
  const addMessage = useMutation(api.agents.addMessage);
  
  return {
    addMessage: async (params: {
      taskId: Id<"agentTasks">;
      userId: string;
      message: {
        role: "user" | "assistant";
        content: string;
      };
    }) => {
      try {
        const result = await addMessage(params);
        return result;
      } catch (error) {
        console.error('[useAddMessage] Error adding message:', error);
        throw error;
      }
    }
  };
}

// Hook for getting agent templates
export function useAgentTemplates(params: {
  userId?: string;
  agentType?: string;
  isPublic?: boolean;
}) {
  const templates = useQuery(api.agents.getTemplates, params);
  
  return {
    templates: templates || [],
    isLoading: templates === undefined
  };
}

// Hook for sharing tasks
export function useShareTask() {
  const shareTask = useMutation(api.agents.shareTask);
  
  return {
    shareTask: async (params: {
      taskId: Id<"agentTasks">;
      userId: string;
      shareSettings: {
        isPublic: boolean;
        allowComments?: boolean;
        expiresAt?: number;
        sharedWith?: string[];
      };
    }) => {
      try {
        const result = await shareTask(params);
        return result;
      } catch (error) {
        console.error('[useShareTask] Error sharing task:', error);
        throw error;
      }
    }
  };
}