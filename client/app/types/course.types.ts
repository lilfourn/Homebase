// Course related types
export interface CourseData {
  _id: string;
  userId: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  courseInstanceId: string;
  createdAt: string;
  updatedAt: string;
  hasSyllabus?: boolean;
}

export interface SyllabusData {
  fileName: string;
  uploadedAt: string;
  webViewLink: string;
  isProcessed: boolean;
}

export interface ToastMessage {
  message: string;
  type: "success" | "error";
}

export interface UserData {
  googleDrive?: {
    connected: boolean;
  };
}

// Tab types
export type TabType = "overview" | "library";

// Component props
export interface CourseHeaderProps {
  course: CourseData;
}

export interface TabNavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export interface OverviewTabProps {
  course: CourseData;
  hasSyllabus: boolean | null;
  showSyllabusModal: boolean;
  onShowSyllabusModal: () => void;
}

export interface LibraryTabProps {
  course: CourseData;
  hasSyllabus: boolean | null;
  syllabusData: SyllabusData | null;
  showSyllabusModal: boolean;
  userData: UserData | null;
  onShowSyllabusModal: () => void;
}

export interface SyllabusUploadModalProps {
  isOpen: boolean;
  isUploading: boolean;
  onClose: () => void;
  onUpload: () => void;
}

export interface ToastNotificationProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export interface SyllabusPromptProps {
  onShowModal: () => void;
  className?: string;
}

// Hook return types
export interface UseCourseDataReturn {
  course: CourseData | null;
  userData: UserData | null;
  loading: boolean;
  error: string | null;
  isLoadingUserData: boolean;
}

export interface UseSyllabusManagementReturn {
  hasSyllabus: boolean | null;
  syllabusData: SyllabusData | null;
  syllabusStatusLoading: boolean;
  showSyllabusModal: boolean;
  setShowSyllabusModal: (show: boolean) => void;
  handleSyllabusFileSelected: (docs: any) => Promise<void>;
}

export interface UseGooglePickerReturn {
  isUploadingSyllabus: boolean;
  handleUploadSyllabus: () => Promise<void>;
}

export interface UseToastReturn {
  toast: ToastMessage | null;
  showToast: (message: string, type: "success" | "error") => void;
}

// Google APIs declaration
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}
