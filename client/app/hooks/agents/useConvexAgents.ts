// This file is deprecated as the project has migrated from Convex to MongoDB/Express
// All agent functionality now uses the useAgents hook with Express API

// Export empty functions to prevent import errors
export function useCreateAgentTask() {
  return {
    createTask: async () => {
      throw new Error("useConvexAgents is deprecated. Use useAgents hook instead.");
    }
  };
}

export function useAgentTasks() {
  return {
    tasks: [],
    isLoading: false,
    error: null
  };
}

export function useAgentTask() {
  return {
    task: null,
    isLoading: false,
    error: null
  };
}

export function useDeleteAgentTask() {
  return {
    deleteTask: async () => {
      throw new Error("useConvexAgents is deprecated. Use useAgents hook instead.");
    }
  };
}

export function useAgentUsage() {
  return {
    usage: null,
    isLoading: false,
    error: null
  };
}