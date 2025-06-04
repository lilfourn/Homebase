# HomeBase Project Documentation

## Overview

HomeBase is a university-focused web application that helps students manage their academic life through AI-powered features. Students can upload course materials, process syllabi, manage tasks, and use AI agents to enhance their learning experience.

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript/JavaScript, Tailwind CSS
- **Backend**: Express.js, MongoDB with Mongoose ODM
- **Authentication**: Clerk
- **File Storage**: Google Drive integration
- **AI Services**: OpenAI API
- **Infrastructure**: Redis (prepared for queues but currently disabled)

### Data Models

#### Core Entities
1. **User**: Central entity with Clerk integration, school info, Google Drive connection
2. **Course**: Academic courses with unique instance IDs
3. **Todo**: Task management with urgency calculation and auto-cleanup
4. **Syllabus**: Course syllabus storage and AI-processed data
5. **AgentTask**: AI agent processing tasks
6. **AgentConversation**: Chat history for agent interactions
7. **AgentTemplate**: Reusable agent configurations

## Current State (as of January 2025)

### ✅ Completed Features

#### Core Application
- **User Authentication**: Full Clerk integration with JWT tokens
- **Course Management**: CRUD operations with user association
- **Syllabus Processing**: Upload, AI parsing, TA matching
- **Task Management**: 
  - Advanced todo system with categories (task, assignment, exam, etc.)
  - Urgency calculation and important deadline alerts
  - Optimistic updates with retry logic
  - Undo functionality (8-second window)
  - Auto-cleanup of old completed tasks
- **Google Drive Integration**: 
  - OAuth flow implementation
  - File listing and import
  - Course file association
- **School Customization**: Logo upload, color theming

#### Agent Infrastructure
- **Database Layer**: Complete MongoDB models for agents
- **API Layer**: Full REST API for agent operations
- **Core Agent System**:
  - BaseAgent class with standard workflow
  - AgentOrchestrator for routing and management
  - Note Taker Agent (fully implemented)
  - Researcher Agent (partially implemented)
- **Supporting Services**:
  - AI service integration (OpenAI)
  - Web search capabilities (multiple providers)

### 🚧 In Progress / Disabled

#### Queue System
- **Status**: Infrastructure exists but is disabled
- Bull queue setup code commented out
- Redis configuration present but unused
- Tasks created synchronously without background processing
- Worker process (`agentTaskWorker.js`) referenced but missing

#### File Processing
- `fileProcessingService.js` referenced but not implemented
- PDF, DOCX, PPTX processing capabilities planned but missing
- OCR and content extraction not available

#### Frontend Agent Integration
- AgentContext uses placeholder data (hybridDataService)
- Agent UI components exist but need backend connection
- Real-time status updates not implemented

### ❌ Missing Components

1. **Asynchronous Task Processing**: No active job queue
2. **File Processing Pipeline**: Service not implemented
3. **Pending Agents**: Study Buddy, Assignment Assistant
4. **Usage Tracking**: Returns hardcoded values
5. **Content Security**: Service exists but implementation unclear

## API Endpoints

### Authentication
- Most endpoints require Clerk authentication via `requireAuth()`
- Exceptions: public course listing, OAuth callbacks, webhooks

### Main API Routes
- `/api/users` - User management and settings
- `/api/courses` - Course CRUD operations
- `/api/syllabus` - Syllabus upload and processing
- `/api/todos` - Task management with bulk operations
- `/api/google-drive` - File integration
- `/api/agents` - AI agent operations

## Frontend Architecture

### State Management
- **Global State**: React Context API (CourseContext, AgentContext, etc.)
- **Local State**: Custom hooks with caching and optimization
- **API Integration**: Axios with Bearer token auth

### Key UI Components
- **Dashboard**: Course list, add course form, school banner
- **Course Page**: Tabbed interface (Overview, Tasks, Agents, Library)
- **Agent Components**: Type selector, configuration, file library
- **Todo System**: Grouped lists with urgency alerts

### User Experience Features
- Optimistic updates for immediate feedback
- Skeleton loaders and loading states
- Toast notifications with undo
- Real-time polling for updates
- Gradient animations and modern UI

## Development Guidelines

1. **Code Style**: Follow existing patterns, use TypeScript for new components
2. **API Patterns**: Use consistent error handling and response formats
3. **UI/UX**: Reference `designGuidelines.md` for frontend work
4. **Security**: Never expose secrets, use proper authentication
5. **Custom Colors**: ALWAYS incorporate the user's custom primary color in UI components
   - Access via CSS variable: `--custom-primary-color`
   - Use the following pattern to get custom colors:
   ```javascript
   const customColors = useMemo(() => {
     if (typeof window !== "undefined") {
       const computedStyle = getComputedStyle(document.documentElement);
       const primaryColor = computedStyle.getPropertyValue("--custom-primary-color")?.trim() || "#6366f1";
       return { primary: primaryColor };
     }
     return { primary: "#6366f1" };
   }, []);
   ```
   - Apply to borders, backgrounds, text, buttons, and accents
   - Create lighter/darker shades for hover states and variations

## Next Steps

### Priority 1: Enable Agent Processing
- Re-enable Bull queue system or implement alternative
- Create missing worker process
- Implement file processing service

### Priority 2: Complete Agent Features
- Connect frontend to backend APIs
- Implement remaining agents
- Add real-time status updates

### Priority 3: Enhanced Features
- Agent chat interface
- Export functionality
- Advanced configuration options