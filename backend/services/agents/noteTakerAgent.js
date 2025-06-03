const BaseAgent = require("./baseAgent");
const { ChatOpenAI } = require("@langchain/openai");
const { ChatAnthropic } = require("@langchain/anthropic");
// const { z } = require("zod");
const { PromptTemplate } = require("@langchain/core/prompts");

// Extended state for Note Taker
// const NoteTakerState = z.object({
//   noteStyle: z.enum(["bullet", "outline", "paragraph"]).default("bullet"),
//   summaryLength: z.enum(["brief", "moderate", "detailed"]).default("moderate"),
//   includeFormulas: z.boolean().default(true),
//   includeDiagramReferences: z.boolean().default(true),
//   keyTopics: z.array(z.string()).optional(),
//   diagramReferences: z.array(z.string()).optional(),
//   notes: z.string().optional(),
//   templateId: z.string().optional(),
//   customTemplateConfig: z.any().optional(),
// });

const NOTE_TAKER_PROMPT_TEMPLATE = `
You are an expert academic note-taker. Your primary goal is to extract, organize, and summarize key information from the provided documents.

Context:
- Number of documents: {fileCount}
- Total words: {totalWords}
- Note style: {noteStyle}
- Summary length: {summaryLength}
- Include formulas: {includeFormulas}
- Include diagram references: {includeDiagramReferences}

Documents Content:
{content}

IMPORTANT FORMATTING RULES:
1. Use proper markdown formatting for all sections
2. Use ## for main headings, ### for subheadings
3. Use **bold** for important terms and concepts
4. Use *italics* for emphasis
5. Use bullet points (-) for lists
6. Use numbered lists (1., 2., etc.) for sequential items
7. Use > for important quotes or key statements
8. Use \`code blocks\` for formulas or technical content
9. Leave blank lines between sections for better readability

You MUST structure your response EXACTLY as follows:

## Summary

{summaryLength} overview of the entire content. Write in clear, complete sentences.

## Key Topics

List the main topics covered:

- **Topic 1**: Brief description
- **Topic 2**: Brief description
- **Topic 3**: Brief description
(Continue as needed)

## Key Concepts and Definitions

Important terms and their definitions:

### Term 1
Definition and explanation

### Term 2
Definition and explanation

(Continue as needed)

{diagramInstruction}

## Detailed Notes

Organize the comprehensive notes in {noteStyle} format:

### Section 1 Title
Detailed content with proper formatting

### Section 2 Title
Detailed content with proper formatting

(Continue with all major sections)

## Takeaways and Conclusions

- Key takeaway 1
- Key takeaway 2
- Key takeaway 3

Remember to maintain academic accuracy and use proper markdown formatting throughout.
`;

