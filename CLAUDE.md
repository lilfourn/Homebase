# HomeBase Project Documentation

## Overview

HomeBase is a university-focused web application that transforms academic files, notes, and documents into a private, AI-driven knowledge graph. It's designed specifically for students to manage their academic life with features similar to Notion's organization capabilities combined with GitHub-style collaboration.

## Current State (as of January 2025)

### Completed Infrastructure (Core Application)

- ✅ User Authentication & Management (Clerk, MongoDB)
- ✅ Course Management (MongoDB)
- ✅ Syllabus Processing with AI (MongoDB for storage)
- ✅ Task Management System (Todos - MongoDB, polling via Express API)
- ✅ Google Drive Integration (OAuth, file listing, PDF download)
- ✅ Teaching Assistant (TA) Matching Logic

### Agent Feature Infrastructure (MongoDB & Express Backend)

- ✅ **Mongoose Models**: Defined for `AgentTask`, `AgentConversation`, `AgentTemplate` in `backend/models/`.
- ✅ **Express API Endpoints**:
  - CRUD operations for Agent Tasks (`POST, GET, DELETE /api/agents/tasks`, `GET /api/agents/tasks/:taskId`).
  - Endpoint for worker to update task status (`PUT /api/agents/tasks/:taskId/status`).
  - Endpoints for agent conversations and templates.
- ✅ **File Processing Service** (`backend/services/fileProcessingService.js`):
  - PDF, DOCX, PPTX, Image (OCR), TXT, MD file processing.
  - Content chunking, deduplication, security scanning, academic integrity checks.
- ✅ **Job Queue System & Core Agent Backend**:
  - Bull queue (`agentTaskQueue`) configured with Redis for agent task processing.
  - `agentTaskWorker.js` implemented for asynchronous task execution:
    - Fetches task details from MongoDB.
    - Updates task status and results in MongoDB via backend API.
  - Core agent service architecture established (`agentOrchestrator.js`, base `Agent` class).
  - LangGraph integration for AI agents.
  - **Note Taker Agent**: Substantially implemented (logic, prompt templates, key concept & diagram reference extraction, custom template support).
  - **Researcher Agent**: Foundational implementation (logic, prompt for cross-doc analysis and citation extraction).
  - AI provider integration (`aiService.js`) for OpenAI/Anthropic.
  - Error logging and retry logic for backend processing.

### Active Development & Frontend for Agents

- 🚧 **Agents Tab Frontend Integration (MongoDB Backend)**:
  - **Critical Path**: Integrating `AgentsTab` UI components (`client/app/components/course/agent/`) with the Express backend API (which uses MongoDB). This includes:
    - Refactoring `client/app/hooks/agents/useAgents.js` and `client/app/context/AgentContext.jsx` to use API calls (e.g., `axios`) instead of Convex.
    - Fetching initial task lists from the backend.
    - Implementing task creation by calling `POST /api/agents/tasks`.
    - Displaying real-time (via polling the backend job status endpoint) or fetched status updates and progress.
    - Developing the `AgentResultViewer`.
- 🚧 **Implementing Remaining AI Agents**:
  - Study Buddy Agent
  - Assignment Assistant Agent
- 🚧 **Refining Existing Agents**:
  - Enhancing Researcher Agent capabilities (depth configuration, methodology extraction).
- 🚧 **UI for Advanced Agent Features**:
  - Agent configuration options, result export, agent chat interface.

## Development Memories and Guidelines

- always look at designGuidelines.md when updating or creating frontend pages and components