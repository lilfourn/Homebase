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

# AI Code Editor Style Guidelines & Design System

## 🎯 Core Design Philosophy

Our AI code editor transforms coding from an intimidating task into a delightful journey of discovery. By combining psychological insights with beautiful design, we create an experience that junior developers genuinely love returning to—not because they're hooked, but because they're genuinely supported and empowered.

### Design Principles

1. **Encouragement over Criticism** - Every interaction should build confidence
2. **Clarity over Cleverness** - Simple, approachable language and visuals
3. **Progress over Perfection** - Celebrate small wins and learning moments
4. **Delight in Details** - Micro-interactions that spark joy
5. **Speed as a Feature** - Sub-200ms responses for all AI interactions

## 🎨 Visual Design System

### Color Palette

Using TailwindCSS classes following the 60-30-10 rule:

```css
/* Primary Colors (60% - Backgrounds & Large Areas) */
--background: slate-50 (light) / slate-950 (dark)
--surface: white (light) / slate-900 (dark)
--muted: slate-100 (light) / slate-800 (dark)

/* Secondary Colors (30% - UI Elements) */
--card: white (light) / slate-900 (dark)
--border: slate-200 (light) / slate-700 (dark)
--input: slate-200 (light) / slate-700 (dark)

/* Accent Colors (10% - CTAs & Highlights) */
--primary: violet-600 (confidence & creativity)
--success: emerald-500 (achievements & correct code)
--warning: amber-500 (gentle warnings)
--error: rose-500 (friendly error states)
--info: sky-500 (helpful tips)
```

### Typography Scale

Using TailwindCSS typography classes:

```jsx
// Headings
<h1 className="text-4xl font-bold tracking-tight"> // 36px, main titles
<h2 className="text-2xl font-semibold"> // 24px, section headers
<h3 className="text-lg font-medium"> // 18px, subsections

// Body Text
<p className="text-base leading-relaxed"> // 16px, optimal readability
<p className="text-sm text-muted-foreground"> // 14px, secondary text

// Code
<code className="font-mono text-sm"> // 14px, inline code
<pre className="font-mono text-sm leading-6"> // 14px, code blocks
```

### Spacing System

Strict 8-point grid using Tailwind spacing:

```jsx
// Micro spacing
gap-1 (4px) - tight element grouping
gap-2 (8px) - default element spacing

// Component spacing
p-4 (16px) - standard padding
m-6 (24px) - section margins
gap-8 (32px) - major section gaps

// Layout spacing
max-w-2xl - content width for readability
container mx-auto px-4 - responsive container
```

## 🎭 Emotional Design Patterns

### 1. Instant Positive Feedback System

#### Success Animations

```jsx
// Using Lucide React icons with micro-animations
import { Sparkles, CheckCircle2, Zap } from "lucide-react";

// Success state for code completion
<motion.div
  initial={{ scale: 0, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: "spring", duration: 0.3 }}
  className="flex items-center gap-2 text-emerald-600"
>
  <Sparkles className="w-4 h-4" />
  <span className="text-sm font-medium">Nice work!</span>
</motion.div>;
```

#### Progress Indicators

```jsx
// AI thinking state with personality
<div className="flex items-center gap-3 p-4 bg-violet-50 rounded-lg">
  <div className="relative">
    <Bot className="w-5 h-5 text-violet-600" />
    <div className="absolute -bottom-1 -right-1">
      <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
    </div>
  </div>
  <p className="text-sm text-violet-700">Looking for the best solution...</p>
</div>
```

#### Achievement Celebrations

```jsx
// Milestone reached animation
<AnimatePresence>
  {showAchievement && (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      className="fixed bottom-6 right-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-4 rounded-lg shadow-lg"
    >
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6" />
        <div>
          <p className="font-semibold">First Function Complete! 🎉</p>
          <p className="text-sm opacity-90">You're making great progress</p>
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

### 2. Making AI Approachable

#### Friendly AI Assistant Presence

```jsx
// Subtle AI avatar with status indicators
<div className="relative inline-flex">
  <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-indigo-500 rounded-full flex items-center justify-center">
    <Bot className="w-4 h-4 text-white" />
  </div>
  {/* Status ring */}
  <div className="absolute inset-0 rounded-full border-2 border-violet-400 animate-ping opacity-20" />
</div>
```

#### Clear, Encouraging Language

```jsx
// AI suggestion component with friendly tone
<Card className="border-violet-200 bg-violet-50/50">
  <CardHeader className="pb-3">
    <div className="flex items-start gap-3">
      <Lightbulb className="w-5 h-5 text-violet-600 mt-0.5" />
      <div>
        <h4 className="text-sm font-medium">Quick tip!</h4>
        <p className="text-sm text-muted-foreground mt-1">
          This function could be simplified. Want me to show you how?
        </p>
      </div>
    </div>
  </CardHeader>
  <CardFooter className="pt-0 gap-2">
    <Button size="sm" variant="secondary">
      Show me
    </Button>
    <Button size="sm" variant="ghost">
      I'll keep mine
    </Button>
  </CardFooter>
