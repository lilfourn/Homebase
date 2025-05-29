import { TodoItemProps } from "@/app/types/course.types";
import {
  Calendar,
  Check,
  CheckSquare,
  Clock,
  Edit2,
  Square,
  Trash2,
  AlertTriangle,
  BookOpen,
  FileText,
  GraduationCap,
} from "lucide-react";
import moment from "moment";

export const TodoItem = ({
  todo,
  onToggleComplete,
  onEdit,
  onDelete,
}: TodoItemProps) => {
  // Get category icon
  const getCategoryIcon = () => {
    switch (todo.category) {
      case "exam":
        return <FileText className="h-4 w-4" />;
      case "final":
        return <GraduationCap className="h-4 w-4" />;
      case "project":
        return <BookOpen className="h-4 w-4" />;
      case "quiz":
        return <FileText className="h-4 w-4" />;
      case "assignment":
        return <FileText className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Get urgency styling
  const getUrgencyStyles = () => {
    if (todo.completed) return "bg-gray-50 border-gray-200";
    
    if (todo.urgency === "overdue") {
      return "bg-red-50 border-red-200 shadow-sm";
    } else if (todo.urgency === "urgent") {
      return "bg-red-50 border-red-200 shadow-sm";
    } else if (todo.urgency === "dueSoon") {
      return "bg-amber-50 border-amber-200";
    } else if (todo.isImportantSoon) {
      return "bg-blue-50 border-blue-200";
    }
    
    return "bg-white border-gray-200";
  };

  // Get due date display
  const getDueDateDisplay = () => {
    if (!todo.dueDate) return null;
    
    const date = moment(todo.dueDate);
    const now = moment();
    
    if (todo.urgency === "overdue") {
      return {
        text: `Overdue`,
        className: "text-red-600 font-medium",
        icon: <AlertTriangle className="h-3 w-3" />
      };
    } else if (todo.urgency === "urgent") {
      const hoursLeft = Math.floor(date.diff(now, "hours", true));
      const minutesLeft = Math.floor(date.diff(now, "minutes") % 60);
      return {
        text: hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m left` : `${minutesLeft}m left`,
        className: "text-red-600 font-medium",
        icon: <Clock className="h-3 w-3" />
      };
    } else if (todo.urgency === "dueSoon") {
      return {
        text: date.format("Today, h:mm A"),
        className: "text-amber-600",
        icon: <Clock className="h-3 w-3" />
      };
    } else {
      return {
        text: date.format("MMM D, h:mm A"),
        className: "text-gray-600",
        icon: <Calendar className="h-3 w-3" />
      };
    }
  };

  const categoryColors = {
    exam: "bg-red-100 text-red-700 border-red-200",
    final: "bg-purple-100 text-purple-700 border-purple-200",
    project: "bg-blue-100 text-blue-700 border-blue-200",
    quiz: "bg-orange-100 text-orange-700 border-orange-200",
    assignment: "bg-green-100 text-green-700 border-green-200",
    task: "bg-gray-100 text-gray-700 border-gray-200",
    other: "bg-gray-100 text-gray-700 border-gray-200",
  };

  const dueDateInfo = getDueDateDisplay();

  return (
    <div
      className={`group relative p-4 rounded-lg border transition-all ${getUrgencyStyles()} ${
        todo.completed ? "opacity-60" : ""
      } hover:shadow-md`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={onToggleComplete}
          className="mt-0.5 cursor-pointer hover:opacity-80 transition-opacity"
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
              {/* Title and Category */}
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className={`font-medium text-gray-900 ${
                    todo.completed ? "line-through" : ""
                  }`}
                >
                  {todo.title}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                    categoryColors[todo.category] || categoryColors.task
                  }`}
                >
                  {getCategoryIcon()}
                  {todo.category === "task" ? "Task" : (todo.category || "task").charAt(0).toUpperCase() + (todo.category || "task").slice(1)}
                </span>
              </div>

              {/* Description */}
              {todo.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {todo.description}
                </p>
              )}
              
              {/* Meta info */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {dueDateInfo && (
                  <div className={`flex items-center gap-1 text-sm ${dueDateInfo.className}`}>
                    {dueDateInfo.icon}
                    <span>{dueDateInfo.text}</span>
                  </div>
                )}

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
                        key={`${todo.todoId}-tag-${index}`}
                        className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={onEdit}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded cursor-pointer transition-colors"
                aria-label="Edit task"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer transition-colors"
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