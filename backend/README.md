# Backend Architecture & Context

## Overview

The backend serves as the data and business logic layer for HomeBase, handling all server-side operations including user management, course data, file processing, and AI integrations. It's designed with a modular architecture that makes adding new features straightforward.

## Core Architecture Principles

- **Separation of Concerns**: Controllers handle HTTP requests, services contain business logic, models define data structure
- **User Isolation**: All data is scoped to individual users through userId from Clerk authentication
- **Async Processing**: Heavy operations (like AI parsing) run asynchronously to maintain responsiveness
- **Extensibility**: Modular design allows easy addition of new endpoints, services, and integrations

## Folder Structure & Purpose

### `/controllers`

**Purpose**: Handle incoming HTTP requests and send responses. Controllers are thin layers that validate input and delegate to services.

- **course.controller.js**: Manages course CRUD operations. When adding course features, new methods go here.
- **user.controller.js**: Handles user profile updates, school selection, and theme customization.
- **googleDrive.controller.js**: Manages OAuth flow and file operations. Extension point for additional cloud storage.
- **syllabus.controller.js**: Orchestrates document upload and AI processing workflows.

**Adding Features**: Create new controller methods for new endpoints, keeping business logic in services.

### `/models`

**Purpose**: Define data schemas and database structure using Mongoose. These are the source of truth for data shape.

- **course.model.js**: Defines what a course looks like. Add fields here for new course properties.
- **users.model.js**: User profile schema including preferences and integration tokens.
- **syllabus.model.js**: Document storage and parsed data structure.

**Adding Features**:

- Add new fields to existing models for additional data
- Create new models for entirely new entities
- Remember to add appropriate indexes for query performance

### `/routes`

**Purpose**: Define API endpoint paths and connect them to controller methods. Also apply middleware.

- **course.route.js**: All `/api/courses/*` endpoints
- **user.route.js**: All `/api/users/*` endpoints
- **googleDrive.route.js**: All `/api/google-drive/*` endpoints
- **syllabus.routes.js**: All `/api/syllabus/*` endpoints
- **syncUsers.route.js**: Clerk webhook endpoint

**Adding Features**:

- Add new routes to existing files for related functionality
- Create new route files for major new feature areas
- Always include authentication middleware

### `/services`

**Purpose**: Contains all business logic, external API integrations, and complex operations. This is where the "how" lives.

#### `/services/googleDrive`

- **googleDriveService.js**: Handles all Google Drive API operations including OAuth, file listing, and downloads. This is where you'd add methods for new Google Drive features like folder creation or sharing.

#### `/services/providers`

- **aiService.js**: OpenAI integration for intelligent document parsing. To add new AI capabilities (like summarization or Q&A), extend this service.

#### Core Services

- **syllabusProcessingService.js**: Orchestrates the entire syllabus processing pipeline. Modify this to change processing workflow or add new extraction steps.

#### `/services/agents`

- **baseAgent.js**: Base class for all AI agents providing common functionality like progress tracking and file processing
- **noteTakerAgent.js**: Extracts and organizes key information from documents into structured notes
- **researcherAgent.js**: Analyzes documents and performs web searches for comprehensive research insights
- **agentOrchestrator.js**: Coordinates agent execution and manages task workflows

#### `/services/workers`

- **agentTaskWorker.js**: Background worker that processes agent tasks asynchronously
- **startWorker.js**: Worker initialization and configuration

#### Web Search Service

- **webSearchService.js**: Provides internet search capabilities supporting multiple providers (Tavily, Serper, SerpApi)

#### `/services/users`

- **getSchoolColors.js**: Fetches official school colors from external API
- **logoCheck.js**: Validates logo URLs for security

**Adding Features**: Create new services for new external integrations or complex business logic.

### `/middleware`

**Purpose**: Functions that run before routes to handle cross-cutting concerns.

- **syncUser.middleware.js**: Ensures user exists in database before processing requests

**Adding Features**: Add middleware for new cross-cutting concerns like rate limiting, logging, or additional auth checks.

## Key Concepts for Feature Development

### 1. Authentication Flow

- Every request includes a Clerk token
- Middleware validates token and attaches userId
- Controllers use userId to scope all database queries
- Never trust client-provided userId

### 2. Data Flow Pattern

```
Request → Route → Middleware → Controller → Service → Model → Database
                                    ↓
Response ← Controller ← Service ← ←
```

### 3. Adding a New Feature Checklist

1. **Model**: Define or extend data schema
2. **Service**: Implement business logic
3. **Controller**: Create request handler
4. **Route**: Define endpoint and apply middleware
5. **index.js**: Register route with Express app