</Card>
```

### 3. Premium, Polished Interactions

#### Smooth Hover States

```jsx
// Code suggestion hover effect
<div className="group relative">
  <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-indigo-600/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
  <Button
    variant="ghost"
    className="relative transition-all duration-200 group-hover:translate-x-0.5"
  >
    <Plus className="w-4 h-4 mr-2" />
    Accept suggestion
  </Button>
</div>
```

#### Intelligent Code Animations

```jsx
// Code transformation animation
<div className="relative">
  <AnimatePresence mode="wait">
    <motion.pre
      key={codeVersion}
      initial={{ opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(4px)" }}
      transition={{ duration: 0.3 }}
      className="bg-slate-900 text-slate-50 p-4 rounded-lg font-mono text-sm"
    >
      <code>{currentCode}</code>
    </motion.pre>
  </AnimatePresence>
</div>
```

## 🧩 Component Patterns

### AI Suggestion Cards

```jsx
// shadcn Card with AI suggestion styling
<Card className="border-l-4 border-l-violet-500 hover:shadow-md transition-shadow">
  <CardHeader>
    <CardTitle className="text-base flex items-center gap-2">
      <Wand2 className="w-4 h-4 text-violet-600" />
      AI Suggestion
    </CardTitle>
  </CardHeader>
  <CardContent>{/* Code diff view */}</CardContent>
</Card>
```

### Floating AI Command Palette

```jsx
// Command palette with AI features
<CommandDialog>
  <CommandInput placeholder="Ask AI anything..." />
  <CommandList>
    <CommandGroup heading="AI Actions">
      <CommandItem>
        <Code className="mr-2 h-4 w-4" />
        Explain this code
      </CommandItem>
      <CommandItem>
        <Sparkles className="mr-2 h-4 w-4" />
        Suggest improvements
      </CommandItem>
    </CommandGroup>
  </CommandList>
</CommandDialog>
```

### Progress Tracking

```jsx
// Visual progress indicator for learning
<div className="space-y-2">
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">Today's Progress</span>
    <span className="font-medium text-violet-600">75%</span>
  </div>
  <Progress value={75} className="h-2" />
  <p className="text-xs text-muted-foreground">
    3 more tasks to complete your daily goal! 💪
  </p>
</div>
```

## 🎯 Interaction Guidelines

### Response Times

- **Immediate feedback**: < 100ms (hover states, button clicks)
- **AI suggestions**: < 200ms (show loading state if longer)
- **Complex operations**: Show progress with estimated time

### Animation Durations

```jsx
// Consistent timing across the app
const animations = {
  instant: "duration-100", // 100ms - micro interactions
  fast: "duration-200", // 200ms - standard transitions
  normal: "duration-300", // 300ms - panel slides
  slow: "duration-500", // 500ms - celebrations
};
```

### Loading States

```jsx
// Skeleton loader for AI responses
<div className="space-y-3 animate-pulse">
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 bg-slate-200 rounded-full" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-slate-200 rounded w-3/4" />
      <div className="h-3 bg-slate-200 rounded w-1/2" />
    </div>
  </div>
</div>
```

## 🌟 Special Moments

### First-Time User Experience

```jsx
// Welcome animation sequence
const welcomeSteps = [
  {
    icon: <Heart className="w-6 h-6" />,
    title: "Welcome to AI Code Editor!",
    description: "Let's make coding fun and easy together",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "AI is here to help",
    description: "Just start typing and watch the magic happen",
  },
];
```

### Daily Streak Celebration

```jsx
// Streak counter with motivation
<div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Flame className="w-6 h-6 text-orange-500" />
      <div>
        <p className="font-semibold text-orange-900">7 day streak!</p>
        <p className="text-sm text-orange-700">You're on fire! 🔥</p>
      </div>
    </div>
    <Badge variant="secondary" className="bg-orange-100">
      +50 XP
    </Badge>
  </div>
</div>
```

## 🎨 Dark Mode Considerations

```jsx
// Adaptive color system
const adaptiveColors = {
  // Maintains emotional impact in both themes
  success: "text-emerald-600 dark:text-emerald-400",
  primary: "text-violet-600 dark:text-violet-400",
  muted: "text-slate-600 dark:text-slate-400",

  // Adjusted backgrounds for dark mode
  successBg: "bg-emerald-50 dark:bg-emerald-950/20",
  primaryBg: "bg-violet-50 dark:bg-violet-950/20",
};
```

## 📋 Implementation Checklist

- [ ] **Onboarding Flow**: Gentle introduction with AI capabilities demo
- [ ] **Micro-animations**: Add to all interactive elements
- [ ] **Progress System**: Visual progress tracking for learning
- [ ] **Achievement System**: Celebrate milestones appropriately
- [ ] **AI Personality**: Consistent, encouraging tone
- [ ] **Loading States**: Never leave users wondering
- [ ] **Accessibility**: Keyboard navigation, screen reader support
- [ ] **Performance**: Lazy load animations, optimize AI responses
- [ ] **Error Handling**: Transform errors into learning opportunities
- [ ] **Daily Engagement**: Streaks, challenges, progress tracking

## 🚀 Remember

The goal isn't to trap users but to create an environment where learning to code feels as natural and enjoyable as playing a game. Every interaction should leave junior developers feeling more confident and capable than before. When they close our editor, they should be excited to come back—not because they're addicted, but because they're growing.

**Make every line of code a step forward, every error a lesson, and every success a celebration.**
