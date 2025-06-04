# HomeBase Project Documentation

## Overview

HomeBase is a university-focused web application that helps students manage their academic life through AI-powered features. Students can upload course materials, process syllabi, manage tasks, and use AI agents to enhance their learning experience.

## Architecture Overview

### Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript/JavaScript, Tailwind CSS
- **Backend**: Express.js, MongoDB with Mongoose ODM
- **Authentication**: Clerk with JWT tokens and webhook sync
- **File Storage**: Google Drive integration (OAuth flow)
- **AI Services**: OpenAI API, LangChain (for agents)
- **Infrastructure**: Redis (prepared for queues but currently disabled)
- **Search Services**: Multi-provider support (Brave, Tavily)

### Data Models

#### Core Entities

1. **User**: Central entity with Clerk integration, school info, Google Drive connection
   - Indexed by clerkUserId, email
   - Stores school colors, logo, Google OAuth tokens
2. **Course**: Academic courses with unique instance IDs
   - Supports multiple instances of same course
   - Linked to users and syllabi
3. **Todo**: Task management with urgency calculation and auto-cleanup
   - Categories: task, assignment, exam, reminder, other
   - 30-second in-memory cache for optimization
   - Auto-cleanup of completed tasks older than 30 days
4. **Syllabus**: Course syllabus storage and AI-processed data
   - Stores original files and processed content
   - Links to Google Drive files
5. **AgentTask**: AI agent processing tasks
   - Status tracking: pending, processing, completed, failed
   - File associations and results storage
6. **AgentConversation**: Chat history for agent interactions
7. **AgentTemplate**: Reusable agent configurations

## Current State (as of January 2025)

### ✅ Completed Features

#### Core Application

- **User Authentication**: Full Clerk integration with JWT tokens
  - Webhook sync for user data
  - Request timeout middleware (30s)
- **Course Management**: CRUD operations with user association
  - Support for multiple course instances
  - Course deletion with cascade
- **Syllabus Processing**: Upload, AI parsing, TA matching
  - File size validation (50MB limit)
  - AI-powered content extraction
- **Task Management**:
  - Advanced todo system with categories (task, assignment, exam, etc.)
  - Urgency calculation and important deadline alerts
  - Optimistic updates with retry logic (3 attempts)
  - Undo functionality (8-second window)
  - Auto-cleanup of old completed tasks (30 days)
  - In-memory caching with 30s TTL
  - Bulk operations support
- **Google Drive Integration**:
  - OAuth flow implementation
  - File listing and import
  - Course file association
  - Token refresh handling
- **School Customization**: Logo upload, color theming
  - Dynamic CSS variable injection
  - Cloudinary image storage

#### Agent Infrastructure

- **Database Layer**: Complete MongoDB models for agents
- **API Layer**: Full REST API for agent operations
- **Core Agent System**:
  - BaseAgent class with standard workflow (ES6 module, LangChain integration)
  - AgentOrchestrator for routing and management
  - Note Taker Agent (fully implemented)
  - Researcher Agent (partially implemented with web search)
- **Supporting Services**:
  - AI service integration (OpenAI)
  - Web search capabilities (Brave, Tavily providers)
  - Content security service (basic implementation)

#### Terminal Feature (New)

- **AI Terminal Interface**: Modern command-line style UI
  - File context selection from Google Drive
  - Customizable AI settings (temperature, style)
  - Stats tracking (messages, files, sessions)
  - Tips carousel for user education
  - Currently frontend-only (backend connection pending)

### 🚧 In Progress / Disabled

#### Queue System

- **Status**: Infrastructure exists but is disabled
- Bull queue setup code commented out in agent routes
- Redis configuration present but unused
- Tasks created synchronously without background processing
- Worker process (`agentTaskWorker.js`) referenced but missing
- Queue names defined: 'agentTasks', 'agentTaskDLQ'

#### File Processing

- `fileProcessingService.js` referenced but not implemented
- PDF, DOCX, PPTX processing capabilities planned but missing
- OCR and content extraction not available
- File download implemented but content processing missing

#### Frontend Agent Integration

- AgentContext uses placeholder data (hybridDataService)
- Agent UI components exist but need backend connection
- Real-time status updates not implemented
- Terminal feature not connected to agent system

#### Web Search Integration

- Service structure exists but implementation incomplete
- Multiple providers configured but not fully functional
- Missing API keys or incomplete setup

### ❌ Missing Components

