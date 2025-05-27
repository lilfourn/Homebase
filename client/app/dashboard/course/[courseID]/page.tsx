"use client";

import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useState } from "react";

// Types
import { TabType } from "@/app/types/course.types";

// Hooks
import { useCourseData } from "@/app/hooks/useCourseData";
import { useGooglePicker } from "@/app/hooks/useGooglePicker";
import { useSyllabusManagement } from "@/app/hooks/useSyllabusManagement";
import { useSyllabusProcessing } from "@/app/hooks/useSyllabusProcessing";
import { useToast } from "@/app/hooks/useToast";

// Components
import {
  CourseHeader,
  ErrorState,
  LibraryTab,
  LoadingState,
  NoCourseState,
  OverviewTab,
  SyllabusProcessing,
  SyllabusUploadModal,
  TabNavigation,
  ToastNotification,
} from "@/app/components/course";

export default function CoursePage() {
  const params = useParams();
  const { isSignedIn, isLoaded } = useAuth();
  const courseInstanceId = params.courseID as string;

  // Local state
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Custom hooks
  const { toast, showToast, clearToast } = useToast();

  const { course, userData, loading, error, isLoadingUserData } =
    useCourseData(courseInstanceId);

  const {
    hasSyllabus,
    syllabusData,
    syllabusStatusLoading,
    showSyllabusModal,
    setShowSyllabusModal,
    handleSyllabusFileSelected,
  } = useSyllabusManagement({
    courseInstanceId,
    isSignedIn,
    isLoaded,
    showToast,
  });

  // Syllabus AI Processing Hook
  const {
    processingStatus,
    parsedData,
    isProcessing: isProcessingAi,
    processingError,
    isLoadingStatus: isLoadingAiStatus,
    startProcessing: startSyllabusProcessing,
    reprocess: reprocessSyllabusAi,
    refreshStatus: refreshAiStatus,
    loadParsedData: loadAiParsedData,
  } = useSyllabusProcessing({
    courseInstanceId,
    isSignedIn,
    isLoaded,
    showToast,
  });

  const { isUploadingSyllabus, handleUploadSyllabus } = useGooglePicker({
    userData,
    courseInstanceId,
    showToast,
    onFileSelected: async (docs) => {
      await handleSyllabusFileSelected(docs);
      refreshAiStatus();
    },
  });

  // Event handlers
  const handleCloseModal = () => {
    setShowSyllabusModal(false);
  };

  const handleShowSyllabusModal = () => {
    setShowSyllabusModal(true);
  };

  // Combined loading states
  if (
    !isLoaded ||
    loading ||
    isLoadingUserData ||
    syllabusStatusLoading ||
    isLoadingAiStatus
  ) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (!course) {
    return <NoCourseState />;
  }

  // Tab content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <OverviewTab
              course={course}
              hasSyllabus={hasSyllabus}
              showSyllabusModal={showSyllabusModal}
              onShowSyllabusModal={handleShowSyllabusModal}
            />
            {hasSyllabus && (
              <>
                <SyllabusProcessing
                  courseInstanceId={courseInstanceId}
                  isSignedIn={isSignedIn}
                  isLoaded={isLoaded}
                  showToast={showToast}
                />
              </>
            )}
          </div>
        );
      case "library":
        return (
          <LibraryTab
            course={course}
            hasSyllabus={hasSyllabus}
            syllabusData={syllabusData}
            showSyllabusModal={showSyllabusModal}
            userData={userData}
            onShowSyllabusModal={handleShowSyllabusModal}
            processingStatus={processingStatus}
            isProcessingAi={isProcessingAi}
            startSyllabusProcessing={startSyllabusProcessing}
            reprocessSyllabusAi={reprocessSyllabusAi}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        {/* Header Section */}
        <CourseHeader course={course} />

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Tab Content Area */}
        <div className="p-6 sm:p-8">{renderTabContent()}</div>
      </div>

      {/* Syllabus Upload Modal */}
      <SyllabusUploadModal
        isOpen={showSyllabusModal}
        isUploading={isUploadingSyllabus}
        onClose={handleCloseModal}
        onUpload={handleUploadSyllabus}
      />

      {/* Toast Notification */}
      <ToastNotification toast={toast} onClose={clearToast} />
    </div>
  );
}
