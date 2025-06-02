# Agents Tab Implementation Tasks (MongoDB Architecture)

Based on the [Agents Tab PRD](../AGENTS_TAB_PRD.md) and following the established task structure.

## Overview

This document outlines the comprehensive implementation plan for the Agents Tab feature in HomeBase, now utilizing MongoDB for agent data storage and an Express.js backend API. Tasks are organized by priority and grouped by functional area.

## Phase 1: Foundation & Core Infrastructure (MongoDB Backend)

### 1.1 MongoDB Models & Backend API Setup

- [x] **(P0)** Define Mongoose Schemas for agent data:
  - [x] `agentTask.model.js` (for Agent Tasks)
  - [x] `agentConversation.model.js` (for chat history)
  - [x] `agentTemplate.model.js` (for reusable configs)
- [x] **(P0)** Set up Express routes for agent operations (`backend/routes/agent.routes.js`):
  - [x] `POST /api/agents/tasks` (create task)
  - [x] `GET /api/agents/tasks` (list tasks)
  - [x] `GET /api/agents/tasks/:taskId` (get specific task)
  - [x] `PUT /api/agents/tasks/:taskId/status` (for worker updates)
  - [x] `DELETE /api/agents/tasks/:taskId` (delete task)
  - [x] `POST /api/agents/tasks/:taskId/messages` (add message)
  - [x] `GET /api/agents/templates` (get templates)
- [x] **(P0)** Implement controller logic (`backend/controllers/agentController.js`) using Mongoose models for:
  - [x] Task creation, including validation and adding to Bull queue.
  - [x] Task status updates from workers.
  - [x] Listing and retrieving tasks.
  - [x] Deleting tasks and associated conversations.
  - [x] Managing agent conversations.
  - [x] Managing agent templates.
- [x] **(P0)** Ensure `hybridDataService.js` correctly validates files and ownership against MongoDB.
- [ ] **(P1)** Implement robust usage tracking in `hybridDataService.js` and `User` model (MongoDB).
  - [ ] Add fields like `agentTasksUsedThisMonth`, `agentTaskLimit` to User model.
  - [ ] Implement `incrementUserTaskCount` to update MongoDB.
  - [ ] Implement logic for monthly usage reset.

### 1.2 File Processing Service (Existing - Review for DB independence)

- [x] **(P0)** Create `fileProcessingService.js` for handling file preparation (largely DB independent).
  - [x] PDF text extraction using pdf-parse.
  - [x] DOCX text extraction.
  - [x] PPTX slide content extraction.
  - [x] Image OCR for scanned documents.
- [x] **(P0)** Implement file size validation.
- [x] **(P0)** Create text chunking strategy.
- [x] **(P1)** Implement file deduplication.
- [x] **(P1)** Add support for TXT, MD, and common code files.
- [ ] **(P2)** Implement smart content extraction (headers, tables, figures).

### 1.3 Job Queue System with MongoDB Integration

- [x] **(P0)** Configure Bull queue (`agentTaskQueue`) for agent task processing using Redis.
- [x] **(P0)** Implement `agentTaskWorker.js` for processing queued tasks:
  - [x] Fetch full task details from MongoDB using `AgentTask.findById()`.
  - [x] Call backend API (`PUT /api/agents/tasks/:taskId/status`) to update task status, progress, and results in MongoDB.
  - [x] Error handling logs to console and updates task status to 'failed' in MongoDB.
- [x] **(P0)** Ensure `jobId` from Bull is stored in the `AgentTask` MongoDB document.
- [x] **(P1)** Add job timeout handling (Bull specific, updates MongoDB task status on timeout).
- [x] **(P2)** Create queue monitoring dashboard (Bull specific, e.g., Arena or custom API).

## Phase 2: AI Agent Implementation (Largely Unchanged by DB Shift)

### 2.1 Agent Service Architecture

- [x] **(P0)** Create `agentOrchestrator.js` to manage agent workflow.
- [x] **(P0)** Implement base `Agent` class.

### 2.2 Note Taker Agent

- [x] **(P0)** Implement `NoteTakerAgent` class.
- [x] **(P0)** Create prompt templates for different note-taking styles & enhance for robustness.
- [x] **(P0)** Implement key concept extraction.
- [x] **(P0)** Add support for maintaining document structure.
- [x] **(P1)** Implement formula/equation preservation.
- [x] **(P1)** Add diagram/figure reference extraction.
- [x] **(P2)** Support custom note-taking templates (agent logic to use template config from MongoDB).

