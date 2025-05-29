import { TodoData } from "@/app/types/course.types";
import { AlertTriangle, Clock, AlertCircle } from "lucide-react";
import moment from "moment";
import { useRouter } from "next/navigation";

interface TodoUrgencyAlertProps {
  todos: TodoData[];
  courseInstanceId: string;
}

export const TodoUrgencyAlert = ({ todos, courseInstanceId }: TodoUrgencyAlertProps) => {
  const router = useRouter();
  
  // Filter urgent and due soon tasks
  const urgentTasks = todos.filter(todo => 
    !todo.completed && (todo.urgency === "urgent" || todo.urgency === "overdue")
  );
  
  const dueSoonTasks = todos.filter(todo => 
    !todo.completed && todo.urgency === "dueSoon"
  );

  // Filter important items due within a week
  const importantSoon = todos.filter(todo => 
    !todo.completed && todo.isImportantSoon
  );

  if (urgentTasks.length === 0 && dueSoonTasks.length === 0 && importantSoon.length === 0) {
    return null;
  }

  const handleNavigateToTasks = () => {
    router.push(`/dashboard/course/${courseInstanceId}?tab=tasks`);
  };

  return (
    <div className="space-y-3">
      {/* Urgent Tasks (3 hours or less) */}
      {urgentTasks.length > 0 && (
        <div 
          className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg cursor-pointer hover:bg-red-100 transition-colors"
          onClick={handleNavigateToTasks}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">
                Urgent: {urgentTasks.length} task{urgentTasks.length !== 1 ? 's' : ''} due within 3 hours
              </h3>
              <div className="mt-2 space-y-1">
                {urgentTasks.slice(0, 3).map(task => (
                  <div key={task.todoId} className="text-sm text-red-700">
                    • {task.title} - {task.dueDate ? moment(task.dueDate).fromNow() : 'No due date'}
                  </div>
                ))}
                {urgentTasks.length > 3 && (
                  <div className="text-sm text-red-600 font-medium">
                    + {urgentTasks.length - 3} more urgent tasks
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Due Soon Tasks (within 24 hours) */}
      {dueSoonTasks.length > 0 && (
        <div 
          className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg cursor-pointer hover:bg-amber-100 transition-colors"
          onClick={handleNavigateToTasks}
        >
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-900">
                Due Soon: {dueSoonTasks.length} task{dueSoonTasks.length !== 1 ? 's' : ''} due within 24 hours
              </h3>
              <div className="mt-2 space-y-1">
                {dueSoonTasks.slice(0, 2).map(task => (
                  <div key={task.todoId} className="text-sm text-amber-700">
                    • {task.title} - {task.dueDate ? moment(task.dueDate).format('MMM D, h:mm A') : 'No due date'}
                  </div>
                ))}
                {dueSoonTasks.length > 2 && (
                  <div className="text-sm text-amber-600 font-medium">
                    + {dueSoonTasks.length - 2} more tasks due soon
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Important Items Due Within a Week */}
      {importantSoon.length > 0 && (
        <div 
          className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={handleNavigateToTasks}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900">
                Important Upcoming
              </h3>
              <div className="mt-2 space-y-1">
                {importantSoon.map(task => (
                  <div key={task.todoId} className="text-sm text-blue-700">
                    • <span className="font-medium capitalize">{task.category}</span>: {task.title} - {task.dueDate ? moment(task.dueDate).format('MMM D') : 'No date'}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};