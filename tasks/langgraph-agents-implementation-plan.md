# LangGraph AI Agents Implementation Plan

## Overview

This plan outlines how to implement our AI agents using LangGraph.js, integrating with our existing infrastructure (Convex, Bull Queue, File Processing).

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Bull Queue    │────►│  LangGraph   │────►│   AI Providers  │
│   (Job Entry)   │     │    Agent     │     │ (OpenAI/Claude) │
└─────────────────┘     └──────────────┘     └─────────────────┘
         │                      │                       │
         │                      ▼                       │
         │              ┌──────────────┐               │
         └─────────────►│    Convex    │◄──────────────┘
                        │  (Real-time) │
                        └──────────────┘
```

## LangGraph Agent Structure

Each agent will be implemented as a LangGraph workflow with these common nodes:

1. **File Processing Node**: Validate and extract content
2. **Context Building Node**: Prepare data for AI
3. **AI Processing Node**: Core agent logic
4. **Result Formatting Node**: Structure output
5. **State Persistence Node**: Save progress to Convex

## Implementation Steps

### Step 1: Install Dependencies

```bash
cd backend
npm install @langchain/langgraph @langchain/core @langchain/openai @langchain/anthropic
npm install @langchain/community zod
```

### Step 2: Create Base Agent Class

**File**: `backend/services/agents/baseAgent.js`

```javascript
const { StateGraph, END } = require("@langchain/langgraph");
const { BaseMessage, HumanMessage, AIMessage } = require("@langchain/core/messages");
const { z } = require("zod");
const convexService = require("../convexService");
const logger = require("../../utils/logger");

// Define the base state schema
const BaseAgentState = z.object({
  taskId: z.string(),
  userId: z.string(),
  courseInstanceId: z.string(),
  files: z.array(z.any()),
  processedContent: z.array(z.object({
    fileName: z.string(),
    content: z.string(),
    metadata: z.any()
  })).optional(),
  context: z.object({
    totalWords: z.number(),
    fileCount: z.number(),
    chunks: z.array(z.string())
  }).optional(),
  result: z.any().optional(),
  error: z.string().optional(),
  currentStep: z.string(),
  progress: z.number().default(0),
  messages: z.array(z.any()).default([])
});

class BaseAgent {
  constructor(name, llmProvider) {
    this.name = name;
    this.llmProvider = llmProvider;
    this.graph = null;
    this.checkpointer = null;
  }

  // Build the graph structure
  buildGraph() {
    const workflow = new StateGraph({
      channels: BaseAgentState
    });

    // Add nodes
    workflow.addNode("validateFiles", this.validateFiles.bind(this));
    workflow.addNode("processFiles", this.processFiles.bind(this));
    workflow.addNode("buildContext", this.buildContext.bind(this));
    workflow.addNode("processWithAI", this.processWithAI.bind(this));
    workflow.addNode("formatResult", this.formatResult.bind(this));
    workflow.addNode("persistState", this.persistState.bind(this));

    // Add edges
    workflow.addEdge("validateFiles", "processFiles");
    workflow.addEdge("processFiles", "buildContext");
    workflow.addEdge("buildContext", "processWithAI");
    workflow.addEdge("processWithAI", "formatResult");
    workflow.addEdge("formatResult", "persistState");
    workflow.addEdge("persistState", END);

    // Set entry point
    workflow.setEntryPoint("validateFiles");

    // Compile the graph
    this.graph = workflow.compile();
  }

  // Node implementations (to be overridden by subclasses)
  async validateFiles(state) {
    logger.info(`[${this.name}] Validating ${state.files.length} files`);
    await this.updateProgress(state.taskId, 10, "Validating files...");
    
    // Basic validation
    if (!state.files || state.files.length === 0) {
      throw new Error("No files provided");
    }
    
    return {
      ...state,
      currentStep: "validateFiles",
      progress: 10
    };
  }

