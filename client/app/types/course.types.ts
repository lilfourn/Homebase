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
  fullName?: string;
}

// Tab types
export type TabType = "overview" | "tasks" | "library" | "agents";

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

// Todo types
export type TodoCategory =
  | "task"
  | "assignment"
  | "exam"
  | "final"
  | "project"
  | "quiz"
  | "other";
export type TodoUrgency = "overdue" | "urgent" | "dueSoon" | "normal" | null;

export interface TodoData {
  _id: string;
  todoId: string;
  userId: string;
  courseInstanceId: string;
  title: string;
  description: string;
  dueDate: string | null;
  completed: boolean;
  category: TodoCategory;
  tags: string[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  urgency?: TodoUrgency;
  isImportantSoon?: boolean;
}

export interface CreateTodoData {
  courseInstanceId: string;
  title: string;
  description?: string;
  dueDate?: string | null;
  category?: TodoCategory;
  tags?: string[];
}

export interface UpdateTodoData {
  title?: string;
  description?: string;
  dueDate?: string | null;
  category?: TodoCategory;
  tags?: string[];
  completed?: boolean;
}

export interface TasksTabProps {
  course: CourseData;
  todos: TodoData[];
  loading: boolean;
  error: string | null;
  createTodo: (data: CreateTodoData) => Promise<void>;
  updateTodo: (todoId: string, data: UpdateTodoData) => Promise<void>;
  toggleTodo: (todoId: string) => Promise<void>;
  deleteTodo: (todoId: string) => Promise<void>;
  refreshTodos: () => Promise<void>;
}

export interface TodoListProps {
  todos: TodoData[];
  onToggleComplete: (todoId: string) => void;
  onEdit: (todo: TodoData) => void;
  onDelete: (todoId: string) => void;
  isLoading?: boolean;
}

export interface TodoItemProps {
  todo: TodoData;
  onToggleComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export interface TodoFormProps {
  onSubmit: (data: CreateTodoData | UpdateTodoData) => void;
  onCancel: () => void;
  initialData?: TodoData | null;
  courseInstanceId: string;
  isLoading?: boolean;
}

// Hook return types
export interface UseTodosReturn {
  todos: TodoData[];
  loading: boolean;
  error: string | null;
  createTodo: (data: CreateTodoData) => Promise<void>;
  updateTodo: (todoId: string, data: UpdateTodoData) => Promise<void>;
  toggleTodo: (todoId: string) => Promise<void>;
  deleteTodo: (todoId: string) => Promise<void>;
  refreshTodos: () => Promise<void>;
}

// Google APIs declaration
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}
