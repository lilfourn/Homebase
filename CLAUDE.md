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

## Development Principles

- Always fully analyze every possible error origin and every possible solution
- We will always pick the best practice and most robust option

## Current State (as of January 2025)

[Rest of the existing content remains unchanged]