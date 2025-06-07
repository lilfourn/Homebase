const { ChatAnthropic } = require("@langchain/anthropic");
const { tool } = require("@langchain/core/tools");
const { MemorySaver } = require("@langchain/langgraph");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { z } = require("zod");
const webSearchService = require("../webSearchServiceImpl.js");
const { getSystemPromptForStyle } = require("../../config/responseStyles.js");

/**
 * Base Agent Class - Foundation for all AI agents in the system
 * Provides web search and content extraction capabilities
 */
class BaseAgent {
  constructor(config = {}) {
    // Default configuration
    this.config = {
      modelName: "claude-3-5-sonnet-latest",
      temperature: 0.5,
      maxTokens: 4096,
      responseStyle: "normal",
      systemPrompt: null, // Will be set based on responseStyle
      enableMemory: true, // Enable LangGraph memory by default
      ...config,
    };

    // Set system prompt based on response style if not explicitly provided
    if (!this.config.systemPrompt) {
      this.config.systemPrompt = getSystemPromptForStyle(
        this.config.responseStyle
      );
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }

    // Initialize the model
    this.model = new ChatAnthropic({
      model: this.config.modelName,
      apiKey: process.env.ANTHROPIC_API_KEY,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });

    // Initialize memory if enabled
    this.memory = this.config.enableMemory ? new MemorySaver() : null;

    // Define base tools
    this.tools = this.createBaseTools();

    // Add any custom tools passed in config
    if (this.config.customTools) {
      this.tools = [...this.tools, ...this.config.customTools];
    }

    // Create the agent
    this.agent = this.createAgent();
  }

