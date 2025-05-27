import { OverviewTabProps } from "@/app/types/course.types";
import { SyllabusPrompt } from "../ui/SyllabusPrompt";

export const OverviewTab = ({
  course,
  hasSyllabus,
  showSyllabusModal,
  onShowSyllabusModal,
}: OverviewTabProps) => {
  return (
    <>
      {/* Display Upload Syllabus button if no syllabus and modal was skipped */}
      {hasSyllabus === false && !showSyllabusModal && (
        <SyllabusPrompt onShowModal={onShowSyllabusModal} className="mb-6" />
      )}

      {course.description && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Description
          </h2>
          <p className="text-gray-600 whitespace-pre-wrap">
            {course.description}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-sm text-gray-600">
        <div>
          <strong className="text-gray-700">Course Instance ID:</strong>{" "}
          {course.courseInstanceId}
        </div>
        <div>
          <strong className="text-gray-700">Internal ID:</strong> {course._id}
        </div>
        <div>
          <strong className="text-gray-700">Created:</strong>{" "}
          {new Date(course.createdAt).toLocaleDateString()}
        </div>
        <div>
          <strong className="text-gray-700">Last Updated:</strong>{" "}
          {new Date(course.updatedAt).toLocaleDateString()}
        </div>
      </div>
      {/* Add other overview content here as needed */}
    </>
  );
};