class NoteTakerAgent extends BaseAgent {
  constructor(llmProvider = "openai") {
    super("NoteTakerAgent", llmProvider);

    // Initialize LLM based on provider
    if (llmProvider === "anthropic") {
      this.llm = new ChatAnthropic({
        modelName: "claude-3-sonnet-20240229",
        temperature: 0.3,
        maxTokens: 4000,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      });
    } else {
      this.llm = new ChatOpenAI({
        modelName: "gpt-4-turbo-preview",
        temperature: 0.3,
        maxTokens: 4000,
        openAIApiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  async processWithAI(state) {
    this.logger.info(`[NoteTakerAgent] Processing with AI`);
    await this.updateProgress(state.taskId, 60, "Generating notes...");

    // Determine if a custom prompt template is provided by the templateConfig
    const templateStringToUse =
      state.customTemplateConfig?.promptOverride || NOTE_TAKER_PROMPT_TEMPLATE;
    const promptTemplate = PromptTemplate.fromTemplate(templateStringToUse);

    // Merge default state values with any overrides from customTemplateConfig
    const noteStyle =
      state.customTemplateConfig?.noteStyle || state.noteStyle || "bullet";
    const summaryLength =
      state.customTemplateConfig?.summaryLength ||
      state.summaryLength ||
      "moderate";
    const includeFormulas =
      state.customTemplateConfig?.includeFormulas !== undefined
        ? state.customTemplateConfig.includeFormulas
        : state.includeFormulas !== undefined
          ? state.includeFormulas
          : true;
    const includeDiagramReferences =
      state.customTemplateConfig?.includeDiagramReferences !== undefined
        ? state.customTemplateConfig.includeDiagramReferences
        : state.includeDiagramReferences !== undefined
          ? state.includeDiagramReferences
          : true;

    try {
      const prompt = await promptTemplate.format({
        fileCount: state.context.fileCount,
        totalWords: state.context.totalWords,
        noteStyle: noteStyle,
        summaryLength: summaryLength,
        includeFormulas: includeFormulas ? "yes" : "no",
        includeDiagramReferences: includeDiagramReferences ? "yes" : "no",
        formulaInstruction: includeFormulas
          ? "Preserve all mathematical formulas and equations using LaTeX notation in code blocks."
          : "Omit mathematical formulas and focus on conceptual understanding.",
        diagramInstruction: includeDiagramReferences
          ? `## Diagram and Figure References\n\nList all references to diagrams, figures, tables, or charts mentioned in the text:\n\n- Figure/Table reference 1\n- Figure/Table reference 2\n(Continue as needed)`
          : "",
        // Allow custom template to inject additional context/instructions if needed
        ...(state.customTemplateConfig?.additionalPromptValues || {}),
        content: state.context.chunks.slice(0, 10).join("\n\n---\n\n"), // Limit context
      });

      const response = await this.llm.invoke(prompt);
      const notes = response.content;

      // Extract key topics using regex (updated for new format)
      const keyTopicsMatch = notes.match(
        /## Key Topics\s*\n([\s\S]*?)(?=\n##|$)/
      );
      const keyTopics = [];
      if (keyTopicsMatch && keyTopicsMatch[1]) {
        const topicsText = keyTopicsMatch[1];
        const topicMatches = topicsText.matchAll(/- \*\*(.+?)\*\*: (.+)/g);
        for (const match of topicMatches) {
          keyTopics.push(`${match[1]}: ${match[2]}`);
        }
      }

      // Extract diagram references using regex (if included)
      const diagramReferences = [];
      if (includeDiagramReferences) {
        const diagramMatch = notes.match(
          /## Diagram and Figure References\s*\n([\s\S]*?)(?=\n##|$)/
        );
        if (diagramMatch && diagramMatch[1]) {
          const refsText = diagramMatch[1];
          const refs = refsText
            .split("\n")
            .filter((line) => line.trim().startsWith("-"))
            .map((line) => line.replace(/^-\s*/, "").trim())
            .filter((ref) => ref.length > 0);
          diagramReferences.push(...refs);
        }
      }

      // Calculate token usage (approximate)
      const tokensUsed = Math.ceil((prompt.length + notes.length) / 4);

      return {
        ...state,
        notes,
        keyTopics,
        diagramReferences,
        result: {
          content: notes,
          format: "markdown",
          metadata: {
            agentType: "note-taker",
            noteStyle: noteStyle,
            summaryLength: summaryLength,
            includeFormulas: includeFormulas,
            includeDiagramReferences: includeDiagramReferences,
            keyTopics,
            diagramReferences,
            processedFiles: state.context.fileCount,
            totalWords: state.context.totalWords,
            templateId: state.templateId,
          },
        },
        tokensUsed,
        cost: this.calculateCost(tokensUsed),
        currentStep: "processWithAI",
        progress: 80,
      };
    } catch (error) {
      this.logger.error(
        `[NoteTakerAgent] AI processing error: ${error.message}`,
        error
      );
      // It's generally better to rethrow or handle the error in a way that the orchestrator can catch it.
      // For now, we'll ensure the state reflects the failure.
      return {
        ...state,
        status: "failed",
        error: `AI processing failed: ${error.message}`,
        progress: state.progress, // Keep existing progress or set to a specific error progress
        currentStep: "processWithAI_error",
      };
    }
  }

  calculateCost(tokens) {
    // Rough cost estimation based on common pricing for models used
    // GPT-4 Turbo (OpenAI): ~$0.01 / 1K input tokens, ~$0.03 / 1K output tokens. We use a blended/average.
    // Claude 3 Sonnet (Anthropic): $0.003 / 1K input tokens, $0.015 / 1K output tokens. We use a blended/average.
    // Using a simplified average cost for now.
    const costPer1kTokens =
      this.llmProvider === "anthropic"
        ? (0.003 + 0.015) / 2
        : (0.01 + 0.03) / 2;
    return (tokens / 1000) * costPer1kTokens;
  }
}

module.exports = NoteTakerAgent;