  /**
   * Create base tools available to all agents
   */
  createBaseTools() {
    const tools = [];

    // Web Search Tool - for finding relevant URLs
    const webSearchTool = tool(
      async ({ query, options = {} }) => {
        try {
          console.log(`[BaseAgent] Searching web for: ${query}`);

          const searchResults = await webSearchService.searchForUrls(query, {
            num: options.maxResults || 5,
            ...options,
          });

          if (!searchResults.success) {
            return `Search failed: ${searchResults.error}`;
          }

          if (searchResults.results.length === 0) {
            return "No search results found.";
          }

          // Format results for the agent
          const formattedResults = searchResults.results
            .map(
              (result, index) =>
                `${index + 1}. ${result.title}\n   URL: ${result.url}\n   ${result.snippet}`
            )
            .join("\n\n");

          return `Found ${searchResults.results.length} results:\n\n${formattedResults}`;
        } catch (error) {
          console.error("[BaseAgent] Web search error:", error);
          return `Error performing web search: ${error.message}`;
        }
      },
      {
        name: "webSearch",
        description:
          "Search the web for information. Returns URLs and snippets.",
        schema: z.object({
          query: z.string().describe("The search query"),
          options: z
            .object({
              maxResults: z
                .number()
                .optional()
                .describe("Maximum number of results (default: 5)"),
              language: z
                .string()
                .optional()
                .describe("Language code (e.g., 'en')"),
              region: z
                .string()
                .optional()
                .describe("Region code (e.g., 'us')"),
            })
            .optional(),
        }),
      }
    );

    // Content Extraction Tool - for getting detailed content from URLs
    const extractContentTool = tool(
      async ({ urls, query = "", options = {} }) => {
        try {
          console.log(
            `[BaseAgent] Extracting content from ${urls.length} URLs`
          );

          // Ensure urls is an array
          const urlArray = Array.isArray(urls) ? urls : [urls];

          const extractedContent =
            await webSearchService.extractContentFromUrls(urlArray, query, {
              depth: options.depth || "advanced",
              ...options,
            });

          if (!extractedContent.success) {
            return `Content extraction failed: ${extractedContent.error}`;
          }

          if (
            !extractedContent.extractedContent ||
            extractedContent.extractedContent.length === 0
          ) {
            return "No content could be extracted from the provided URLs.";
          }

          // Format extracted content
          const formattedContent = extractedContent.extractedContent
            .map(
              (item) =>
                `Source: ${item.url}\nTitle: ${item.title || "N/A"}\n\nContent:\n${item.content || item.snippet || "No content available"}`
            )
            .join("\n\n---\n\n");

          return formattedContent;
        } catch (error) {
          console.error("[BaseAgent] Content extraction error:", error);
          return `Error extracting content: ${error.message}`;
        }
      },
      {
        name: "extractContent",
        description: "Extract detailed content from one or more URLs.",
        schema: z.object({
          urls: z.union([
            z.string().describe("Single URL to extract content from"),
            z
              .array(z.string())
              .describe("Array of URLs to extract content from"),
          ]),
          query: z
            .string()
            .optional()
            .describe("Optional context query for better extraction"),
          options: z
            .object({
              depth: z
                .enum(["basic", "advanced"])
                .optional()
                .describe("Extraction depth"),
              includeImages: z
                .boolean()
                .optional()
                .describe("Include image URLs"),
              includeTables: z
                .boolean()
                .optional()
                .describe("Include table data"),
            })
            .optional(),
        }),
      }
    );

    // Combined Search and Extract Tool - for convenient one-step research
    const searchAndExtractTool = tool(
      async ({ query, options = {} }) => {
        try {
          console.log(`[BaseAgent] Searching and extracting for: ${query}`);

          const results = await webSearchService.searchAndExtract(query, {
            extractCount: options.extractCount || 3,
            searchNum: options.searchNum || 5,
            ...options,
          });

          if (!results.success) {
            return `Search and extract failed: ${results.error || "Unknown error"}`;
          }

          // If we have a direct answer from Tavily
          let response = "";
          if (results.answer) {
            response += `Summary Answer:\n${results.answer}\n\n`;
          }

          // Add search results
          if (results.searchResults && results.searchResults.length > 0) {
            response += `Search Results (${results.searchResults.length} found):\n`;
            results.searchResults.forEach((result, index) => {
              response += `${index + 1}. ${result.title} - ${result.url}\n`;
            });
            response += "\n";
          }

          // Add extracted content if available
          if (results.extractedContent && results.extractedContent.length > 0) {
            response += `\nDetailed Content from ${results.extractedContent.length} sources:\n\n`;
            results.extractedContent.forEach((item, index) => {
              response += `Source ${index + 1}: ${item.url}\n`;
              response += `Title: ${item.title || "N/A"}\n`;
              response += `Content: ${item.content || item.snippet || "No content available"}\n\n`;
            });
          }

          return response || "No results found.";
        } catch (error) {
          console.error("[BaseAgent] Search and extract error:", error);
          return `Error performing search and extract: ${error.message}`;
        }
      },
      {
        name: "searchAndExtract",
        description:
          "Search the web and automatically extract content from the top results in one step.",
        schema: z.object({
          query: z.string().describe("The search query"),
          options: z
            .object({
              searchNum: z
                .number()
                .optional()
                .describe("Number of search results to return (default: 5)"),
              extractCount: z
                .number()
                .optional()
                .describe(
                  "Number of top results to extract content from (default: 3)"
                ),
              depth: z
                .enum(["basic", "advanced"])
                .optional()
                .describe("Extraction depth"),
            })
            .optional(),
        }),
      }
    );

    // Only add tools if web search service is available
    if (webSearchService.isAvailable()) {
      tools.push(webSearchTool, extractContentTool, searchAndExtractTool);
    } else {
      console.warn(
        "[BaseAgent] Web search service is not available. Web search tools will not be added."
      );
    }

    return tools;
  }

  /**
   * Create the agent with tools and configuration
   */
  createAgent() {
    const agentConfig = {
      llm: this.model,
      tools: this.tools,
    };

    // Add system prompt if provided
    let systemPrompt = this.config.systemPrompt;
    if (systemPrompt) {
      agentConfig.stateModifier = systemPrompt;
    }

    // Add custom state schema if provided
    if (this.config.stateSchema) {
      agentConfig.stateSchema = this.config.stateSchema;
    }

    // Add memory checkpointer if enabled
    if (this.memory) {
      agentConfig.checkpointer = this.memory;
    }

    // Create and return the agent
    return createReactAgent(agentConfig);
  }

  /**
   * Invoke the agent with messages
   * @param {Object} input - Input object containing messages
   * @param {Object} options - Optional configuration for the invocation
   */
  async invoke(input, options = {}) {
    try {
      // Ensure input has the correct format with memory optimization
      const formattedInput = await this.formatInput(input);

      // Add any runtime configuration
      const invokeOptions = {
        ...options,
        configurable: {
          ...options.configurable,
          // Add thread_id for memory if enabled
          ...(this.memory && options.threadId
            ? { thread_id: options.threadId }
            : {}),
        },
      };

      // Invoke the agent
      const result = await this.agent.invoke(formattedInput, invokeOptions);

      return this.formatOutput(result);
    } catch (error) {
      console.error("[BaseAgent] Invocation error:", error);
      throw error;
    }
  }

