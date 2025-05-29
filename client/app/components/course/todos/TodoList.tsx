import { TodoListProps } from "@/app/types/course.types";
import { AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";
import { TodoItem } from "./TodoItem";

export const TodoList = ({
  todos,
  onToggleComplete,
  onEdit,
  onDelete,
  isLoading = false,
}: TodoListProps) => {
  // Separate todos by completion status
  const incompleteTodos = todos.filter((todo) => !todo.completed);
  const completedTodos = todos.filter((todo) => todo.completed);

  // Count by urgency
  const urgencyCounts = incompleteTodos.reduce(
    (acc, todo) => {
      if (todo.urgency === "overdue" || todo.urgency === "urgent") {
        acc.urgent++;
      } else if (todo.urgency === "soon") {
        acc.soon++;
      }
      return acc;
    },
    { urgent: 0, soon: 0 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (todos.length === 0) {
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
      {/* Urgency Summary */}
      {(urgencyCounts.urgent > 0 || urgencyCounts.soon > 0) && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-4">
            {urgencyCounts.urgent > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-red-600">
                  {urgencyCounts.urgent} urgent task{urgencyCounts.urgent !== 1 ? "s" : ""}
                </span>
              </div>
            )}
            {urgencyCounts.soon > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-600">
                  {urgencyCounts.soon} due soon
                </span>
              </div>
            )}
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
                key={todo.todoId}
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
                  key={todo.todoId}
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