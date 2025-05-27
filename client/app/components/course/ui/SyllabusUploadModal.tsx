import { SyllabusUploadModalProps } from "@/app/types/course.types";
import { Loader2, Upload } from "lucide-react";

export const SyllabusUploadModal = ({
  isOpen,
  isUploading,
  onClose,
  onUpload,
}: SyllabusUploadModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 w-screen h-screen flex items-center justify-center p-4 z-50"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">
          Upload Syllabus
        </h2>
        <p className="text-gray-600 mb-6">
          It looks like you haven&apos;t uploaded a syllabus for this course
          yet. Uploading a syllabus can help unlock features like automatic task
          creation and AI assistance.
        </p>
        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--custom-primary-color)] cursor-pointer"
          >
            Skip for Now
          </button>
          <button
            onClick={onUpload}
            className="px-4 py-2 bg-[var(--custom-primary-color)] text-white rounded-md hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--custom-primary-color)] cursor-pointer"
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4 inline" />
                Upload Syllabus
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