### 2.3 Researcher Agent

- [x] **(P0)** Implement `ResearcherAgent` class.
- [x] **(P0)** Create cross-document analysis functionality.
- [x] **(P0)** Implement citation extraction and formatting (basic).
- [ ] **(P1)** Add research depth configuration.
- [ ] **(P1)** Implement methodology extraction.
- [ ] **(P2)** Add literature review template generation.

### 2.4 Study Buddy Agent

- [ ] **(P0)** Implement `StudyBuddyAgent` class.
- [ ] **(P0)** Create flashcard generation algorithm.
- [ ] **(P0)** Implement practice exam generation.
- [ ] **(P1)** Add difficulty level configuration.
- [ ] **(P1)** Implement spaced repetition scheduling.
- [ ] **(P2)** Create concept map generation.

### 2.5 Assignment Assistant Agent

- [ ] **(P0)** Implement `AssignmentAgent` class.
- [ ] **(P0)** Create assignment requirement parser.
- [ ] **(P0)** Implement outline generation.
- [ ] **(P0)** Add thesis statement generator.
- [ ] **(P1)** Implement citation formatting (APA, MLA, Chicago).
- [ ] **(P1)** Add word count targeting.
- [ ] **(P2)** Create rubric compliance checker.

### 2.6 AI Provider Integration

- [x] **(P0)** Extend existing `aiService.js`.
- [x] **(P0)** Implement prompt optimization for each agent type.
- [x] **(P0)** Add token counting and cost estimation.
- [ ] **(P1)** Implement model selection logic.
- [ ] **(P1)** Add fallback to alternative models.
- [ ] **(P2)** Implement prompt caching.

## Phase 3: Frontend Implementation with Express API (MongoDB Backend)

### 3.1 API Client & Context Setup

- [x] **(P0)** Configure Axios instance (`client/app/api/agents.api.js`) for backend communication.
- [x] **(P0)** Implement API functions in `agents.api.js` for:
  - [x] `createTaskWithQueue` (`POST /api/agents/tasks`)
  - [x] `getTasks` (`GET /api/agents/tasks`)
  - [x] `getTask` (`GET /api/agents/tasks/:taskId`)
  - [x] `getJobStatus` (`GET /api/agents/jobs/:jobId/status`) - (Interacts with Bull queue, not directly MongoDB)
  - [x] `getUserUsage` (`GET /api/agents/usage`)
  - [ ] `addMessageToTask` (`POST /api/agents/tasks/:taskId/messages`)
  - [ ] `deleteAgentTask` (`DELETE /api/agents/tasks/:taskId`)
  - [ ] `getAgentTemplates` (`GET /api/agents/templates`)
- [x] **(P0)** Refactor `client/app/context/AgentContext.jsx`:
  - [x] Remove all Convex client and hook usage.
  - [x] Use `useReducer` for local state management (tasks, loading, error).
  - [x] Implement `fetchTasks` to load initial tasks via API.
  - [x] `createTask` calls backend API, then starts polling job status.
  - [x] Implement polling for job status (`pollJobStatus` in `agents.api.js`) and update local task state.
  - [x] Fetch usage data via API.
- [ ] **(P0)** Ensure `AgentProvider` is correctly wrapping relevant parts of the application.
- [x] **(P0)** Remove Convex-specific files and dependencies:
  - [x] Delete `client/convex/` directory.
  - [x] Delete `client/app/providers/ConvexClientProvider.tsx`.
  - [x] Remove Convex packages from `client/package.json` and `backend/package.json`.

### 3.2 UI Components Enhancement with API Data

- [x] **(P0)** Update `AgentsTab.tsx` to use data from `AgentContext` (tasks, loading states, error).
  - [x] Ensure task creation calls `createTask` from context.
  - [x] Display task list and statuses based on context state (updated by polling).
- [ ] **(P0)** Update `PastCompletions.tsx` to use task data from `AgentContext`.
- [ ] **(P0)** Create/Update `AgentProgress` component (if separate) to reflect progress from task data in context.
- [ ] **(P1)** Implement `AgentChat` component using API calls to `POST /api/agents/tasks/:taskId/messages` and fetch conversation history (new API endpoint needed for history).

### 3.3 Real-time-like Features (Polling)

