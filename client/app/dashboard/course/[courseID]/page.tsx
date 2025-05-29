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
import { useTodos } from "@/app/hooks/useTodos.undo";
import { useToastWithUndo } from "@/app/hooks/useToastWithUndo";
import { ToastContainer } from "@/app/components/ui/ToastContainer";

// Components
import {
  CourseHeader,
  ErrorState,
  LibraryTab,
  LoadingState,
  NoCourseState,
  OverviewTab,
  SyllabusAnalysisEditView,
  SyllabusUploadModal,
  TabNavigation,
  ToastNotification,
} from "@/app/components/course";
import { TasksTab } from "@/app/components/course/tabs/TasksTab";
import { TodoUrgencyAlert } from "@/app/components/course/todos/TodoUrgencyAlert";
import { TASetupModal } from "@/app/components/course/TASetupModal";
import { LastNameModal } from "@/app/components/course/LastNameModal";
import { useTASetup } from "@/app/context/TASetupContext";
import { addTAManually } from "@/app/api/courses.api";
import { updateUserNameInfo } from "@/app/api/users.api";
import { useUser } from "@clerk/nextjs";

export default function CoursePage() {
  const params = useParams();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const courseInstanceId = params.courseID as string;

  // Local state
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [showLastNameModal, setShowLastNameModal] = useState(false);

  // Custom hooks
  const { toast, showToast, clearToast } = useToast();
  const { toasts: undoToasts, showToast: showUndoToast, removeToast: removeUndoToast } = useToastWithUndo();
  const { 
    showTASetupModal, 
    courseIdForSetup, 
    courseNameForSetup,
    closeTASetupModal, 
    skipTASetup, 
    markAsNoTA 
  } = useTASetup();

  const { course, userData, loading, error, isLoadingUserData } =
    useCourseData(courseInstanceId);
    
  // Single instance of useTodos for both urgency alert and tasks tab
  const {
    todos,
    loading: todosLoading,
    error: todosError,
    createTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    refreshTodos,
  } = useTodos({
    courseInstanceId,
    showToast: showUndoToast,
  });

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

  // TA Setup handlers
  const handleAddTA = async (taData: {
    name: string;
    email: string;
    officeHours?: string;
    assignmentRule?: string;
  }) => {
    try {
      const token = await getToken();
      if (!token) throw new Error("No authentication token");

      await addTAManually(courseIdForSetup || courseInstanceId, taData, token);
      showToast("TA added successfully", "success");
      closeTASetupModal();
      
      // Refresh the parsed data to show the new TA
      if (loadAiParsedData) {
        loadAiParsedData();
      }
    } catch (error) {
      console.error("Error adding TA:", error);
      showToast("Failed to add TA", "error");
    }
  };

  const handleSkipTA = () => {
    if (courseIdForSetup) {
      skipTASetup(courseIdForSetup);
    }
  };

  const handleNoTA = () => {
    if (courseIdForSetup) {
      markAsNoTA(courseIdForSetup);
      showToast("Marked as class without TA", "success");
    }
  };

  // Last name update handler
  const handleLastNameSubmit = async (data: { lastName: string; studentId?: string }) => {
    if (!clerkUser?.id) return;

    try {
      await updateUserNameInfo(clerkUser.id, data);
      showToast("Profile updated successfully", "success");
      setShowLastNameModal(false);
      
      // Refresh the matched TA data
      if (loadAiParsedData) {
        loadAiParsedData();
      }
    } catch (error) {
      console.error("Error updating user info:", error);
      showToast("Failed to update profile", "error");
    }
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
            {/* Urgency Alert at the top */}
            <TodoUrgencyAlert 
              todos={todos} 
              courseInstanceId={courseInstanceId} 
            />
            
            <OverviewTab
              course={course}
              hasSyllabus={hasSyllabus}
              showSyllabusModal={showSyllabusModal}
              onShowSyllabusModal={handleShowSyllabusModal}
            />
            {hasSyllabus && processingStatus?.isProcessed && parsedData && (
              <SyllabusAnalysisEditView 
                parsedData={parsedData}
                courseInstanceId={courseInstanceId}
                onDataUpdate={(updatedData) => {
                  // Update the local state with new data
                  loadAiParsedData();
                }}
                showToast={showToast}
                onNeedsLastName={() => setShowLastNameModal(true)}
              />
            )}
          </div>
        );
      case "tasks":
        return (
          <TasksTab 
            course={course}
            todos={todos}
            loading={todosLoading}
            error={todosError}
            createTodo={createTodo}
            updateTodo={updateTodo}
            toggleTodo={toggleTodo}
            deleteTodo={deleteTodo}
            refreshTodos={refreshTodos}
          />
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
            parsedData={parsedData}
            showToast={showToast}
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
      
      {/* Undo Toast Container */}
      <ToastContainer toasts={undoToasts} onClose={removeUndoToast} />

      {/* TA Setup Modal */}
      <TASetupModal
        isOpen={showTASetupModal}
        onClose={closeTASetupModal}
        onAddTA={handleAddTA}
        onSkip={handleSkipTA}
        onNoTA={handleNoTA}
        courseName={courseNameForSetup || course?.courseName}
      />

      {/* Last Name Modal */}
      <LastNameModal
        isOpen={showLastNameModal}
        onClose={() => setShowLastNameModal(false)}
        onSubmit={handleLastNameSubmit}
        currentFullName={userData?.fullName}
      />
    </div>
  );
}
