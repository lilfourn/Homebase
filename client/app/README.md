# Frontend Architecture & Context

## Overview
The frontend is a Next.js application that provides the user interface for HomeBase. It's built with modern React patterns, TypeScript (partially adopted), and focuses on providing a smooth user experience with features like dynamic theming, real-time updates, and seamless file management.

## Core Architecture Principles
- **Component-Based**: Reusable UI components with clear responsibilities
- **Context for State**: Global state management without prop drilling
- **Custom Hooks**: Business logic separated from UI components
- **Type Safety**: Progressive TypeScript adoption for better developer experience
- **Server-Side Rendering**: Next.js App Router for optimal performance

## Folder Structure & Purpose

### `/app` (Root)
**Purpose**: Next.js App Router directory containing all pages, layouts, and API routes.

Key files:
- **layout.js**: Root layout wrapping entire app with ClerkProvider
- **globals.css**: Global styles and Tailwind configuration
- **middleware.js**: Request interceptors (authentication checks)

### `/(home)`
**Purpose**: Public-facing pages before user authentication.
- Currently minimal, ready for landing page development
- Separate layout allows different styling from dashboard

### `/dashboard`
**Purpose**: Main authenticated user area with course management features.

- **layout.js**: Implements sidebar navigation and theme customization
- **page.jsx**: Dashboard home showing user's courses
- **/course/[courseID]**: Dynamic pages for individual courses
- **/profile**: User profile management
- **/settings**: App settings and preferences

**Adding Features**: New authenticated pages go here as subdirectories.

### `/api`
**Purpose**: Frontend API utilities and server-side logic.

- **/actions**: Server actions for data mutations
- **courses.api.js**: Course-related API calls
- **users.api.js**: User data fetching
- **googleDrive.api.js**: Google Drive integration helpers

**Adding Features**: Create new `.api.js` files for new backend integrations.

### `/components`
**Purpose**: Reusable UI components organized by feature area.

#### `/components/auth`
- **SchoolSelectionModal**: Initial school selection for new users

#### `/components/course`
Core course functionality components:
- **SyllabusProcessing**: AI processing workflow UI
- **SyllabusCalendarView**: Interactive calendar display
- **CourseGoogleDriveImporter**: File selection from Google Drive
- **/tabs**: Tab-based navigation components
- **/ui**: Course-specific UI elements

**Adding Features**: Create new subdirectories for major feature areas.

#### `/components/dashboard`
- **UserCourseList**: Displays user's enrolled courses
- **AddCourseForm**: Course creation interface
- **SchoolBanner**: Dynamic school branding display

#### `/components/ui`
Shared UI primitives (buttons, dialogs, inputs, etc.) used across the app.

### `/context`
**Purpose**: React Context providers for global state management.

- **CourseContext**: Manages course data and operations
- **SchoolUpdateContext**: Triggers UI updates on school changes
- **SettingsContext**: Temporary settings state before saving

**Adding Features**: Create new contexts for new global state needs.

### `/hooks`
**Purpose**: Custom React hooks encapsulating business logic.

Current hooks:
- **useCourseData**: Fetches course and related data
- **useGooglePicker**: Google Drive file picker integration
- **useSyllabusManagement**: Upload state management
- **useSyllabusProcessing**: AI processing with polling
- **useToast**: Notification management
- **useUserSchool**: User's school information
- **useUserSync**: Clerk user synchronization

**Adding Features**: Create new hooks for reusable logic patterns.

### `/types`
**Purpose**: TypeScript type definitions for type safety.

- **course.types.ts**: All course-related interfaces
- Add new `.types.ts` files for new feature areas

## Key Concepts for Feature Development

### 1. Authentication Flow
```
User lands → Clerk handles auth → Redirect to dashboard → Sync with backend
```
- Clerk manages all authentication
- User token attached to API requests automatically
- Protected routes handled by middleware

### 2. Data Flow Pattern
```
User Action → Component → Custom Hook → API Call → Backend
                ↓                           ↓
            Update UI ← Context/State ← Response
```

