import {
  CreateTodoData,
  TodoCategory,
  TodoFormProps,
} from "@/app/types/course.types";
import { Calendar, Loader2, Plus, X } from "lucide-react";
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
    category: "task" as TodoCategory,
    tags: [] as string[],
    tagInput: "",
  });

  // Quick date presets
  const datePresets = [
    { label: "Today", value: () => moment().endOf('day').format("YYYY-MM-DDTHH:mm") },
    { label: "Tomorrow", value: () => moment().add(1, 'day').endOf('day').format("YYYY-MM-DDTHH:mm") },
    { label: "This Week", value: () => moment().endOf('week').format("YYYY-MM-DDTHH:mm") },
    { label: "Next Week", value: () => moment().add(1, 'week').endOf('week').format("YYYY-MM-DDTHH:mm") },
  ];

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        dueDate: initialData.dueDate
          ? moment(initialData.dueDate).format("YYYY-MM-DDTHH:mm")
          : "",
        category: initialData.category || "task",
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
      category: formData.category,
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
    if (e.key === "Enter" && e.currentTarget.name !== "title") {
      e.preventDefault();
      if (e.currentTarget.name === "tagInput") {
        handleAddTag();
      }
    }
  };

  const categoryOptions = [
    { value: "task", label: "Task", color: "bg-gray-100" },
    { value: "assignment", label: "Assignment", color: "bg-green-100" },
    { value: "quiz", label: "Quiz", color: "bg-orange-100" },
    { value: "exam", label: "Exam", color: "bg-red-100" },
    { value: "project", label: "Project", color: "bg-blue-100" },
    { value: "final", label: "Final", color: "bg-purple-100" },
    { value: "other", label: "Other", color: "bg-gray-100" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title - Always visible */}
      <div>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="What needs to be done?"
          required
          autoFocus
          disabled={isLoading}
        />
      </div>

      {/* Category Selection - Visual chips */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Type
        </label>
        <div className="flex flex-wrap gap-2">
          {categoryOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFormData({ ...formData, category: option.value as TodoCategory })}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                formData.category === option.value
                  ? `${option.color} ring-2 ring-offset-1 ring-blue-500`
                  : "bg-gray-100 hover:bg-gray-200"
              } cursor-pointer`}
              disabled={isLoading}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Due Date with Presets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Due Date
        </label>
        <div className="space-y-2">
          {/* Quick presets */}
          <div className="flex flex-wrap gap-2">
            {datePresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setFormData({ ...formData, dueDate: preset.value() })}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
                disabled={isLoading}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {/* Custom date picker */}
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
      </div>

      {/* Optional fields - collapsible */}
      <details className="border border-gray-200 rounded-lg">
        <summary className="px-4 py-2 cursor-pointer hover:bg-gray-50">
          <span className="text-sm font-medium text-gray-700">More options</span>
        </summary>
        <div className="p-4 space-y-4 border-t">
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
              placeholder="Add notes or details..."
              rows={2}
              disabled={isLoading}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                name="tagInput"
                value={formData.tagInput}
                onChange={(e) =>
                  setFormData({ ...formData, tagInput: e.target.value })
                }
                onKeyPress={handleKeyPress}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a tag..."
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md cursor-pointer"
                disabled={isLoading}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded-full"
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
        </div>
      </details>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 cursor-pointer"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          disabled={isLoading || !formData.title.trim()}
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {initialData ? "Update" : "Add Task"}
        </button>
      </div>
    </form>
  );
};