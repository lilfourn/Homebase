import CourseGoogleDriveImporter from "@/app/components/course/files/CourseGoogleDriveImporter.jsx";
import { LibraryTabProps } from "@/app/types/course.types";
import { ExternalLink, FileText } from "lucide-react";
import { SyllabusPrompt } from "../ui/SyllabusPrompt";

export const LibraryTab = ({
  course,
  hasSyllabus,
  syllabusData,
  showSyllabusModal,
  userData,
  onShowSyllabusModal,
}: LibraryTabProps) => {
  return (
    <div className="space-y-6">
      {/* Display Upload Syllabus button if no syllabus and modal was skipped */}
      {hasSyllabus === false && !showSyllabusModal && (
        <SyllabusPrompt onShowModal={onShowSyllabusModal} />
      )}

      {/* Display Syllabus information if it exists */}
      {hasSyllabus && syllabusData && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-700">
                  Course Syllabus
                </h3>
                <p className="text-green-600 text-sm">
                  {syllabusData.fileName}
                </p>
                <p className="text-green-600 text-xs">
                  Uploaded:{" "}
                  {new Date(syllabusData.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {syllabusData.webViewLink && (
                <a
                  href={syllabusData.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 cursor-pointer flex items-center"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View
                </a>
              )}
              <button
                onClick={onShowSyllabusModal}
                className="px-3 py-1 text-sm border border-green-300 text-green-700 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 cursor-pointer"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}

      <CourseGoogleDriveImporter
        courseId={course?._id}
        isConnected={userData?.googleDrive?.connected || false}
      />
    </div>
  );
};