- [x] **(P0)** Implement client-side polling in `AgentContext.jsx` (using `agentsApi.pollJobStatus`) for task progress and completion.
  - [x] Update local state on progress, completion, or failure.
- [ ] **(P1)** Optimize polling intervals and timeouts.
- [ ] **(P2)** Consider WebSocket integration for true real-time updates (major effort, post-MVP).

### 3.4 Results Display

- [ ] **(P0)** Create `AgentResultViewer` component (as planned, DB agnostic).
- [ ] **(P0)** Implement export functionality (DB agnostic for result content).
- [ ] **(P1)** Add result annotation features (would require MongoDB schema updates).
- [ ] **(P1)** Implement result sharing via link (would require backend logic).

### 3.5 Mobile Responsiveness (Existing task, unaffected by DB change)

- [ ] **(P0)** Ensure all agent components are mobile-responsive.

## Phase 4: Integration & Enhancement (MongoDB Backend)

### 4.1 Course Integration (Existing task, unaffected by DB change)

- [ ] **(P0)** Add agent task count to course overview.
- [ ] **(P0)** Integrate agent-generated todos with task management.

### 4.2 Usage Tracking & Limits with MongoDB

- [x] **(P0)** Define fields in `User` model (MongoDB) for usage tracking (e.g., `tasksUsedThisMonth`, `taskLimit`). (Initial mock in place, needs formalizing)
- [x] **(P0)** Implement `hybridDataService.incrementUserTaskCount` to update MongoDB. (Initial mock in place)
- [x] **(P0)** `agentController.createTaskWithQueue` checks usage against `hybridDataService.getUserUsageStats`. (Initial mock in place)
- [ ] **(P1)** Implement robust monthly reset logic for usage counts in MongoDB.
- [ ] **(P0)** Create usage dashboard UI using data from `/api/agents/usage`.

### 4.3 Performance Optimization (MongoDB & API)

- [x] **(P0)** Ensure proper Mongoose schema indexes for `AgentTask`, `AgentConversation`, `AgentTemplate`.
- [ ] **(P0)** Optimize API queries to MongoDB for agent data.
- [ ] **(P1)** Implement API response caching where appropriate (e.g., for templates).
- [ ] **(P1)** Implement pagination for task lists in API and frontend.

### 4.4 Error Handling & Recovery (Existing tasks, partially complete)

- [x] **(P0)** Implement comprehensive error logging in backend (ongoing).
- [x] **(P0)** Create user-friendly error messages in frontend (ongoing).
- [x] **(P0)** Add automatic retry for Bull jobs (backend).

## Phase 5: Security & Compliance (Largely Unaffected by DB Change)

(Tasks remain mostly the same)

## Phase 6: Testing & Quality Assurance (MongoDB Stack)

### 6.1 Backend Unit & Integration Testing (MongoDB)

- [ ] **(P0)** Write unit tests for Mongoose models.
- [ ] **(P0)** Write unit tests for agent service logic (e.g., `agentOrchestrator`, specific agents).
- [ ] **(P0)** Write integration tests for API endpoints in `agentController.js` (mocking Mongoose/Bull).
- [ ] **(P0)** Test `agentTaskWorker.js` logic with mock job data and Mongoose.
- [ ] **(P1)** Test `hybridDataService.js` functions for file/course validation and usage tracking.

### 6.2 Full Integration Testing (End-to-End)

- [ ] **(P0)** Test complete agent task workflow: UI -> API -> Queue -> Worker -> MongoDB -> API -> UI.
- [ ] **(P0)** Test file upload integration with agent task creation.
- [ ] **(P0)** Test status updates via polling mechanism.

(Other testing phases like Performance, UAT remain relevant)

## Dependencies (Updated)

1.  **External Services**:
    - OpenAI/Anthropic API access and rate limits.
    - Google Drive API.
    - Clerk for authentication.
2.  **Infrastructure**:
    - MongoDB for all application and agent data.
    - Redis for Bull job queues.
3.  **Team Resources**:
    - ML engineers for prompt optimization.
    - Full-stack developers (Node.js/Express, React/Next.js, MongoDB).
4.  **Legal**: Academic integrity policy approval.
5.  **Budget**: AI API costs.

## Removed Sections

- Convex Integration Benefits
- Convex-specific setup, function development, client setup, real-time features, usage tracking, performance optimization tasks.

This provides a more accurate reflection of the current architecture and remaining work.