  /**
   * Stream the agent's response
   * @param {Object} input - Input object containing messages
   * @param {Object} options - Optional configuration for streaming
   */
  async *stream(input, options = {}) {
    try {
      const formattedInput = await this.formatInput(input);

      const streamOptions = {
        ...options,
        streamMode: options.streamMode || "values",
        configurable: {
          ...options.configurable,
          ...(this.memory && options.threadId
            ? { thread_id: options.threadId }
            : {}),
        },
      };

      const stream = await this.agent.stream(formattedInput, streamOptions);

      for await (const chunk of stream) {
        yield this.formatStreamChunk(chunk);
      }
    } catch (error) {
      console.error("[BaseAgent] Streaming error:", error);
      throw error;
    }
  }

  /**
   * Format input for the agent with memory optimization
   */
  async formatInput(input) {
    // Handle null or undefined input
    if (input === null || input === undefined) {
      throw new Error("Input cannot be null or undefined");
    }

    let formattedInput;

    // If input is already properly formatted
    if (input.messages) {
      formattedInput = input;
    }
    // If input is a string, convert to message format
    else if (typeof input === "string") {
      formattedInput = {
        messages: [{ role: "user", content: input }],
      };
    }
    // If input is an array of messages, wrap it
    else if (Array.isArray(input)) {
      formattedInput = { messages: input };
    }
    // If input is a single message object with role and content
    else if (input.role && input.content) {
      formattedInput = {
        messages: [input],
      };
    }
    // Otherwise, throw an error for invalid input
    else {
      throw new Error(
        "Invalid input format. Expected string, message object, or messages array."
      );
    }

    return formattedInput;
  }

  /**
   * Format output from the agent
   */
  formatOutput(result) {
    // Extract the last message if available
    if (result.messages && result.messages.length > 0) {
      const lastMessage = result.messages[result.messages.length - 1];

      return {
        content: lastMessage.content || "",
        messages: result.messages,
        toolCalls: lastMessage.tool_calls || [],
        raw: result,
      };
    }

    return result;
  }

  /**
   * Format streaming chunks
   */
  formatStreamChunk(chunk) {
    if (chunk.messages) {
      const lastMessage = chunk.messages[chunk.messages.length - 1];
      return {
        content: lastMessage.content || "",
        toolCalls: lastMessage.tool_calls || [],
        messages: chunk.messages,
      };
    }
    return chunk;
  }

  /**
   * Add custom tools to the agent
   * @param {Array} tools - Array of LangChain tools
   */
  addTools(tools) {
    this.tools = [...this.tools, ...tools];
    // Recreate the agent with new tools
    this.agent = this.createAgent();
  }

  /**
   * Update agent configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };

    // Update system prompt if response style changed
    if (newConfig.responseStyle && !newConfig.systemPrompt) {
      this.config.systemPrompt = getSystemPromptForStyle(
        newConfig.responseStyle
      );
    }

    // Recreate model if model config changed
    if (newConfig.modelName || newConfig.temperature || newConfig.maxTokens) {
      this.model = new ChatAnthropic({
        model: this.config.modelName,
        apiKey: process.env.ANTHROPIC_API_KEY,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      });
    }

    // Recreate agent with new config
    this.agent = this.createAgent();
  }

  /**
   * Get available tools
   */
  getTools() {
    return this.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
    }));
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Create LangChain message objects from generic message format
   */
  createLangChainMessage(msg) {
    const {
      HumanMessage,
      AIMessage,
      SystemMessage,
    } = require("@langchain/core/messages");

    const content = msg.content || msg.text || "";
    const role = msg.role || "user";

    switch (role) {
      case "user":
      case "human":
        return new HumanMessage(content);
      case "assistant":
      case "ai":
        return new AIMessage(content);
      case "system":
        return new SystemMessage(content);
      default:
        return new HumanMessage(content);
    }
  }

  /**
   * Convert LangChain messages back to generic format
   */
  convertLangChainMessages(langChainMessages) {
    return langChainMessages.map((msg) => {
      const type = msg._getType();
      let role = "user";

      switch (type) {
        case "human":
          role = "user";
          break;
        case "ai":
          role = "assistant";
          break;
        case "system":
          role = "system";
          break;
      }

      return {
        role,
        content: msg.content,
      };
    });
  }
}

// Export a factory function for creating agents
function createBaseAgent(config = {}) {
  return new BaseAgent(config);
}

// Export for CommonJS
module.exports = BaseAgent;
module.exports.createBaseAgent = createBaseAgent;
module.exports.BaseAgent = BaseAgent;
