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

const FETCH_TIMEOUT = 15000; // 15 seconds
const AUTH_TIMEOUT = 30000; // 30 seconds for auth to be ready
const MAX_RETRIES = 3;

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

  // Fetch todos with timeout and retry logic
  const fetchTodos = useCallback(async (isRetry = false) => {
    if (!isSignedIn || !isLoaded || !courseInstanceId) {
      if (!isLoaded) {
        // Set a timeout for auth loading
        if (!authTimeoutRef.current) {
          authTimeoutRef.current = setTimeout(() => {
            setError("Authentication is taking too long. Please refresh the page.");
            setLoading(false);
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
        return;
      }
      
      if (!courseInstanceId) {
        setError("Invalid course ID");
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), FETCH_TIMEOUT);
      });

      // Get token with timeout
      const tokenPromise = getToken();
      const token = await Promise.race([tokenPromise, timeoutPromise]) as string;
      
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      // Fetch todos with timeout
      const fetchPromise = getTodosByCourse(courseInstanceId, token);
      const response = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (response.success) {
        setTodos(response.data || []);
        retryCount.current = 0; // Reset retry count on success
        setHasInitialized(true);
      } else {
        throw new Error(response.error || "Failed to fetch tasks");
      }
    } catch (err: any) {
      console.error("Error fetching todos:", err);
      
      // Handle timeout or network errors with retry
      if ((err.message === "Request timeout" || err.message.includes("Network")) && retryCount.current < MAX_RETRIES && !isRetry) {
        retryCount.current++;
        showToast?.(`Connection issue. Retrying... (${retryCount.current}/${MAX_RETRIES})`, "error");
        setTimeout(() => fetchTodos(true), 1000 * retryCount.current); // Exponential backoff
        return;
      }
      
      const errorMessage = err.message || "Failed to load tasks";
      setError(errorMessage);
      showToast?.(errorMessage, "error");
      
      // Set empty array to prevent infinite loading
      if (!hasInitialized) {
        setTodos([]);
        setHasInitialized(true);
      }
    } finally {
      setLoading(false);
    }
  }, [courseInstanceId, getToken, isSignedIn, isLoaded, showToast, hasInitialized]);

  // Create todo with error handling
  const createTodo = useCallback(
    async (data: CreateTodoData) => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No authentication token");

        const response = await createTodoApi(data, token);
        if (response.success && response.data) {
          setTodos((prev) => [response.data, ...prev]);
          showToast?.("Task created successfully", "success");
          // Dispatch event to update course list
          window.dispatchEvent(new Event('todoUpdated'));
        } else {
          throw new Error(response.error || "Failed to create task");
        }
      } catch (err: any) {
        console.error("Error creating todo:", err);
        const errorMessage = err.message || "Failed to create task";
        showToast?.(errorMessage, "error");
        throw err;
      }
    },
    [getToken, showToast]
  );

  // Update todo with error handling
  const updateTodo = useCallback(
    async (todoId: string, data: UpdateTodoData) => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No authentication token");

        const response = await updateTodoApi(todoId, data, token);
        if (response.success && response.data) {
          setTodos((prev) =>
            prev.map((todo) =>
              todo.todoId === todoId ? response.data : todo
            )
          );
          showToast?.("Task updated successfully", "success");
          // Dispatch event to update course list
          window.dispatchEvent(new Event('todoUpdated'));
        } else {
          throw new Error(response.error || "Failed to update task");
        }
      } catch (err: any) {
        console.error("Error updating todo:", err);
        const errorMessage = err.message || "Failed to update task";
        showToast?.(errorMessage, "error");
        throw err;
      }
    },
    [getToken, showToast]
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

        const response = await toggleTodoCompletion(todoId, token);
        if (response.success && response.data) {
          setTodos((prev) =>
            prev.map((todo) =>
              todo.todoId === todoId ? response.data : todo
            )
          );
          // Dispatch event to update course list
          window.dispatchEvent(new Event('todoUpdated'));
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
    [getToken, showToast]
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

        const response = await deleteTodoApi(todoId, token);
        if (response.success) {
          showToast?.("Task deleted successfully", "success");
          // Dispatch event to update course list
          window.dispatchEvent(new Event('todoUpdated'));
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
    [getToken, showToast, todos]
  );

  // Refresh todos with loading state
  const refreshTodos = useCallback(async () => {
    retryCount.current = 0; // Reset retry count
    await fetchTodos();
  }, [fetchTodos]);

  // Initial fetch with cleanup
  useEffect(() => {
    fetchTodos();

    // Cleanup on unmount
    return () => {
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
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