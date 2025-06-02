const { StateGraph, END } = require("@langchain/langgraph");
const { BaseMessage, HumanMessage, AIMessage } = require("@langchain/core/messages");
const { z } = require("zod");
const convexService = require("../convexService");

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
    this.logger = console; // Can be replaced with winston logger
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
    this.logger.info(`[${this.name}] Validating ${state.files.length} files`);
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
    this.logger.info(`[${this.name}] Processing files`);
    await this.updateProgress(state.taskId, 20, "Processing files...");
    
    // Files should already be processed by the worker
    // Just format them for the agent
    const processedContent = state.files.map(f => ({
      fileName: f.name || f.fileName,
      content: f.content,
      metadata: f.metadata || {},
      wordCount: f.wordCount || 0
    }));
    
    return {
      ...state,
      processedContent,
      currentStep: "processFiles",
      progress: 30
    };
  }

  async buildContext(state) {
    this.logger.info(`[${this.name}] Building context`);
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
    this.logger.info(`[${this.name}] Formatting result`);
    await this.updateProgress(state.taskId, 90, "Formatting result...");
    
    return {
      ...state,
      currentStep: "formatResult",
      progress: 95
    };
  }

  async persistState(state) {
    this.logger.info(`[${this.name}] Persisting final state`);
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
      this.logger.error(`[${this.name}] Execution error:`, error);
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