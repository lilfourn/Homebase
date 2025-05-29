"use client";

import { useTodos } from "@/app/hooks/useTodos.optimized";
import { TasksTabProps, TodoData } from "@/app/types/course.types";
import { AlertCircle, Plus, RefreshCw, WifiOff } from "lucide-react";
import { useState } from "react";
import { TodoForm } from "../todos/TodoForm";
import { TodoList } from "../todos/TodoList";

export const TasksTab = ({ course, showToast }: TasksTabProps) => {
  const [showForm, setShowForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoData | null>(null);

  const {
    todos,
    loading,
    error,
    createTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    refreshTodos,
  } = useTodos({
    courseInstanceId: course.courseInstanceId,
    showToast,
  });

  const handleCreateTodo = async (data: any) => {
    try {
      await createTodo(data);
      setShowForm(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleUpdateTodo = async (data: any) => {
    if (!editingTodo) return;
    try {
      await updateTodo(editingTodo.todoId, data);
      setEditingTodo(null);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleEdit = (todo: TodoData) => {
    setEditingTodo(todo);
    setShowForm(false);
  };

  const handleDeleteTodo = async (todoId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTodo(todoId);
      } catch (error) {
        // Error is handled in the hook
      }
    }
  };

  const handleRetry = () => {
    refreshTodos();
  };

  // Error state with retry
  if (error && !loading) {
    const isNetworkError = error.toLowerCase().includes('network') || 
                          error.toLowerCase().includes('connection') ||
                          error.toLowerCase().includes('timeout');
    
    const isAuthError = error.toLowerCase().includes('auth') ||
                       error.toLowerCase().includes('sign in');

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Course Tasks</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage your tasks and deadlines for {course.name}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              {isNetworkError ? (
                <WifiOff className="h-8 w-8 text-red-600" />
              ) : (
                <AlertCircle className="h-8 w-8 text-red-600" />
              )}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isNetworkError ? "Connection Problem" : "Unable to Load Tasks"}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {error}
            </p>
            
            {!isAuthError && (
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            )}
            
            {isNetworkError && (
              <div className="mt-6 text-sm text-gray-500">
                <p>Please check:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Your internet connection is working</li>
                  <li>• The server is accessible</li>
                  <li>• VPN or firewall settings</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Course Tasks</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage your tasks and deadlines for {course.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Refresh button (visible when not loading) */}
          {!loading && (
            <button
              onClick={handleRetry}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md cursor-pointer transition-colors"
              title="Refresh tasks"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          
          {/* Add task button */}
          {!showForm && !editingTodo && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </button>
          )}
        </div>
      </div>

      {/* Connection retry notification */}
      {error && loading && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Reconnecting...</span>
        </div>
      )}

      {/* Add/Edit Form */}
      {(showForm || editingTodo) && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingTodo ? "Edit Task" : "Create New Task"}
          </h3>
          <TodoForm
            onSubmit={editingTodo ? handleUpdateTodo : handleCreateTodo}
            onCancel={() => {
              setShowForm(false);
              setEditingTodo(null);
            }}
            initialData={editingTodo}
            courseInstanceId={course.courseInstanceId}
            isLoading={loading}
          />
        </div>
      )}

      {/* Todo List */}
      {!error && (
        <div className="bg-white rounded-lg">
          <TodoList
            todos={todos}
            onToggleComplete={toggleTodo}
            onEdit={handleEdit}
            onDelete={handleDeleteTodo}
            isLoading={loading && todos.length === 0}
          />
        </div>
      )}
    </div>
  );
};