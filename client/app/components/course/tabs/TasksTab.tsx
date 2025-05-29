"use client";

import { useTodos } from "@/app/hooks/useTodos";
import { TasksTabProps, TodoData } from "@/app/types/course.types";
import { Plus } from "lucide-react";
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

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
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
      <div className="bg-white rounded-lg">
        <TodoList
          todos={todos}
          onToggleComplete={toggleTodo}
          onEdit={handleEdit}
          onDelete={handleDeleteTodo}
          isLoading={loading}
        />
      </div>

      {/* Color Legend */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Task Urgency Guide
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 border-2 border-red-300 rounded"></div>
            <span>Due within 24 hours</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-50 border-2 border-yellow-300 rounded"></div>
            <span>Due within 48 hours</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-50 border-2 border-green-300 rounded"></div>
            <span>Due after 48 hours</span>
          </div>
        </div>
      </div>
    </div>
  );
};