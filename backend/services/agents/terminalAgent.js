const BaseAgent = require("./baseAgent.js");
const { tool } = require("@langchain/core/tools");
const { z } = require("zod");

/**
 * Terminal Agent - Secure AI assistant for the terminal interface
 * Extends BaseAgent with file context capabilities and security restrictions
 */
class TerminalAgent extends BaseAgent {
  constructor(config = {}) {
    // Terminal-specific base prompt that will be added to the style prompt
    const terminalBasePrompt = `

You are integrated into HomeBase Terminal and have access to web search capabilities.

IMPORTANT SECURITY GUIDELINES:
- You cannot execute code or modify files
- You cannot access system commands or file paths
- You provide helpful, accurate information based on the context provided
- You maintain academic integrity and do not complete assignments for users
- You help users learn and understand concepts

When files are attached, analyze them carefully and provide insights based on their content.`;

    // Override with terminal-specific configuration
    super({
      ...config,
      modelName: config.modelName || "claude-3-5-sonnet-latest",
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4096,
      responseStyle: config.responseStyle || "normal",
      // Don't set systemPrompt here - let baseAgent handle it based on responseStyle
      enableMemory: true, // Enable memory to maintain conversation context
      enableMemoryOptimization: true, // Enable memory optimization for better performance
      memoryConfig: {
        maxTokens: 50000, // Allow more tokens for file context
      },
    });

    // Append terminal-specific guidelines to the style-based prompt
    this.config.systemPrompt += terminalBasePrompt;

    // Add terminal-specific tools
    this.tools = [...this.tools, ...this.createTerminalTools()];

    // Recreate agent with new tools and updated system prompt
    this.agent = this.createAgent();
  }

  /**
   * Create terminal-specific tools - (No tools needed for now)
   */
  createTerminalTools() {
    return [];
  }

  /**
   * Process a message with optional file context and conversation thread
   */
  async processMessage(message, attachedFiles = [], options = {}) {
    try {
      const { threadId, imageData } = options;
      const sanitizedMessage = this.sanitizeInput(message);

      let fullPrompt;
      const userContent = [{ type: "text", text: sanitizedMessage }];

      // If image data is provided, add it to the content
      if (imageData && imageData.base64) {
        console.log(
          `[TerminalAgent] Adding image data to prompt (${imageData.mimeType})`
        );
        userContent.push({
          type: "image_url",
          image_url: {
            url: `data:${imageData.mimeType};base64,${imageData.base64}`,
          },
        });
      } else if (attachedFiles.length > 0) {
        // Fallback for text-based files
        const fileContext = this.buildFileContext(attachedFiles);
        if (fileContext) {
          const contextIntro = `\n\n--- CONTEXT FROM ATTACHED FILES ---\n`;
          userContent.push({ type: "text", text: contextIntro + fileContext });
        }
      }

      fullPrompt = {
        messages: [{ role: "user", content: userContent }],
      };

      // Invoke the agent
      const response = await this.invoke(fullPrompt, { threadId });

      return {
        success: true,
        content: response.content,
        metadata: {
          model: this.config.modelName,
          filesProcessed: attachedFiles.length,
          timestamp: new Date().toISOString(),
          threadId: options.threadId,
        },
      };
    } catch (error) {
      console.error("[TerminalAgent] Error processing message:", error);
      return {
        success: false,
        error: error.message || "Failed to process message",
        content:
          "I apologize, but I encountered an error processing your request. Please try again.",
      };
    }
  }

  /**
   * Sanitize user input to prevent prompt injection
   */
  sanitizeInput(input) {
    // Remove potential injection patterns
    const dangerousPatterns = [
      /ignore previous instructions/gi,
      /disregard all prior/gi,
      /forget everything/gi,
      /system prompt/gi,
      /admin mode/gi,
      /sudo/gi,
      /execute code/gi,
      /run command/gi,
    ];

    let sanitized = input;
    for (const pattern of dangerousPatterns) {
      sanitized = sanitized.replace(pattern, "[BLOCKED]");
    }

    // Limit length to prevent DoS
    const MAX_LENGTH = 2000;
    if (sanitized.length > MAX_LENGTH) {
      sanitized = sanitized.substring(0, MAX_LENGTH) + "... [truncated]";
    }

    return sanitized;
  }

  /**
   * Build context from attached files with token optimization
   */
  buildFileContext(attachedFiles) {
    // Use token optimizer if available
    if (!this.tokenOptimizer) {
      // Fallback to character-based limits
      return this.buildFileContextLegacy(attachedFiles);
    }

    // Calculate available tokens for file context
    const tokenBudget = this.tokenOptimizer.calculateTokenBudget();
    const maxFileTokens = Math.floor(tokenBudget.currentInput * 0.7); // Use 70% of input budget for files

    let context = "\n\n--- ATTACHED FILES ---\n";
    let totalTokens = this.tokenOptimizer.estimateTokens(context);

    // Sort files by importance (could be enhanced with relevance scoring)
    // Filter files that have content (processed files from controller won't have 'processed' flag)
    const sortedFiles = attachedFiles.filter((f) => f.content);

    for (const file of sortedFiles) {
      const fileHeader = `\n\nFile: ${file.fileName} (${file.mimeType})\n`;
      const headerTokens = this.tokenOptimizer.estimateTokens(fileHeader);

      // Check if we have room for at least the header
      if (totalTokens + headerTokens > maxFileTokens) {
        context += "\n[Additional files truncated due to token limits]";
        break;
      }

      // Calculate remaining tokens for content
      const remainingTokens = maxFileTokens - totalTokens - headerTokens;

      // Truncate file content to fit token limit
      let fileContent = this.tokenOptimizer.truncateToTokenLimit(
        file.content,
        remainingTokens,
        true // Add ellipsis if truncated
      );

      context += fileHeader + fileContent;
      totalTokens +=
        headerTokens + this.tokenOptimizer.estimateTokens(fileContent);
    }

    // Log token usage in debug mode
    if (this.config.debug) {
      console.log(
        `[TerminalAgent] File context: ~${totalTokens} tokens (budget: ${maxFileTokens})`
      );
    }

    return context;
  }

  /**
   * Legacy character-based file context building
   */
  buildFileContextLegacy(attachedFiles) {
    const MAX_CONTEXT_LENGTH = 50000;
    let context = "\n\n--- ATTACHED FILES ---\n";
    let totalLength = 0;

    for (const file of attachedFiles) {
      // Check if file has content (processed files from controller won't have 'processed' flag)
      if (!file.content) continue;

      const fileHeader = `\n\nFile: ${file.fileName} (${file.mimeType})\n`;
      const remainingSpace =
        MAX_CONTEXT_LENGTH - totalLength - fileHeader.length;

      if (remainingSpace <= 0) {
        context += "\n[Additional files truncated due to length limits]";
        break;
      }

      let fileContent = file.content;
      if (fileContent.length > remainingSpace) {
        fileContent =
          fileContent.substring(0, remainingSpace) + "\n[Content truncated]";
      }

      context += fileHeader + fileContent;
      totalLength += fileHeader.length + fileContent.length;
    }

    return context;
  }

  /**
   * Construct the full prompt with context
   */
  constructPrompt(message, fileContext) {
    if (fileContext) {
      return `User Question: ${message}`;
    }
    return message;
  }
}

// Export factory function
function createTerminalAgent(config = {}) {
  return new TerminalAgent(config);
}

module.exports = {
  TerminalAgent,
  createTerminalAgent,
};
