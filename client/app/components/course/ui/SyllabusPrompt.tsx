import { SyllabusPromptProps } from "@/app/types/course.types";

export const SyllabusPrompt = ({
  onShowModal,
  className = "",
}: SyllabusPromptProps) => {
  return (
    <div
      className={`p-6 bg-[var(--custom-primary-color)] bg-opacity-5 border border-[var(--custom-primary-color)] border-opacity-20 rounded-xl flex flex-col sm:flex-row items-center justify-between ${className}`}
    >
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          Syllabus Missing
        </h3>
        <p className="text-gray-600 text-sm mt-1">
          Upload your course syllabus to automatically extract due dates,
          contacts, and more.
        </p>
      </div>
      <button
        onClick={onShowModal}
        className="mt-4 sm:mt-0 px-6 py-2.5 bg-[var(--custom-primary-color)] text-white rounded-xl hover:bg-opacity-90 transition-all duration-200 cursor-pointer text-sm font-medium"
      >
        Upload Syllabus
      </button>
    </div>
  );
};
