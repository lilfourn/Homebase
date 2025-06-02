# Convex Setup for HomeBase Agents

This directory contains all Convex functions and schemas for the HomeBase Agents feature.

## Architecture

HomeBase uses a hybrid data architecture:
- **MongoDB**: Stores core application data (users, courses, files)
- **Convex**: Stores agent-specific data with real-time synchronization

## Directory Structure

```
convex/
├── _generated/        # Auto-generated TypeScript types
├── agents/           # Agent-related functions
│   ├── createTask.ts
│   ├── updateTaskStatus.ts
│   ├── getTask.ts
│   ├── listTasks.ts
│   └── deleteTask.ts
├── schema.ts         # Database schema definitions
├── http.ts          # HTTP endpoints for webhooks
└── README.md        # This file
```

## Environment Setup

1. **Development**
   ```bash
   npx convex dev
   ```

2. **Production**
   ```bash
   ./scripts/deploy-convex.sh --prod
   ```

Environment variables are managed in `.env.local` for local development and should be configured in your hosting platform (Vercel, etc.) for production.

## Schema Overview

### agentTasks
Stores all agent task information including:
- User and course association
- Task configuration and status
- File references (MongoDB IDs)
- Processing progress and results
- Usage metrics and costs

### agentConversations
Stores chat history between users and agents:
- Messages with role (user/assistant)
- Timestamps
- Context information

### agentTemplates
Stores reusable agent configurations:
- User-specific and system templates
- Public/private visibility
- Configuration presets

## Key Features

1. **Real-time Updates**: All data changes sync instantly across devices
2. **Optimistic UI**: Immediate feedback for better UX
3. **Type Safety**: Full TypeScript support
4. **Offline Support**: Mutations queued when offline
5. **Automatic Caching**: Query results cached intelligently

## Backend Integration

The Express backend can communicate with Convex in two ways:

1. **HTTP Actions** - For server-to-server communication:
   - `POST /api/updateTaskStatus` - Update task progress/status from backend
   - Requires authentication via Bearer token

2. **Direct Convex Client** - Using Convex Node.js client:
   - Backend can directly call Convex mutations
   - Real-time subscriptions not available in Node.js

## Usage in React

```typescript
import { useAgentTasks, useCreateAgentTask } from '@/hooks/agents/useConvexAgents';

// List tasks with real-time updates
const { tasks, isLoading } = useAgentTasks({
  userId: user.id,
  courseInstanceId: course.id
});

// Create new task
const { createTask } = useCreateAgentTask();
await createTask({
  userId: user.id,
  courseInstanceId: course.id,
  taskName: "Lecture Notes",
  agentType: "note-taker",
  config: { mode: "detailed", model: "gpt-4" },
  files: [...]
});
```

## Deployment Checklist

- [ ] Set environment variables in Vercel/hosting platform
- [ ] Configure webhook secrets
- [ ] Set up Convex deployments for each environment
- [ ] Test real-time synchronization
- [ ] Verify authentication integration
- [ ] Monitor usage and costs

## Troubleshooting

1. **Types not generating**: Run `npx convex codegen`
2. **Real-time not working**: Check WebSocket connection
3. **Auth issues**: Verify Clerk integration
4. **Deployment fails**: Check environment variables

## Support

For issues related to Convex:
- Documentation: https://docs.convex.dev
- Community: https://convex.dev/community
- Support: support@convex.dev