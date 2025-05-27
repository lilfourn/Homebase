# Course Page Architecture

This directory contains the refactored course page components and related functionality.

## 🏗️ **Architecture Overview**

The course page has been systematically refactored from a single 635-line file into:

- **8 reusable components**
- **4 custom hooks**
- **Clean type definitions**
- **Maintainable, testable code**

## 📁 **Directory Structure**

```
client/app/
├── components/course/
│   ├── CourseHeader.tsx         # Course header with icon, name, code
│   ├── TabNavigation.tsx        # Tab navigation component
│   ├── OverviewTab.tsx          # Overview tab content
│   ├── LibraryTab.tsx           # Library tab content
│   ├── SyllabusUploadModal.tsx  # Syllabus upload modal
│   ├── ToastNotification.tsx    # Toast notification component
│   ├── SyllabusPrompt.tsx       # Reusable syllabus prompt
│   ├── LoadingStates.tsx        # Loading/error state components
│   └── index.ts                 # Component exports
├── hooks/
│   ├── useCourseData.ts         # Course & user data fetching
│   ├── useSyllabusManagement.ts # Syllabus state & operations
│   ├── useGooglePicker.ts       # Google Picker functionality
│   └── useToast.ts              # Toast notifications
├── types/
│   └── course.types.ts          # TypeScript interfaces
└── dashboard/course/[courseID]/
    └── page.tsx                 # Main course page (clean orchestration)
```

## 🎯 **Components**

### **CourseHeader**

- Displays course icon, name, and code
- Handles dynamic icon loading from Lucide icons
- Responsive design

### **TabNavigation**

- Tab switching functionality
- Type-safe tab management
- Consistent styling

### **OverviewTab & LibraryTab**

- Focused tab content components
- Syllabus prompt integration
- Clean separation of concerns

### **SyllabusUploadModal**

- Modal for syllabus upload
- Loading states
- Accessible design

### **ToastNotification**

- Success/error notifications
- Auto-dismiss functionality
- Consistent styling

### **SyllabusPrompt**

- Reusable prompt for missing syllabus
- Configurable styling
- Call-to-action button

### **LoadingStates**

- Loading, error, and no-data states
- Consistent user feedback
- Clean error handling

## 🎣 **Custom Hooks**

### **useCourseData**

```typescript
const { course, userData, loading, error, isLoadingUserData } =
  useCourseData(courseInstanceId);
```

- Handles course and user data fetching
- Authentication state management
- Error handling and redirects

### **useSyllabusManagement**

```typescript
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
```

- Syllabus status checking
- Modal state management
- File upload handling

### **useGooglePicker**

```typescript
const { isUploadingSyllabus, handleUploadSyllabus } = useGooglePicker({
  userData,
  courseInstanceId,
  showToast,
  onFileSelected: handleSyllabusFileSelected,
});
```

- Google Picker API initialization
- File selection handling
- Upload state management

### **useToast**

```typescript
const { toast, showToast, clearToast } = useToast();
```

- Toast notification state
- Auto-dismiss functionality
- Success/error message handling

## 📋 **Types**

All TypeScript interfaces are centralized in `course.types.ts`:

- Component props interfaces
- Data model interfaces
- Hook return type definitions
- Global type declarations

## ✅ **Benefits of Refactoring**

### **Maintainability**

- Single responsibility principle
- Easy to locate and modify functionality
- Clear separation of concerns

### **Reusability**

- Components can be reused across the application
- Hooks can be shared between different pages
- Consistent behavior and styling

### **Testability**

- Small, focused units for testing
- Isolated logic in custom hooks
- Predictable component behavior

### **Developer Experience**

- Better IntelliSense and type safety
- Easier debugging and development
- Clear code organization

### **Performance**

- Smaller component bundle sizes
- Better tree-shaking opportunities
- Optimized re-renders

## 🚀 **Usage Example**

```typescript
import {
  CourseHeader,
  TabNavigation,
  OverviewTab,
  LibraryTab,
} from "@/app/components/course";

import { useCourseData, useToast } from "@/app/hooks";

export default function CoursePage() {
  const { course } = useCourseData(courseId);
  const { showToast } = useToast();

  return (
    <div>
      <CourseHeader course={course} />
      <TabNavigation activeTab={tab} setActiveTab={setTab} />
      {/* Tab content */}
    </div>
  );
}
```

## 🔄 **Migration Notes**

- All existing functionality has been preserved
- Component APIs are backward compatible
- No breaking changes to existing behavior
- Performance improvements through better organization
