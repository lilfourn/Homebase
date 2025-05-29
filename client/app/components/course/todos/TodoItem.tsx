import { TodoItemProps } from "@/app/types/course.types";
import {
  Calendar,
  Check,
  CheckSquare,
  Clock,
  Edit2,
  Square,
  Trash2,
} from "lucide-react";
import moment from "moment";

export const TodoItem = ({
  todo,
  onToggleComplete,
  onEdit,
  onDelete,
}: TodoItemProps) => {
  // Get urgency color classes
  const getUrgencyClasses = () => {
    if (todo.completed) return "border-gray-200 bg-gray-50";
    
    switch (todo.urgency) {
      case "overdue":
        return "border-red-300 bg-red-50";
      case "urgent": // < 24 hours
        return "border-red-300 bg-red-50";
      case "soon": // < 48 hours
        return "border-yellow-300 bg-yellow-50";
      case "normal": // > 48 hours
        return "border-green-300 bg-green-50";
      default:
        return "border-gray-200 bg-white";
    }
  };

  // Get due date display
  const getDueDateDisplay = () => {
    if (!todo.dueDate) return null;
    
    const date = moment(todo.dueDate);
    const now = moment();
    const diffHours = date.diff(now, "hours");
    
    if (diffHours < 0) {
      return {
        text: `Overdue by ${Math.abs(diffHours)} hours`,
        className: "text-red-600",
      };
    } else if (diffHours < 24) {
      return {
        text: `Due in ${diffHours} hours`,
        className: "text-red-600",
      };
    } else if (diffHours < 48) {
      return {
        text: `Due in ${Math.floor(diffHours / 24)} day`,
        className: "text-yellow-600",
      };
    } else {
      return {
        text: date.format("MMM D, YYYY"),
        className: "text-green-600",
      };
    }
  };

  const dueDateInfo = getDueDateDisplay();
  const priorityColors = {
    low: "bg-gray-200 text-gray-700",
    medium: "bg-blue-200 text-blue-700",
    high: "bg-red-200 text-red-700",
  };

  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all ${getUrgencyClasses()} ${
        todo.completed ? "opacity-75" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={onToggleComplete}
          className="mt-1 cursor-pointer hover:opacity-80 transition-opacity"
          aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
        >
          {todo.completed ? (
            <CheckSquare className="h-5 w-5 text-green-600" />
          ) : (
            <Square className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3
                className={`font-medium text-gray-900 ${
                  todo.completed ? "line-through" : ""
                }`}
              >
                {todo.title}
              </h3>
              {todo.description && (
                <p className="text-sm text-gray-600 mt-1">{todo.description}</p>
              )}
              
              {/* Meta info */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {dueDateInfo && (
                  <div className={`flex items-center gap-1 text-sm ${dueDateInfo.className}`}>
                    <Calendar className="h-3 w-3" />
                    <span>{dueDateInfo.text}</span>
                  </div>
                )}
                
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    priorityColors[todo.priority]
                  }`}
                >
                  {todo.priority} priority
                </span>

                {todo.completed && todo.completedAt && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Check className="h-3 w-3" />
                    <span>Completed {moment(todo.completedAt).fromNow()}</span>
                  </div>
                )}

                {todo.tags && todo.tags.length > 0 && (
                  <div className="flex gap-1">
                    {todo.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={onEdit}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded cursor-pointer"
                aria-label="Edit task"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                aria-label="Delete task"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};