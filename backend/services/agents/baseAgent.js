// const { StateGraph, END } = require("@langchain/langgraph");
const {
  BaseMessage,
  HumanMessage,
  AIMessage,
} = require("@langchain/core/messages");
// const { z } = require("zod");
const AgentTask = require("../../models/agentTask.model");

// Define the base state schema
// const BaseAgentState = z.object({
//   taskId: z.string(),
//   userId: z.string(),
//   courseInstanceId: z.string(),
//   files: z.array(z.any()),
//   processedContent: z
//     .array(
//       z.object({
//         fileName: z.string(),
//         content: z.string(),
//         metadata: z.any(),
//       })
//     )
//     .optional(),
//   context: z
//     .object({
//       totalWords: z.number(),
//       fileCount: z.number(),
//       chunks: z.array(z.string()),
//     })
//     .optional(),
//   result: z.any().optional(),
//   error: z.string().optional(),
//   currentStep: z.string(),
//   progress: z.number().default(0),
//   messages: z.array(z.any()).default([]),
//   mode: z.string().optional(),
//   model: z.string().optional(),
//   customSettings: z.object({}).optional(),
//   noteStyle: z.string().optional(),
//   summaryLength: z.number().optional(),
//   includeFormulas: z.boolean().optional(),
//   includeDiagramReferences: z.boolean().optional(),
// });

class BaseAgent {
  constructor(name, llmProvider) {
    this.name = name;
    this.llmProvider = llmProvider;
    this.graph = null;
    this.logger = console; // Can be replaced with winston logger
  }

  // Build the graph structure
  // buildGraph() {
  //   // Define state channels with proper reducers
  //   const channels = {
  //     taskId: {
  //       value: (x, y) => y ?? x,
  //     },
  //     userId: {
  //       value: (x, y) => y ?? x,
  //     },
  //     courseInstanceId: {
  //       value: (x, y) => y ?? x,
  //     },
  //     files: {
  //       value: (x, y) => y ?? x,
  //       default: () => [],
  //     },
  //     processedContent: {
  //       value: (x, y) => y ?? x,
  //       default: () => [],
  //     },
  //     context: {
  //       value: (x, y) => y ?? x,
  //       default: () => null,
  //     },
  //     result: {
  //       value: (x, y) => y ?? x,
  //       default: () => null,
  //     },
  //     error: {
  //       value: (x, y) => y ?? x,
  //       default: () => null,
  //     },
  //     currentStep: {
  //       value: (x, y) => y ?? x,
  //       default: () => "start",
  //     },
  //     progress: {
  //       value: (x, y) => y ?? x,
  //       default: () => 0,
  //     },
  //     messages: {
  //       value: (x, y) => y ?? x,
  //       default: () => [],
  //     },
  //     mode: {
  //       value: (x, y) => y ?? x,
  //     },
  //     model: {
  //       value: (x, y) => y ?? x,
  //     },
  //     customSettings: {
  //       value: (x, y) => y ?? x,
  //       default: () => ({}),
  //     },
  //     noteStyle: {
  //       value: (x, y) => y ?? x,
  //     },
  //     summaryLength: {
  //       value: (x, y) => y ?? x,
  //     },
  //     includeFormulas: {
  //       value: (x, y) => y ?? x,
  //     },
  //     includeDiagramReferences: {
  //       value: (x, y) => y ?? x,
  //     },
  //   };

  //   const workflow = new StateGraph({
  //     channels,
  //   });

  //   // Add nodes
  //   workflow.addNode("validateFiles", this.validateFiles.bind(this));
  //   workflow.addNode("processFiles", this.processFiles.bind(this));
  //   workflow.addNode("buildContext", this.buildContext.bind(this));
  //   workflow.addNode("processWithAI", this.processWithAI.bind(this));
  //   workflow.addNode("formatResult", this.formatResult.bind(this));
  //   workflow.addNode("persistState", this.persistState.bind(this));

  //   // Add edges
  //   workflow.addEdge("validateFiles", "processFiles");
  //   workflow.addEdge("processFiles", "buildContext");
  //   workflow.addEdge("buildContext", "processWithAI");
  //   workflow.addEdge("processWithAI", "formatResult");
  //   workflow.addEdge("formatResult", "persistState");
  //   workflow.addEdge("persistState", END);

  //   // Set entry point
  //   workflow.setEntryPoint("validateFiles");

  //   // Compile the graph
  //   this.graph = workflow.compile();
  // }

  // Node implementations (to be overridden by subclasses)
  async validateFiles(state) {
    // Ensure state.files exists
    const files = state.files || [];

    this.logger.info(`[${this.name}] Validating ${files.length} files`);
    await this.updateProgress(state.taskId, 10, "Validating files...");

    // Basic validation
    if (!files || files.length === 0) {
      throw new Error("No files provided");
    }

    return {
      ...state,
      files: files, // Ensure files is set in the state
      currentStep: "validateFiles",
      progress: 10,
    };
  }

