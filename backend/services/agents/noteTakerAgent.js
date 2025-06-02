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
        modelName: "claude-3-sonnet-20240229",
        temperature: 0.3,
        maxTokens: 4000,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY
      });
    } else {
      this.llm = new ChatOpenAI({
        modelName: "gpt-4-turbo-preview",
        temperature: 0.3,
        maxTokens: 4000,
        openAIApiKey: process.env.OPENAI_API_KEY
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

    try {
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
        ? keyTopicsMatch[1].split("\n")
            .filter(line => line.trim().startsWith("-"))
            .map(line => line.replace(/^-\s*/, "").trim())
        : [];

      // Calculate token usage (approximate)
      const tokensUsed = Math.ceil((prompt.length + notes.length) / 4);

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
        tokensUsed,
        cost: this.calculateCost(tokensUsed),
        currentStep: "processWithAI",
        progress: 80
      };
    } catch (error) {
      this.logger.error(`[NoteTakerAgent] AI processing error:`, error);
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }

  calculateCost(tokens) {
    // Rough cost estimation
    const costPer1kTokens = this.llmProvider === "anthropic" ? 0.015 : 0.01;
    return (tokens / 1000) * costPer1kTokens;
  }
}

module.exports = NoteTakerAgent;