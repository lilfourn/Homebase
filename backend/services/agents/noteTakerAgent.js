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
You are an expert academic note-taker. Your primary goal is to extract, organize, and summarize key information *solely* from the provided "Documents Content". Do not use any external knowledge.

Context:
- Number of documents: {fileCount}
- Total words: {totalWords}
- Note style: {noteStyle} (If outline, use nested bullet points or numbered lists to show hierarchy.)
- Summary length: {summaryLength}
- Include formulas: {includeFormulas}
- Include diagram/figure references: {includeDiagramReferences}

Documents Content:
{content}

Instructions:
1.  Extract main topics, concepts, and key points (such as important definitions, arguments, evidence, or conclusions) from the "Documents Content".
2.  Create a {summaryLength} summary that encapsulates the core information from the *entire* "Documents Content".
3.  {formulaInstruction}
4.  {diagramInstruction}
5.  Identify and list key topics separately. If no distinct key topics are identified, state "No key topics identified." under the relevant heading.
6.  Organize the comprehensive extraction of information (topics, concepts, key points) into the "Detailed Notes" section, adhering strictly to the specified {noteStyle}.
7.  Maintain academic accuracy and clarity in all sections.

Format your response strictly as follows, ensuring all specified headings are present:

# Summary
[Your summary here. This should be a {summaryLength} overview of the entire provided content.]

# Key Topics
[List key topics as bullet points. If none, state "No key topics identified."]
- Topic 1
- Topic 2
...

# Diagram and Figure References
[List unique textual references to visuals as bullet points (e.g., "Figure 1 shows...", "See Table A..."). If none, state "No diagram or figure references identified."]
- Reference 1
- Reference 2
...

# Detailed Notes
[Your comprehensive notes here, meticulously organized in the specified {noteStyle}. This section should contain the detailed extraction of main topics, concepts, and key points, reflecting the depth of the original documents.]
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
        : state.includeFormulas;
    const includeDiagramReferences =
      state.customTemplateConfig?.includeDiagramReferences !== undefined
        ? state.customTemplateConfig.includeDiagramReferences
        : state.includeDiagramReferences;

    try {
      const prompt = await promptTemplate.format({
        fileCount: state.context.fileCount,
        totalWords: state.context.totalWords,
        noteStyle: noteStyle,
        summaryLength: summaryLength,
        includeFormulas: includeFormulas ? "yes" : "no",
        includeDiagramReferences: includeDiagramReferences ? "yes" : "no",
        formulaInstruction: includeFormulas
          ? "Preserve all mathematical formulas and equations."
          : "Focus on conceptual understanding without formulas.",
        diagramInstruction: includeDiagramReferences
          ? "Identify and list any textual references to diagrams, figures, tables, charts, or other visuals (e.g., 'as shown in Figure 1', 'Table 2 illustrates...'). List each unique reference."
          : "Do not list references to diagrams, figures, or tables.",
        // Allow custom template to inject additional context/instructions if needed
        ...(state.customTemplateConfig?.additionalPromptValues || {}),
        content: state.context.chunks.slice(0, 10).join("\n\n---\n\n"), // Limit context
      });

      const response = await this.llm.invoke(prompt);
      const notes = response.content;

      // Extract key topics using regex
      const keyTopicsMatch = notes.match(/# Key Topics\n([\s\S]*?)(?=\n#|$)/);
      const keyTopics = keyTopicsMatch
        ? keyTopicsMatch[1]
            .split("\n")
            .filter((line) => line.trim().startsWith("-"))
            .map((line) => line.replace(/^-\s*/, "").trim())
        : [];

      // Extract diagram and figure references using regex
      const diagramReferencesMatch = notes.match(
        /# Diagram and Figure References\n([\s\S]*?)(?=\n#|$)/
      );
      const diagramReferences = diagramReferencesMatch
        ? diagramReferencesMatch[1]
            .split("\n")
            .filter((line) => line.trim().startsWith("-"))
            .map((line) => line.replace(/^-\s*/, "").trim())
            .filter((ref) => ref.length > 0) // Ensure non-empty references
        : [];

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
