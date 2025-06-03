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
        <SyllabusPrompt onShowModal={onShowSyllabusModal} className="mb-8" />
      )}

      {/* Urgent Tasks & Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Upcoming Assignments */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mr-3">
              <span className="text-xl">📝</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Assignments Due</h3>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">No upcoming assignments</p>
          </div>
        </div>

        {/* Upcoming Exams */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mr-3">
              <span className="text-xl">📚</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Upcoming Exams</h3>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">No scheduled exams</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
              <span className="text-xl">🔔</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">No new notifications</p>
          </div>
        </div>
      </div>

      {/* Course Description if available */}
      {course.description && (
        <div className="bg-gray-50 rounded-xl p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-3">
            Course Description
          </h2>
          <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">
            {course.description}
          </p>
        </div>
      )}
    </>
  );
};
