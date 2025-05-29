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
  showToast?: (
    message: string,
    type: "success" | "error" | "info",
    options?: {
      duration?: number;
      undoAction?: () => void;
      undoLabel?: string;
      countdown?: boolean;
    }
  ) => void;
}

const FETCH_TIMEOUT = 25000;
const AUTH_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const CACHE_TTL = 30000;
const UNDO_DURATION = 8000; // 8 seconds for undo
const POLL_INTERVAL = 30000; // 30 seconds polling interval

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
  const undoTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

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
      if (!hasInitialized || isRetry) {
        setLoading(true);
      }
      setError(null);

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

      const timeoutPromise = new Promise<never>((_, reject) => {
        fetchTimeoutRef.current = setTimeout(() => {
          reject(new Error("Request timeout"));
        }, FETCH_TIMEOUT);
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = undefined;
      }

      if (response.success) {
        const todosData = response.data || [];
        setTodos(todosData);
        setCachedTodos(todosData);
        retryCount.current = 0;
        setHasInitialized(true);
      } else {
        throw new Error(response.error || "Failed to fetch tasks");
      }
    } catch (err: any) {
      if (isUnmounted.current) return;

      console.error("Error fetching todos:", err);

      const isRetryable = 
        (err.message === "Request timeout" || 
         err.message.includes("Network") ||
         err.message.includes("fetch")) &&
        retryCount.current < MAX_RETRIES && 
        !isRetry;

      if (isRetryable) {
        retryCount.current++;
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount.current - 1), 5000);
        
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
      
      if (retryCount.current >= MAX_RETRIES || !isRetryable) {
        showToast?.(errorMessage, "error");
      }

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

  // Toggle todo completion with undo support
  const toggleTodo = useCallback(
    async (todoId: string) => {
      // Find the todo to toggle
      const todoToToggle = todos.find(t => t.todoId === todoId);
      if (!todoToToggle) return;

      try {
        const token = await getToken();
        if (!token) throw new Error("No authentication token");

        // Store original state for undo
        const originalCompleted = todoToToggle.completed;

        // Optimistic update
        setTodos((prev) =>
          prev.map((todo) =>
            todo.todoId === todoId
              ? { ...todo, completed: !todo.completed }
              : todo
          )
        );
        clearCache();

        // Clear any existing undo timeout
        if (undoTimeoutRef.current) {
          clearTimeout(undoTimeoutRef.current);
        }

        // Define undo action
        const undoAction = async () => {
          console.log("🔄 UNDO ACTION CALLED for task:", todoId);
          try {
            // Clear the timeout since user is undoing
            if (undoTimeoutRef.current) {
              clearTimeout(undoTimeoutRef.current);
              undoTimeoutRef.current = undefined;
            }

            console.log("Undoing task:", todoId, "from completed to incomplete");

            // Call API first to ensure server state is updated
            const undoResponse = await toggleTodoCompletion(todoId, token);
            
            if (undoResponse.success && undoResponse.data) {
              console.log("Undo API response:", undoResponse.data);
              
              // Clear cache to force fresh data
              clearCache();
              
              // Fetch fresh todos to ensure UI is in sync
              await fetchTodos(true);
              
              showToast?.("Task restored", "info");
              
              // Scroll to the restored task after state updates
              setTimeout(() => {
                const todoElement = document.querySelector(`[data-todo-id="${todoId}"]`);
                if (todoElement) {
                  todoElement.scrollIntoView({ behavior: "smooth", block: "center" });
                  // Add highlight class for visual feedback
                  todoElement.classList.add('animate-highlight');
                } else {
                  console.warn("Could not find restored todo element:", todoId);
                }
              }, 300);
            } else {
              throw new Error(undoResponse.error || "Failed to undo task");
            }
          } catch (error) {
            // If undo fails, fetch fresh data
            console.error("Undo failed:", error);
            await fetchTodos();
            showToast?.("Failed to undo action", "error");
          }
        };

        // Make the API call
        const response = await toggleTodoCompletion(todoId, token);
        
        if (response.success && response.data) {
          setTodos((prev) =>
            prev.map((todo) =>
              todo.todoId === todoId ? response.data : todo
            )
          );

          // Show success toast with undo option only when marking as complete
          const wasCompleted = !originalCompleted;
          if (wasCompleted) {
            // Task was marked complete - show undo option
            showToast?.(
              "Task marked as complete",
              "success",
              {
                duration: UNDO_DURATION,
                undoAction,
                undoLabel: "Undo",
                countdown: true,
              }
            );
          } else {
            // Task was marked incomplete - no undo option
            showToast?.(
              "Task marked as incomplete",
              "success"
            );
          }

          // Set timeout to clear undo option only if we showed undo
          if (wasCompleted) {
            undoTimeoutRef.current = setTimeout(() => {
              undoTimeoutRef.current = undefined;
            }, UNDO_DURATION);
          }
        } else {
          // Revert on error
          setTodos((prev) =>
            prev.map((todo) =>
              todo.todoId === todoId
                ? { ...todo, completed: originalCompleted }
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
    [getToken, showToast, clearCache, todos, fetchTodos]
  );

  // Create todo with optimistic update
  const createTodo = useCallback(
    async (data: CreateTodoData) => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No authentication token");

        const tempId = `temp-${Date.now()}`;
        const tempTodo: TodoData = {
          ...data,
          todoId: tempId,
          userId: "",
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as TodoData;

        setTodos((prev) => [tempTodo, ...prev]);
        clearCache();

        const response = await createTodoApi(data, token);
        if (response.success && response.data) {
          setTodos((prev) =>
            prev.map((todo) =>
              todo.todoId === tempId ? response.data : todo
            )
          );
          showToast?.("Task created successfully", "success");
        } else {
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

  // Delete todo with undo support
  const deleteTodo = useCallback(
    async (todoId: string) => {
      const todoToDelete = todos.find((t) => t.todoId === todoId);
      if (!todoToDelete) return;
      
      try {
        const token = await getToken();
        if (!token) throw new Error("No authentication token");

        // Optimistic update
        setTodos((prev) => prev.filter((todo) => todo.todoId !== todoId));
        clearCache();

        // Define undo action
        const undoAction = async () => {
          try {
            // Re-add the todo optimistically
            setTodos((prev) => [...prev, todoToDelete].sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ));

            // Create it again on the server
            await createTodoApi({
              courseInstanceId: todoToDelete.courseInstanceId,
              title: todoToDelete.title,
              description: todoToDelete.description,
              dueDate: todoToDelete.dueDate,
              category: todoToDelete.category,
              tags: todoToDelete.tags,
            }, token);

            clearCache();
            await fetchTodos(); // Refresh to get the new ID
            showToast?.("Task restored", "info");
          } catch (error) {
            await fetchTodos();
            showToast?.("Failed to restore task", "error");
          }
        };

        const response = await deleteTodoApi(todoId, token);
        if (response.success) {
          showToast?.(
            "Task deleted",
            "success",
            {
              duration: UNDO_DURATION,
              undoAction,
              undoLabel: "Undo",
              countdown: true,
            }
          );
        } else {
          setTodos((prev) => [...prev, todoToDelete]);
          throw new Error(response.error || "Failed to delete task");
        }
      } catch (err: any) {
        if (todoToDelete) {
          setTodos((prev) => [...prev, todoToDelete]);
        }
        console.error("Error deleting todo:", err);
        const errorMessage = err.message || "Failed to delete task";
        showToast?.(errorMessage, "error");
        throw err;
      }
    },
    [getToken, showToast, todos, clearCache, fetchTodos]
  );

  // Refresh todos
  const refreshTodos = useCallback(async () => {
    retryCount.current = 0;
    clearCache();
    await fetchTodos();
  }, [fetchTodos, clearCache]);

  // Initial fetch and polling
  useEffect(() => {
    isUnmounted.current = false;
    fetchTodos();

    // Set up polling for auto-refresh
    const pollInterval = setInterval(() => {
      if (!isUnmounted.current && document.visibilityState === 'visible') {
        // Only poll if the page is visible and there's no ongoing loading
        if (!loading) {
          fetchTodos(true); // Silent refresh (isRetry = true to skip cache)
        }
      }
    }, POLL_INTERVAL);

    // Handle visibility change to refresh when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isUnmounted.current) {
        // Refresh when page becomes visible after being hidden
        const timeSinceLastFetch = Date.now() - (todosCache.get(courseInstanceId)?.timestamp || 0);
        if (timeSinceLastFetch > POLL_INTERVAL) {
          fetchTodos(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isUnmounted.current = true;
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, [fetchTodos, courseInstanceId, loading]);

  return {
    todos,
    loading: loading && !hasInitialized,
    error,
    createTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    refreshTodos,
  };
};