import {
  createTodo as createTodoApi,
  deleteTodo as deleteTodoApi,
  getTodosByCourse,
  toggleTodoCompletion,
  updateTodo as updateTodoApi,
} from "@/app/api/todos.api";
import {
  CreateTodoData,
  TodoData,
  UpdateTodoData,
  UseTodosReturn,
} from "@/app/types/course.types";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseTodosParams {
  courseInstanceId: string;
  showToast?: (message: string, type: "success" | "error") => void;
}

const FETCH_TIMEOUT = 25000; // 25 seconds (longer than server timeout)
const AUTH_TIMEOUT = 30000; // 30 seconds for auth to be ready
const MAX_RETRIES = 3;
const CACHE_TTL = 30000; // 30 seconds cache

// Simple cache implementation
const todosCache = new Map<string, { data: TodoData[]; timestamp: number }>();

export const useTodos = ({
  courseInstanceId,
  showToast,
}: UseTodosParams): UseTodosReturn => {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const [todos, setTodos] = useState<TodoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const retryCount = useRef(0);
  const authTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isUnmounted = useRef(false);

  // Check cache
  const getCachedTodos = useCallback(() => {
    const cached = todosCache.get(courseInstanceId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    return null;
  }, [courseInstanceId]);

  // Set cache
  const setCachedTodos = useCallback((data: TodoData[]) => {
    todosCache.set(courseInstanceId, {
      data,
      timestamp: Date.now(),
    });
  }, [courseInstanceId]);

  // Clear cache
  const clearCache = useCallback(() => {
    todosCache.delete(courseInstanceId);
  }, [courseInstanceId]);

  // Fetch todos with timeout and retry logic
  const fetchTodos = useCallback(async (isRetry = false) => {
    if (isUnmounted.current) return;

    // Check auth state
    if (!isLoaded) {
      // Set a timeout for auth loading
      if (!authTimeoutRef.current) {
        authTimeoutRef.current = setTimeout(() => {
          if (!isUnmounted.current) {
            setError("Authentication is taking too long. Please refresh the page.");
            setLoading(false);
            setHasInitialized(true);
          }
        }, AUTH_TIMEOUT);
      }
      return;
    }

    // Clear auth timeout if auth loaded
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
      authTimeoutRef.current = undefined;
    }

    if (!isSignedIn) {
      setError("Please sign in to view tasks");
      setLoading(false);
      setHasInitialized(true);
      return;
    }

    if (!courseInstanceId) {
      setError("Invalid course ID");
      setLoading(false);
      setHasInitialized(true);
      return;
    }

    // Check cache first
    const cachedData = getCachedTodos();
    if (cachedData && !isRetry) {
      setTodos(cachedData);
      setLoading(false);
      setHasInitialized(true);
      setError(null);
      return;
    }

    try {
      // Only show loading on first fetch or retry
      if (!hasInitialized || isRetry) {
        setLoading(true);
      }
      setError(null);

      // Set a fetch timeout
      const fetchPromise = new Promise<any>(async (resolve, reject) => {
        try {
          const token = await getToken();
          if (!token) {
            reject(new Error("Failed to get authentication token"));
            return;
          }

          const response = await getTodosByCourse(courseInstanceId, token);
          resolve(response);
        } catch (err) {
          reject(err);
        }
      });

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        fetchTimeoutRef.current = setTimeout(() => {
          reject(new Error("Request timeout"));
        }, FETCH_TIMEOUT);
      });

      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      // Clear timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = undefined;
      }

      if (response.success) {
        const todosData = response.data || [];
        setTodos(todosData);
        setCachedTodos(todosData);
        retryCount.current = 0; // Reset retry count on success
        setHasInitialized(true);
      } else {
        throw new Error(response.error || "Failed to fetch tasks");
      }
    } catch (err: any) {
      if (isUnmounted.current) return;

      console.error("Error fetching todos:", err);

      // Handle timeout or network errors with retry
      const isRetryable = 
        (err.message === "Request timeout" || 
         err.message.includes("Network") ||
         err.message.includes("fetch")) &&
        retryCount.current < MAX_RETRIES && 
        !isRetry;

      if (isRetryable) {
        retryCount.current++;
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount.current - 1), 5000); // Exponential backoff with max 5s
        
        showToast?.(`Connection issue. Retrying... (${retryCount.current}/${MAX_RETRIES})`, "error");
        
        setTimeout(() => {
          if (!isUnmounted.current) {
            fetchTodos(true);
          }
        }, retryDelay);
        return;
      }

      const errorMessage = err.response?.data?.message || err.message || "Failed to load tasks";
      setError(errorMessage);
      
      // Only show toast on final failure
      if (retryCount.current >= MAX_RETRIES || !isRetryable) {
        showToast?.(errorMessage, "error");
      }

      // Set empty array to prevent infinite loading
      if (!hasInitialized) {
        setTodos([]);
        setHasInitialized(true);
      }
    } finally {
      if (!isUnmounted.current) {
        setLoading(false);
      }
    }
  }, [courseInstanceId, getToken, isSignedIn, isLoaded, showToast, hasInitialized, getCachedTodos, setCachedTodos]);

  // Create todo with optimistic update
  const createTodo = useCallback(
    async (data: CreateTodoData) => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No authentication token");

        // Optimistically add todo with temporary ID
        const tempId = `temp-${Date.now()}`;
        const tempTodo: TodoData = {
          ...data,
          todoId: tempId,
          userId: "", // Will be filled by server
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as TodoData;

        setTodos((prev) => [tempTodo, ...prev]);
        clearCache();

        const response = await createTodoApi(data, token);
        if (response.success && response.data) {
          // Replace temp todo with real one
          setTodos((prev) =>
            prev.map((todo) =>
              todo.todoId === tempId ? response.data : todo
            )
          );
          showToast?.("Task created successfully", "success");
        } else {
          // Remove temp todo on error
          setTodos((prev) => prev.filter((todo) => todo.todoId !== tempId));
          throw new Error(response.error || "Failed to create task");
        }
      } catch (err: any) {
        console.error("Error creating todo:", err);
        const errorMessage = err.message || "Failed to create task";
        showToast?.(errorMessage, "error");
        throw err;
      }
    },
    [getToken, showToast, clearCache]
  );

  // Update todo with optimistic update
  const updateTodo = useCallback(
    async (todoId: string, data: UpdateTodoData) => {
      const originalTodo = todos.find((t) => t.todoId === todoId);
      
      try {
        const token = await getToken();
        if (!token) throw new Error("No authentication token");

        // Optimistic update
        setTodos((prev) =>
          prev.map((todo) =>
            todo.todoId === todoId ? { ...todo, ...data } : todo
          )
        );
        clearCache();

        const response = await updateTodoApi(todoId, data, token);
        if (response.success && response.data) {
          setTodos((prev) =>
            prev.map((todo) =>
              todo.todoId === todoId ? response.data : todo
            )
          );
          showToast?.("Task updated successfully", "success");
        } else {
          // Revert on error
          if (originalTodo) {
            setTodos((prev) =>
              prev.map((todo) =>
                todo.todoId === todoId ? originalTodo : todo
              )
            );
          }
          throw new Error(response.error || "Failed to update task");
        }
      } catch (err: any) {
        // Revert optimistic update
        if (originalTodo) {
          setTodos((prev) =>
            prev.map((todo) =>
              todo.todoId === todoId ? originalTodo : todo
            )
          );
        }
        console.error("Error updating todo:", err);
        const errorMessage = err.message || "Failed to update task";
        showToast?.(errorMessage, "error");
        throw err;
      }
    },
    [getToken, showToast, todos, clearCache]
  );

  // Toggle todo completion with optimistic update
  const toggleTodo = useCallback(
    async (todoId: string) => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No authentication token");

        // Optimistic update
        setTodos((prev) =>
          prev.map((todo) =>
            todo.todoId === todoId
              ? { ...todo, completed: !todo.completed }
              : todo
          )
        );
        clearCache();

        const response = await toggleTodoCompletion(todoId, token);
        if (response.success && response.data) {
          setTodos((prev) =>
            prev.map((todo) =>
              todo.todoId === todoId ? response.data : todo
            )
          );
        } else {
          // Revert on error
          setTodos((prev) =>
            prev.map((todo) =>
              todo.todoId === todoId
                ? { ...todo, completed: !todo.completed }
                : todo
            )
          );
          throw new Error(response.error || "Failed to update task");
        }
      } catch (err: any) {
        console.error("Error toggling todo:", err);
        const errorMessage = err.message || "Failed to update task";
        showToast?.(errorMessage, "error");
        throw err;
      }
    },
    [getToken, showToast, clearCache]
  );

  // Delete todo with optimistic update
  const deleteTodo = useCallback(
    async (todoId: string) => {
      const todoToDelete = todos.find((t) => t.todoId === todoId);
      
      try {
        const token = await getToken();
        if (!token) throw new Error("No authentication token");

        // Optimistic update
        setTodos((prev) => prev.filter((todo) => todo.todoId !== todoId));
        clearCache();

        const response = await deleteTodoApi(todoId, token);
        if (response.success) {
          showToast?.("Task deleted successfully", "success");
        } else {
          // Revert on error
          if (todoToDelete) {
            setTodos((prev) => [...prev, todoToDelete]);
          }
          throw new Error(response.error || "Failed to delete task");
        }
      } catch (err: any) {
        // Revert optimistic update
        if (todoToDelete) {
          setTodos((prev) => [...prev, todoToDelete]);
        }
        console.error("Error deleting todo:", err);
        const errorMessage = err.message || "Failed to delete task";
        showToast?.(errorMessage, "error");
        throw err;
      }
    },
    [getToken, showToast, todos, clearCache]
  );

  // Refresh todos with loading state
  const refreshTodos = useCallback(async () => {
    retryCount.current = 0; // Reset retry count
    clearCache(); // Clear cache to force fresh fetch
    await fetchTodos();
  }, [fetchTodos, clearCache]);

  // Initial fetch with cleanup
  useEffect(() => {
    isUnmounted.current = false;
    fetchTodos();

    // Cleanup on unmount
    return () => {
      isUnmounted.current = true;
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [fetchTodos]);

  return {
    todos,
    loading: loading && !hasInitialized, // Only show loading on first load
    error,
    createTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    refreshTodos,
  };
};