  async processFiles(state) {
    this.logger.info(`[${this.name}] Processing files`);

    // Debug log the state.files structure
    this.logger.info(`[${this.name}] State files debug:`, {
      filesPresent: !!state.files,
      filesCount: state.files ? state.files.length : "undefined",
      firstFileKeys:
        state.files && state.files[0]
          ? Object.keys(state.files[0])
          : "no files",
    });

    await this.updateProgress(state.taskId, 20, "Processing files...");

    // Files should already be processed by the worker
    // Just format them for the agent
    const processedContent = state.files.map((f) => ({
      fileName: f.name || f.fileName,
      content: f.content,
      metadata: f.metadata || {},
      wordCount: f.wordCount || 0,
    }));

    return {
      ...state,
      processedContent,
      currentStep: "processFiles",
      progress: 30,
    };
  }

  async buildContext(state) {
    this.logger.info(`[${this.name}] Building context`);
    await this.updateProgress(state.taskId, 40, "Building context...");

    const validFiles = state.processedContent;
    const context = {
      fileCount: validFiles.length,
      totalWords: validFiles.reduce((sum, f) => sum + (f.wordCount || 0), 0),
      chunks: validFiles.flatMap((f) => f.chunks || [f.content]),
    };

    return {
      ...state,
      context,
      currentStep: "buildContext",
      progress: 50,
    };
  }

  // Abstract method - must be implemented by subclasses
  async processWithAI(state) {
    throw new Error("processWithAI must be implemented by subclass");
  }

  async formatResult(state) {
    this.logger.info(`[${this.name}] Formatting result`);
    await this.updateProgress(state.taskId, 90, "Formatting result...");

    return {
      ...state,
      currentStep: "formatResult",
      progress: 95,
    };
  }

  async persistState(state) {
    this.logger.info(`[${this.name}] Persisting final state`);
    await this.updateProgress(state.taskId, 100, "Complete");

    // Update MongoDB with final result
    await AgentTask.findByIdAndUpdate(state.taskId, {
      status: "completed",
      progress: 100,
      result: state.result,
      usage: {
        tokensUsed: state.tokensUsed || 0,
        cost: state.cost || 0,
      },
      completedAt: new Date(),
    });

    return {
      ...state,
      currentStep: "complete",
      progress: 100,
    };
  }

  // Helper methods
  async updateProgress(taskId, progress, message) {
    // Debug log
    this.logger.info(
      `[${this.name}] updateProgress called with taskId: "${taskId}", progress: ${progress}`
    );

    // Validate taskId
    if (!taskId || taskId === "") {
      this.logger.error(
        `[${this.name}] Invalid taskId for updateProgress: "${taskId}"`
      );
      return; // Skip update if taskId is invalid
    }

    try {
      await AgentTask.findByIdAndUpdate(taskId, {
        progress,
        workerMessage: message,
      });

      // Call the progress callback if set
      if (this.progressCallback) {
        await this.progressCallback(progress);
      }
    } catch (error) {
      this.logger.error(
        `[${this.name}] Failed to update progress:`,
        error.message
      );
    }
  }

  // Execute the agent
  async execute(initialState) {
    try {
      // Log the initial state for debugging
      this.logger.info(`[${this.name}] Initial state:`, {
        taskId: initialState.taskId,
        filesCount: initialState.files
          ? initialState.files.length
          : "undefined",
        filesPresent: !!initialState.files,
        stateKeys: Object.keys(initialState),
      });

      // Execute the workflow steps directly without LangGraph
      let state = { ...initialState };

      // Step 1: Validate files
      state = await this.validateFiles(state);

      // Step 2: Process files
      state = await this.processFiles(state);

      // Step 3: Build context
      state = await this.buildContext(state);

      // Step 4: Process with AI
      state = await this.processWithAI(state);

      // Step 5: Format result
      state = await this.formatResult(state);

      // Step 6: Persist state
      state = await this.persistState(state);

      // Debug the result state
      this.logger.info(`[${this.name}] Final state:`, {
        taskId: state.taskId,
        filesCount: state.files ? state.files.length : "undefined",
        filesPresent: !!state.files,
        resultPresent: !!state.result,
        error: state.error,
      });

      return state;
    } catch (error) {
      this.logger.error(`[${this.name}] Execution error:`, error);

      if (initialState.taskId && initialState.taskId !== "") {
        await AgentTask.findByIdAndUpdate(initialState.taskId, {
          status: "failed",
          error: error.message,
          completedAt: new Date(),
        });
      }

      throw error;
    }
  }
}

module.exports = BaseAgent;