1. **Asynchronous Task Processing**: No active job queue
2. **File Processing Pipeline**: Service not implemented
3. **Pending Agents**: Study Buddy, Assignment Assistant (types defined but no implementation)
4. **Usage Tracking**: Returns hardcoded values (100 uses, 50 remaining)
5. **Content Security**: Service exists but implementation minimal
6. **Real-time Updates**: No WebSocket/SSE for live status
7. **Agent Chat Interface**: Conversation UI not implemented
8. **Terminal Backend**: AI terminal has no backend connection
9. **Export Functionality**: Task/data export not available
10. **Advanced Agent Config**: Template system not exposed to UI

## API Endpoints

### Authentication

- Most endpoints require Clerk authentication via `requireAuth()`
- Exceptions: public course listing, OAuth callbacks, webhooks

### Main API Routes

- `/api/users` - User management and settings
  - GET/POST user data, school info, logo upload
- `/api/courses` - Course CRUD operations
  - Support for course instances and cascading deletes
- `/api/syllabus` - Syllabus upload and processing
  - File upload, AI processing, TA matching
- `/api/todos` - Task management with bulk operations
  - Optimized with caching, undo support, bulk updates
- `/api/google-drive` - File integration
  - OAuth flow, file listing, course file import
- `/api/agents` - AI agent operations
  - Task creation, status polling, results retrieval
  - Template management (CRUD)

## Frontend Architecture

### State Management

- **Global State**: React Context API (CourseContext, AgentContext, etc.)
- **Local State**: Custom hooks with caching and optimization
- **API Integration**: Axios with Bearer token auth

### Key UI Components

- **Dashboard**: Course list, add course form, school banner
  - Dynamic school colors and branding
  - Upgrade prompts for free users
- **Course Page**: Tabbed interface (Overview, Tasks, Agents, Library)
  - Tab persistence in URL
  - Loading states for each section
- **Agent Components**:
  - Type selector with visual cards
  - Configuration panel with file selection
  - File library with Google Drive integration
  - Results dialog with markdown rendering
  - Past completions view
- **Todo System**:
  - Grouped lists by category with urgency alerts
  - Inline editing and quick actions
  - Undo toast notifications
  - Important deadline banner
- **Terminal**: AI-powered command interface
  - File context selection
  - Auto-expanding input
  - Settings panel with AI parameters
- **Settings Page**:
  - University selection with search
  - Google Drive connection status
  - Agent usage statistics

### User Experience Features

- Optimistic updates for immediate feedback
- Skeleton loaders and loading states throughout
- Toast notifications with 8-second undo window
- Real-time polling for updates (5s intervals)
- Gradient animations and modern UI
- Glass morphism effects and dynamic shadows
- Mobile-responsive design with sidebar toggle
- Error boundaries for graceful failures
- Auto-save for form inputs
- Keyboard shortcuts support

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
       const primaryColor =
         computedStyle.getPropertyValue("--custom-primary-color")?.trim() ||
         "#6366f1";
       return { primary: primaryColor };
     }
     return { primary: "#6366f1" };
   }, []);
   ```
   - Apply to borders, backgrounds, text, buttons, and accents
   - Create lighter/darker shades for hover states and variations

## Testing & Development

### Running the Application

- Backend: `npm run dev` (Express on port 5050)
- Frontend: `npm run dev` (Next.js on port 3000)
- Database: MongoDB (local or Atlas)
- Redis: Optional (for future queue system)

### Common Commands

- Lint: `npm run lint`
- Type checking: Available in frontend
- Database migrations: See `/backend/migrations/`

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.

## Next Steps

### Priority 1: Enable Agent Processing

- Re-enable Bull queue system or implement alternative
- Create missing worker process (`agentTaskWorker.js`)
- Implement file processing service for PDF/DOCX/PPTX
- Connect terminal feature to agent system

### Priority 2: Complete Agent Features

- Fix hybridDataService to use real backend
- Implement Study Buddy and Assignment Assistant agents
- Add real-time status updates (WebSocket/SSE)
- Complete web search service integration

### Priority 3: Enhanced Features

- Agent chat/conversation interface
- Export functionality for tasks and data
- Advanced agent configuration UI
- Usage tracking and limits enforcement
- File content extraction and OCR

## Important Notes

### Code Organization

- Backend uses CommonJS modules (require/exports)
- Frontend uses ES6 modules (import/export)
- Newer components written in TypeScript
- API responses follow consistent format: `{ success, data/error }`

### Environment Variables

- Authentication: CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET
- Database: MONGODB_URI
- AI Services: OPENAI_API_KEY
- Storage: CLOUDINARY_URL
- OAuth: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### Recent Architectural Changes

- Transition from Convex to MongoDB-only architecture
- Terminal feature added but not integrated
- Agent UI refactored for better UX
- Todo system optimized with caching