  async processFiles(state) {
    logger.info(`[${this.name}] Processing files`);
    await this.updateProgress(state.taskId, 20, "Processing files...");
    
    // This uses our existing file processing service
    const fileProcessingService = require("../fileProcessingService");
    const result = await fileProcessingService.processFiles(state.files);
    
    return {
      ...state,
      processedContent: result.files.filter(f => !f.error),
      currentStep: "processFiles",
      progress: 30
    };
  }

  async buildContext(state) {
    logger.info(`[${this.name}] Building context`);
    await this.updateProgress(state.taskId, 40, "Building context...");
    
    const validFiles = state.processedContent;
    const context = {
      fileCount: validFiles.length,
      totalWords: validFiles.reduce((sum, f) => sum + (f.wordCount || 0), 0),
      chunks: validFiles.flatMap(f => f.chunks || [f.content])
    };
    
    return {
      ...state,
      context,
      currentStep: "buildContext",
      progress: 50
    };
  }

  // Abstract method - must be implemented by subclasses
  async processWithAI(state) {
    throw new Error("processWithAI must be implemented by subclass");
  }

  async formatResult(state) {
    logger.info(`[${this.name}] Formatting result`);
    await this.updateProgress(state.taskId, 90, "Formatting result...");
    
    return {
      ...state,
      currentStep: "formatResult",
      progress: 95
    };
  }

  async persistState(state) {
    logger.info(`[${this.name}] Persisting final state`);
    await this.updateProgress(state.taskId, 100, "Complete");
    
    // Update Convex with final result
    await convexService.updateTaskStatus({
      taskId: state.taskId,
      status: "completed",
      progress: 100,
      result: state.result,
      usage: {
        tokensUsed: state.tokensUsed || 0,
        cost: state.cost || 0
      }
    });
    
    return {
      ...state,
      currentStep: "complete",
      progress: 100
    };
  }

  // Helper methods
  async updateProgress(taskId, progress, message) {
    await convexService.updateTaskStatus({
      taskId,
      progress,
      message
    });
  }