### 4. External Integrations Pattern

- Keep API keys in environment variables
- Create dedicated service files for each external API
- Handle rate limits and retries in service layer
- Cache responses when appropriate

### 5. Async Operations Pattern

- Start async job and return immediately with status ID
- Provide status checking endpoint
- Store results in database when complete
- Client polls for completion

## Common Extension Points

### Adding New Course Features

1. Extend `course.model.js` with new fields
2. Add service methods in a new service file
3. Create controller methods in `course.controller.js`
4. Add routes in `course.route.js`

### Adding New AI Capabilities

1. Extend `aiService.js` with new prompt templates
2. Add new processing methods in `syllabusProcessingService.js`
3. Create new endpoints if needed for different processing types

### Adding New File Storage Providers

1. Create new service in `/services` (e.g., `dropboxService.js`)
2. Follow the pattern of `googleDriveService.js`
3. Add new routes and controllers
4. Store tokens in user model

### Adding New School/University Features

1. Extend user model with school-specific fields
2. Add methods to fetch school data in services
3. Create endpoints for school-specific operations

## Database Considerations

### Indexes

- Always index fields used in queries
- Compound indexes for multi-field queries
- Unique indexes to prevent duplicates

### Schema Design

- Embed data that's always accessed together
- Reference data that's accessed independently
- Use courseInstanceId for unique course identification

### Migrations

- Mongoose handles schema updates automatically
- For data migrations, create scripts in a `/migrations` folder

## Security Considerations

### API Security

- All endpoints require authentication (except webhooks)
- Validate all input data
- Sanitize data before database storage
- Use parameterized queries (Mongoose handles this)

### Token Management

- Encrypt sensitive tokens before storage
- Implement token refresh for OAuth services
- Never log tokens or sensitive data

### File Handling

- Validate file types and sizes
- Scan for malicious content if possible
- Store files in cloud services, not locally

## Testing Strategy

### Unit Tests

- Test services independently
- Mock external API calls
- Test error conditions

### Integration Tests

- Test full request/response cycle
- Use test database
- Clean up test data

### Adding Tests

- Create test files parallel to source files
- Follow naming convention: `*.test.js`
- Test new features as you add them

## Performance Optimization

### Database

- Use indexes effectively
- Limit query results with pagination
- Use projection to fetch only needed fields

### Caching

- Cache expensive computations
- Cache external API responses
- Invalidate cache on updates

### Async Processing

- Queue long-running tasks
- Return early with status endpoints
- Implement timeout handling

## Monitoring & Debugging

### Logging

- Log all errors with context
- Log important business events
- Use structured logging for easier parsing

### Health Checks

- Database connectivity endpoint exists
- Add checks for external services
- Monitor async job queues

### Error Handling

- Consistent error response format
- Appropriate HTTP status codes
- User-friendly error messages

## Future Considerations

When adding new features, consider:

1. Will this scale with more users?
2. How will this handle errors?
3. Is the data properly secured?
4. Can this be extended easily?
5. Is the code maintainable?

This architecture supports growth through:

- Modular service design
- Clear separation of concerns
- Consistent patterns
- Comprehensive error handling
- Flexible data models

### AI Agents System

The AI Agents system provides intelligent document processing capabilities:

#### Available Agents

1. **Note Taker Agent**:

   - Creates structured notes from documents
   - Configurable note styles (bullet, outline, paragraph)
   - Extracts key topics, formulas, and diagram references

2. **Researcher Agent**:
   - Performs deep analysis across multiple documents
   - Integrates web search for current information
   - Identifies themes, patterns, and knowledge gaps
   - Uses advanced models (Claude 3 Opus, GPT-4 Turbo)

#### Adding New Agents

1. Extend `baseAgent.js` for common functionality
2. Implement agent-specific logic (see `noteTakerAgent.js` as example)
3. Register in `agentOrchestrator.js`
4. Add configuration options to agent metadata

#### Web Search Integration

The researcher agent can search the internet for current information:

**Setup**: Configure one of the supported providers in `.env`:

- `TAVILY_API_KEY` - Recommended for AI research
- `SERPER_API_KEY` - Google search results
- `SERPAPI_KEY` - Multiple search engines

**Usage**: Enable in agent config:

```javascript
{
  "agentType": "researcher",
  "config": {
    "includeWebSearch": true,
    "specificQuestions": ["What are the latest developments?"]
  }
}
```

See `backend/WEB_SEARCH_SETUP.md` for detailed configuration instructions.
