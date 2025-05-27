import { SyllabusPromptProps } from "@/app/types/course.types";

export const SyllabusPrompt = ({
  onShowModal,
  className = "",
}: SyllabusPromptProps) => {
  return (
    <div
      className={`p-4 bg-blue-50 border border-blue-200 rounded-md flex flex-col sm:flex-row items-center justify-between ${className}`}
    >
      <div>
        <h3 className="text-lg font-semibold text-blue-700">
          Syllabus Missing
        </h3>
        <p className="text-blue-600 text-sm">
          Upload your course syllabus to automatically extract due dates,
          contacts, and more.
        </p>
      </div>
      <button
        onClick={onShowModal}
        className="mt-3 sm:mt-0 px-4 py-2 bg-[var(--custom-primary-color)] text-white rounded-md hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--custom-primary-color)] cursor-pointer text-sm"
      >
        Upload Syllabus
      </button>
    </div>
  );
};
