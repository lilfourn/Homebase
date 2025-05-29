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
import { useCallback, useEffect, useState } from "react";

interface UseTodosParams {
  courseInstanceId: string;
  showToast?: (message: string, type: "success" | "error") => void;
}

export const useTodos = ({
  courseInstanceId,
  showToast,
}: UseTodosParams): UseTodosReturn => {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const [todos, setTodos] = useState<TodoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch todos
  const fetchTodos = useCallback(async () => {
    if (!isSignedIn || !isLoaded || !courseInstanceId) return;

    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) throw new Error("No authentication token");

      const response = await getTodosByCourse(courseInstanceId, token);
      if (response.success && response.data) {
        setTodos(response.data);
      }
    } catch (err: any) {
      console.error("Error fetching todos:", err);
      setError(err.message || "Failed to fetch todos");
      showToast?.("Failed to load tasks", "error");
    } finally {
      setLoading(false);
    }
  }, [courseInstanceId, getToken, isSignedIn, isLoaded, showToast]);

  // Create todo
  const createTodo = useCallback(
    async (data: CreateTodoData) => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No authentication token");

        const response = await createTodoApi(data, token);
        if (response.success && response.data) {
          setTodos((prev) => [response.data, ...prev]);
          showToast?.("Task created successfully", "success");
        }
      } catch (err: any) {
        console.error("Error creating todo:", err);
        showToast?.(err.message || "Failed to create task", "error");
        throw err;
      }
    },
    [getToken, showToast]
  );

  // Update todo
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
        }
      } catch (err: any) {
        console.error("Error updating todo:", err);
        showToast?.(err.message || "Failed to update task", "error");
        throw err;
      }
    },
    [getToken, showToast]
  );

  // Toggle todo completion
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
        }
      } catch (err: any) {
        // Revert optimistic update on error
        setTodos((prev) =>
          prev.map((todo) =>
            todo.todoId === todoId
              ? { ...todo, completed: !todo.completed }
              : todo
          )
        );
        console.error("Error toggling todo:", err);
        showToast?.(err.message || "Failed to update task", "error");
        throw err;
      }
    },
    [getToken, showToast]
  );

  // Delete todo
  const deleteTodo = useCallback(
    async (todoId: string) => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No authentication token");

        // Optimistic update
        const todoToDelete = todos.find((t) => t.todoId === todoId);
        setTodos((prev) => prev.filter((todo) => todo.todoId !== todoId));

        const response = await deleteTodoApi(todoId, token);
        if (response.success) {
          showToast?.("Task deleted successfully", "success");
        }
      } catch (err: any) {
        // Revert optimistic update on error
        if (todoToDelete) {
          setTodos((prev) => [...prev, todoToDelete]);
        }
        console.error("Error deleting todo:", err);
        showToast?.(err.message || "Failed to delete task", "error");
        throw err;
      }
    },
    [getToken, showToast, todos]
  );

  // Refresh todos
  const refreshTodos = useCallback(async () => {
    await fetchTodos();
  }, [fetchTodos]);

  // Initial fetch
  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  return {
    todos,
    loading,
    error,
    createTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    refreshTodos,
  };
};