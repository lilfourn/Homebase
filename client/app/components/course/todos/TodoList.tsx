import { TodoListProps } from "@/app/types/course.types";
import { AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";
import moment from "moment";
import { TodoItem } from "./TodoItem";

export const TodoList = ({
  todos,
  onToggleComplete,
  onEdit,
  onDelete,
  isLoading = false,
}: TodoListProps) => {
  // Filter out any todos without todoId and log warning
  const validTodos = todos.filter((todo) => {
    if (!todo.todoId) {
      console.warn("Todo without todoId found:", todo);
      return false;
    }
    return true;
  });

  // Check for duplicate todoIds
  const todoIds = new Set();
  const uniqueTodos = validTodos.filter((todo) => {
    if (todoIds.has(todo.todoId)) {
      console.warn("Duplicate todoId found:", todo.todoId);
      return false;
    }
    todoIds.add(todo.todoId);
    return true;
  });

  // Separate todos by completion status
  const incompleteTodos = uniqueTodos.filter((todo) => !todo.completed);
  const completedTodos = uniqueTodos.filter((todo) => todo.completed);

  // Filter important items
  const importantSoon = incompleteTodos.filter(todo => todo.isImportantSoon);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (uniqueTodos.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating your first task.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Important Items Flag */}
      {importantSoon.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900">
                Important Items This Week
              </h3>
              <div className="mt-2 space-y-1">
                {importantSoon.map(task => (
                  <div key={`important-${task.todoId}`} className="text-sm text-blue-700">
                    • <span className="font-medium capitalize">{task.category || 'task'}</span>: {task.title} - {task.dueDate ? moment(task.dueDate).format('MMM D') : 'No date'}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incomplete Todos */}
      {incompleteTodos.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Active Tasks ({incompleteTodos.length})
          </h3>
          <div className="space-y-2">
            {incompleteTodos.map((todo) => (
              <TodoItem
                key={`incomplete-${todo.todoId}`}
                todo={todo}
                onToggleComplete={() => onToggleComplete(todo.todoId)}
                onEdit={() => onEdit(todo)}
                onDelete={() => onDelete(todo.todoId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Todos */}
      {completedTodos.length > 0 && (
        <div>
          <details className="group">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <span className="group-open:rotate-90 transition-transform">▶</span>
                Completed Tasks ({completedTodos.length})
              </div>
            </summary>
            <div className="space-y-2 mt-3">
              {completedTodos.map((todo) => (
                <TodoItem
                  key={`completed-${todo.todoId}`}
                  todo={todo}
                  onToggleComplete={() => onToggleComplete(todo.todoId)}
                  onEdit={() => onEdit(todo)}
                  onDelete={() => onDelete(todo.todoId)}
                />
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};