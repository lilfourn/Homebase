import {
  CreateTodoData,
  TodoFormProps,
  TodoPriority,
} from "@/app/types/course.types";
import { Calendar, Loader2, X } from "lucide-react";
import moment from "moment";
import { useEffect, useState } from "react";

export const TodoForm = ({
  onSubmit,
  onCancel,
  initialData,
  courseInstanceId,
  isLoading = false,
}: TodoFormProps) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium" as TodoPriority,
    tags: [] as string[],
    tagInput: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        dueDate: initialData.dueDate
          ? moment(initialData.dueDate).format("YYYY-MM-DDTHH:mm")
          : "",
        priority: initialData.priority || "medium",
        tags: initialData.tags || [],
        tagInput: "",
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const data: CreateTodoData = {
      courseInstanceId,
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      dueDate: formData.dueDate || null,
      priority: formData.priority,
      tags: formData.tags,
    };

    onSubmit(data);
  };

  const handleAddTag = () => {
    const tag = formData.tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tag],
        tagInput: "",
      });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Task Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter task title"
          required
          disabled={isLoading}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Add a description (optional)"
          rows={3}
          disabled={isLoading}
        />
      </div>

      {/* Due Date and Priority */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Due Date
          </label>
          <div className="relative">
            <input
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData({ ...formData, dueDate: e.target.value })
              }
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) =>
              setFormData({
                ...formData,
                priority: e.target.value as TodoPriority,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags
        </label>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            value={formData.tagInput}
            onChange={(e) =>
              setFormData({ ...formData, tagInput: e.target.value })
            }
            onKeyPress={handleKeyPress}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add a tag and press Enter"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 cursor-pointer"
            disabled={isLoading}
          >
            Add
          </button>
        </div>
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-blue-900 cursor-pointer"
                  disabled={isLoading}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          disabled={isLoading || !formData.title.trim()}
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {initialData ? "Update Task" : "Create Task"}
        </button>
      </div>
    </form>
  );
};