### 3. Adding a New Feature Checklist
1. **Types**: Define TypeScript interfaces
2. **API**: Create API utility functions
3. **Hook**: Implement custom hook for logic
4. **Component**: Build UI components
5. **Context**: Add global state if needed
6. **Route**: Create new pages if needed

### 4. Component Development Pattern
```tsx
// Feature-specific UI component
const FeatureComponent = ({ props }) => {
  const { data, actions } = useFeatureHook();
  
  return (
    <div>
      {/* UI implementation */}
    </div>
  );
};

// Accompanying custom hook
const useFeatureHook = () => {
  // Business logic here
  return { data, actions };
};
```

### 5. API Integration Pattern
```javascript
// api/feature.api.js
export const featureAPI = {
  async getData(token, params) {
    const response = await axios.get('/api/feature', {
      headers: { Authorization: `Bearer ${token}` },
      params
    });
    return response.data;
  }
};
```

## Common Extension Points

### Adding Course Features
1. Extend types in `course.types.ts`
2. Add API methods in `courses.api.js`
3. Create/modify hooks in `/hooks`
4. Build components in `/components/course`
5. Update course page if needed

### Adding New Pages
1. Create directory in `/dashboard`
2. Add `page.jsx/tsx` file
3. Implement layout if needed
4. Add navigation in sidebar

### Adding External Integrations
1. Create new API file in `/api`
2. Build custom hook for integration
3. Create components for UI
4. Add configuration in settings

### Enhancing UI/UX
1. Add new components to `/components/ui`
2. Extend theme configuration
3. Update global styles if needed
4. Ensure mobile responsiveness

## State Management Strategy

### Local State
- Use for component-specific state
- Form inputs, toggles, temporary values

### Context State
- Use for data needed across multiple components
- User preferences, course data, settings

### Server State
- Managed through custom hooks
- Cached and synchronized with backend
- Real-time updates through polling

## Styling Architecture

### Tailwind CSS
- Utility-first CSS framework
- Custom theme configuration in `tailwind.config.js`
- Component variants using `cn()` utility

### Dynamic Theming
- School colors applied as CSS variables
- Calculated contrast colors for accessibility
- User custom colors override school defaults

### Component Styling Pattern
```jsx
<div className={cn(
  "base-styles",
  variant && "variant-styles",
  className
)}>
```

## Performance Considerations

### Code Splitting
- Next.js automatic code splitting
- Dynamic imports for large components
- Lazy loading for better initial load

### Data Fetching
- Server-side rendering where beneficial
- Client-side fetching with loading states
- Polling for real-time updates

### Optimization Techniques
- React.memo for expensive components
- useMemo/useCallback where appropriate
- Image optimization with Next.js Image

## TypeScript Migration

### Current State
- Partial TypeScript implementation
- Core types defined in `/types`
- Progressive migration approach

### Adding Types
1. Define interfaces in appropriate `.types.ts`
2. Type component props
3. Type hook returns
4. Type API responses

## Testing Approach

### Component Testing
- Test user interactions
- Mock API calls
- Verify state updates

### Hook Testing
- Test business logic independently
- Mock dependencies
- Cover edge cases

### Integration Testing
- Test full user flows
- Verify API integration
- Check error handling

## Error Handling

### API Errors
- Caught in custom hooks
- User-friendly error messages
- Toast notifications for feedback

### Component Errors
- Error boundaries for crash prevention
- Fallback UI for error states
- Logging for debugging

## Accessibility

### Current Implementation
- Semantic HTML structure
- ARIA labels where needed
- Keyboard navigation support

### Adding Features
- Ensure proper heading hierarchy
- Add screen reader support
- Test with accessibility tools

## Mobile Responsiveness

### Design Approach
- Mobile-first development
- Responsive grid layouts
- Touch-friendly interactions

### Testing
- Test on multiple devices
- Use browser dev tools
- Consider touch gestures

## Future Considerations

When adding new features, consider:
1. Will this work on mobile devices?
2. Is the loading state smooth?
3. How does this handle errors?
4. Is the code reusable?
5. Does this follow existing patterns?

The architecture supports growth through:
- Modular component structure
- Reusable custom hooks
- Flexible context system
- Type-safe development
- Clear separation of concerns