  // Execute the agent
  async execute(initialState) {
    if (!this.graph) {
      this.buildGraph();
    }

    try {
      const result = await this.graph.invoke(initialState);
      return result;
    } catch (error) {
      logger.error(`[${this.name}] Execution error:`, error);
      await convexService.updateTaskStatus({
        taskId: initialState.taskId,
        status: "failed",
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = BaseAgent;
```

### Step 3: Implement Note Taker Agent

**File**: `backend/services/agents/noteTakerAgent.js`

```javascript
const BaseAgent = require("./baseAgent");
const { ChatOpenAI } = require("@langchain/openai");
const { ChatAnthropic } = require("@langchain/anthropic");
const { z } = require("zod");
const { PromptTemplate } = require("@langchain/core/prompts");

// Extended state for Note Taker
const NoteTakerState = z.object({
  noteStyle: z.enum(["bullet", "outline", "paragraph"]).default("bullet"),
  summaryLength: z.enum(["brief", "moderate", "detailed"]).default("moderate"),
  includeFormulas: z.boolean().default(true),
  keyTopics: z.array(z.string()).optional(),
  notes: z.string().optional()
});

class NoteTakerAgent extends BaseAgent {
  constructor(llmProvider = "openai") {
    super("NoteTakerAgent", llmProvider);
    
    // Initialize LLM based on provider
    if (llmProvider === "anthropic") {
      this.llm = new ChatAnthropic({
        modelName: "claude-3-opus-20240229",
        temperature: 0.3,
        maxTokens: 4000
      });
    } else {
      this.llm = new ChatOpenAI({
        modelName: "gpt-4-turbo-preview",
        temperature: 0.3,
        maxTokens: 4000
      });
    }
  }

  async processWithAI(state) {
    this.logger.info(`[NoteTakerAgent] Processing with AI`);
    await this.updateProgress(state.taskId, 60, "Generating notes...");

    const promptTemplate = PromptTemplate.fromTemplate(`
You are an expert academic note-taker. Extract and organize key information from the provided documents.

Context:
- Number of documents: {fileCount}
- Total words: {totalWords}
- Note style: {noteStyle}
- Summary length: {summaryLength}
- Include formulas: {includeFormulas}

Documents Content:
{content}

Instructions:
1. Extract main topics, concepts, and key points
2. Organize information in {noteStyle} format
3. Create a {summaryLength} summary
4. {formulaInstruction}
5. Identify and list key topics separately
6. Maintain academic accuracy and clarity

Format your response as:
# Summary
[Your summary here]

# Key Topics
- Topic 1
- Topic 2
...

# Detailed Notes
[Your organized notes here]
`);

    const prompt = await promptTemplate.format({
      fileCount: state.context.fileCount,
      totalWords: state.context.totalWords,
      noteStyle: state.noteStyle || "bullet",
      summaryLength: state.summaryLength || "moderate",
      includeFormulas: state.includeFormulas ? "yes" : "no",
      formulaInstruction: state.includeFormulas 
        ? "Preserve all mathematical formulas and equations"
        : "Focus on conceptual understanding without formulas",
      content: state.context.chunks.slice(0, 10).join("\n\n---\n\n") // Limit context
    });

    const response = await this.llm.invoke(prompt);
    const notes = response.content;

    // Extract key topics using regex
    const keyTopicsMatch = notes.match(/# Key Topics\n([\s\S]*?)(?=\n#|$)/);
    const keyTopics = keyTopicsMatch 
      ? keyTopicsMatch[1].split("\n").filter(line => line.trim().startsWith("-"))
          .map(line => line.replace(/^-\s*/, "").trim())
      : [];

    return {
      ...state,
      notes,
      keyTopics,
      result: {
        content: notes,
        format: "markdown",
        metadata: {
          agentType: "note-taker",
          noteStyle: state.noteStyle,
          summaryLength: state.summaryLength,
          keyTopics,
          processedFiles: state.context.fileCount,
          totalWords: state.context.totalWords
        }
      },
      tokensUsed: response.usage?.totalTokens || 0,
      cost: this.calculateCost(response.usage?.totalTokens || 0),
      currentStep: "processWithAI",
      progress: 80
    };
  }

  calculateCost(tokens) {
    // Rough cost estimation
    const costPer1kTokens = this.llmProvider === "anthropic" ? 0.015 : 0.01;
    return (tokens / 1000) * costPer1kTokens;
  }
}

module.exports = NoteTakerAgent;
```

### Step 4: Create Agent Orchestrator

**File**: `backend/services/agents/agentOrchestrator.js`

```javascript
const NoteTakerAgent = require("./noteTakerAgent");
const ResearcherAgent = require("./researcherAgent");
const StudyBuddyAgent = require("./studyBuddyAgent");
const AssignmentAgent = require("./assignmentAgent");
const logger = require("../../utils/logger");

class AgentOrchestrator {
  constructor() {
    this.agents = {
      "note-taker": NoteTakerAgent,
      "researcher": ResearcherAgent,
      "study-buddy": StudyBuddyAgent,
      "assignment": AssignmentAgent
    };
  }

  async processTask({ taskId, userId, courseInstanceId, agentType, config, files, progressCallback }) {
    logger.info(`[AgentOrchestrator] Processing task ${taskId} with agent ${agentType}`);

    // Get the appropriate agent class
    const AgentClass = this.agents[agentType];
    if (!AgentClass) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    // Determine LLM provider based on config or default
    const llmProvider = config.llmProvider || process.env.DEFAULT_LLM_PROVIDER || "openai";
    
    // Create agent instance
    const agent = new AgentClass(llmProvider);

    // Prepare initial state
    const initialState = {
      taskId,
      userId,
      courseInstanceId,
      files,
      currentStep: "start",
      progress: 0,
      messages: [],
      ...config // Merge agent-specific config
    };

    // Set up progress tracking
    if (progressCallback) {
      agent.progressCallback = progressCallback;
    }

    // Execute the agent workflow
    const result = await agent.execute(initialState);

    logger.info(`[AgentOrchestrator] Task ${taskId} completed successfully`);

    return {
      content: result.result.content,
      format: result.result.format,
      metadata: result.result.metadata,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
      model: llmProvider
    };
  }

  // Get available agents and their configurations
  getAvailableAgents() {
    return {
      "note-taker": {
        name: "Note Taker",
        description: "Extracts and organizes key information from documents",
        configOptions: {
          noteStyle: ["bullet", "outline", "paragraph"],
          summaryLength: ["brief", "moderate", "detailed"],
          includeFormulas: true
        }
      },
      "researcher": {
        name: "Researcher",
        description: "Analyzes multiple documents for research insights",
        configOptions: {
          analysisDepth: ["quick", "moderate", "deep"],
          compareSources: true,
          extractCitations: true
        }
      },
      "study-buddy": {
        name: "Study Buddy",
        description: "Creates study materials and practice questions",
        configOptions: {
          materialTypes: ["flashcards", "quiz", "summary"],
          difficulty: ["easy", "medium", "hard"],
          questionCount: 20
        }
      },
      "assignment": {
        name: "Assignment Assistant",
        description: "Helps plan and structure assignments",
        configOptions: {
          assignmentType: ["essay", "report", "presentation"],
          includeOutline: true,
          suggestThesis: true,
          citationStyle: ["APA", "MLA", "Chicago"]
        }
      }
    };
  }
}

module.exports = new AgentOrchestrator();
```

### Step 5: Update Worker to Use LangGraph Agents

**File**: `backend/services/workers/agentTaskWorker.js` (Update the processWithAI method)

```javascript
// Replace the placeholder processWithAI method with:

const agentOrchestrator = require('../agents/agentOrchestrator');

async executeAgentWithProgress(agentType, context, config, taskId, job) {
  // Update progress callback for AI processing
  const progressCallback = async (progress, message) => {
    const actualProgress = 40 + Math.round(progress * 0.5); // 40-90%
    await job.progress(actualProgress);
    await this.updateConvexStatus(taskId, {
      progress: actualProgress,
      message
    });
  };

  // Execute AI agent with LangGraph
  const result = await agentOrchestrator.processTask({
    taskId,
    userId: job.data.userId,
    courseInstanceId: job.data.courseInstanceId,
    agentType,
    config,
    files: context.files,
    progressCallback
  });

  await job.progress(90);
  return result;
}
```

## Benefits of LangGraph Architecture

1. **State Management**: Each node in the graph maintains state, perfect for tracking progress
2. **Resumability**: If a task fails, we can resume from the last checkpoint
3. **Modularity**: Each processing step is a separate node, easy to test and modify
4. **Streaming**: Real-time updates as each node completes
5. **Flexibility**: Easy to add new nodes or modify the workflow

## Next Steps

1. **Implement Remaining Agents**:
   - ResearcherAgent (cross-document analysis)
   - StudyBuddyAgent (flashcards, quizzes)
   - AssignmentAgent (outlines, thesis)

2. **Add Advanced Features**:
   - Checkpointing for long-running tasks
   - Human-in-the-loop for sensitive operations
   - Parallel processing for multiple files

3. **Testing Strategy**:
   - Unit tests for each node
   - Integration tests for full workflows
   - Performance tests with large documents

4. **Monitoring**:
   - Track node execution times
   - Monitor token usage per agent
   - Log workflow paths for debugging

## Example Usage

```javascript
// In the Bull queue worker
const agentOrchestrator = require('./agents/agentOrchestrator');

// Process a note-taking task
const result = await agentOrchestrator.processTask({
  taskId: "task_123",
  userId: "user_456",
  courseInstanceId: "course_789",
  agentType: "note-taker",
  config: {
    noteStyle: "bullet",
    summaryLength: "moderate",
    includeFormulas: true
  },
  files: processedFiles,
  progressCallback: (progress, message) => {
    console.log(`Progress: ${progress}% - ${message}`);
  }
});
```

This architecture provides a robust, scalable foundation for our AI agents while maintaining compatibility with our existing infrastructure.