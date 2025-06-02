const BaseAgent = require("./baseAgent");
const { ChatOpenAI } = require("@langchain/openai");
const { ChatAnthropic } = require("@langchain/anthropic");
// const { z } = require("zod");
const { PromptTemplate } = require("@langchain/core/prompts");

// Define the state schema for ResearcherAgent
// This can be expanded with more specific config options later
// const ResearcherState = z.object({
//   researchDepth: z.enum(["surface", "moderate", "deep"]).default("moderate"),
//   specificQuestions: z.array(z.string()).optional(), // User-defined questions to focus on
//   // --- Fields to be populated by the agent ---
//   identifiedThemes: z.array(z.string()).optional(),
//   sourceComparisons: z.array(z.string()).optional(), // Textual descriptions of comparisons
//   conflictingInformation: z.array(z.string()).optional(), // Textual descriptions of conflicts
//   extractedCitations: z.array(z.string()).optional(),
//   researchSummary: z.string().optional(),
//   detailedAnalysis: z.string().optional(), // Main body of the research output
// });

// Placeholder for a more complex prompt later
const RESEARCHER_PROMPT_TEMPLATE = `
You are an expert academic researcher. Your task is to analyze and synthesize information from the provided documents based on the user's requirements.

Context:
- Number of documents: {fileCount}
- Total words: {totalWords}
- Research Depth: {researchDepth}
{specificQuestionsPrompt}

Documents Content (concatenated and summarized if necessary):
{content}

Instructions:
1.  Thoroughly analyze the provided content from all documents.
2.  Identify and list the main common themes or topics discussed across the documents.
3.  If multiple documents discuss similar topics, compare and contrast their perspectives, findings, or arguments. Note any significant agreements or disagreements.
4.  Identify and clearly describe any conflicting information or contradictions found between the documents.
5.  Extract any explicit citations or references mentioned in the text. List them clearly.
6.  Based on your analysis, provide a concise research summary.
7.  If specific questions were provided, address them directly using information from the documents.

Structure your response as follows:

# Research Summary
[Your concise summary here, addressing the overall findings and specific questions if any.]

# Key Themes
- Theme 1
- Theme 2
...

# Source Comparisons & Agreements/Disagreements
- [Detailed comparison between Source X and Source Y on Topic Z, highlighting agreements/disagreements.]
...

# Conflicting Information
- [Description of conflicting information found, citing the sources involved.]
...

# Extracted Citations
- Citation 1 (e.g., Author, Year, Title)
- Citation 2
...

# Detailed Analysis
[Provide a more detailed synthesis of the information, expanding on themes, comparisons, and addressing specific questions if provided.]

Ensure your analysis is objective, well-supported by the document content, and presented clearly.
If specific questions were provided, ensure your detailed analysis directly answers them.
`;

class ResearcherAgent extends BaseAgent {
  constructor(llmProvider = "openai") {
    super("ResearcherAgent", llmProvider);

    if (llmProvider === "anthropic") {
      this.llm = new ChatAnthropic({
        modelName: "claude-3-sonnet-20240229", // Or a more powerful model if needed for research
        temperature: 0.4, // Slightly higher for more nuanced analysis
        maxTokens: 4000, // Ensure enough space for detailed output
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      });
    } else {
      this.llm = new ChatOpenAI({
        modelName: "gpt-4-turbo-preview", // GPT-4 is good for complex reasoning
        temperature: 0.4,
        maxTokens: 4000,
        openAIApiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  async processWithAI(state) {
    this.logger.info(
      `[${this.name}] Processing with AI. Task ID: ${state.taskId}`
    );
    await this.updateProgress(
      state.taskId,
      60,
      "Synthesizing research findings..."
    );

    const specificQuestionsPrompt =
      state.specificQuestions && state.specificQuestions.length > 0
        ? `\n- Specific Questions to Address:\n${state.specificQuestions.map((q) => `  - ${q}`).join("\n")}`
        : "";

    const promptTemplate = PromptTemplate.fromTemplate(
      RESEARCHER_PROMPT_TEMPLATE
    );

    try {
      const prompt = await promptTemplate.format({
        fileCount: state.context.fileCount,
        totalWords: state.context.totalWords,
        researchDepth: state.researchDepth || "moderate",
        specificQuestionsPrompt: specificQuestionsPrompt,
        content: state.context.chunks.join("\n\n---\n\n"), // Provide all chunks
      });

      this.logger.info(
        `[${this.name}] Sending prompt to LLM. Length: ${prompt.length}`
      );
      const response = await this.llm.invoke(prompt);
      const analysis = response.content;
      this.logger.info(
        `[${this.name}] Received response from LLM. Length: ${analysis.length}`
      );

      // Basic Parsing (can be improved with more robust methods, e.g., Zod schemas for LLM output)
      const researchSummary = analysis
        .match(/# Research Summary\n([\s\S]*?)(?=\n# Key Themes|$)/)?.[1]
        ?.trim();
      const identifiedThemes =
        analysis
          .match(/# Key Themes\n([\s\S]*?)(?=\n# Source Comparisons|$)/)?.[1]
          ?.split("\n")
          .map((t) => t.replace(/^-\s*/, "").trim())
          .filter((t) => t) || [];
      const sourceComparisons =
        analysis
          .match(
            /# Source Comparisons & Agreements\/Disagreements\n([\s\S]*?)(?=\n# Conflicting Information|$)/
          )?.[1]
          ?.split("\n")
          .map((t) => t.replace(/^-\s*/, "").trim())
          .filter((t) => t) || [];
      const conflictingInformation =
        analysis
          .match(
            /# Conflicting Information\n([\s\S]*?)(?=\n# Extracted Citations|$)/
          )?.[1]
          ?.split("\n")
          .map((t) => t.replace(/^-\s*/, "").trim())
          .filter((t) => t) || [];
      const extractedCitations =
        analysis
          .match(
            /# Extracted Citations\n([\s\S]*?)(?=\n# Detailed Analysis|$)/
          )?.[1]
          ?.split("\n")
          .map((t) => t.replace(/^-\s*/, "").trim())
          .filter((t) => t) || [];
      const detailedAnalysis = analysis
        .match(/# Detailed Analysis\n([\s\S]*)/)?.[1]
        ?.trim();

      const tokensUsed = Math.ceil((prompt.length + analysis.length) / 4); // Approximate

      return {
        ...state,
        researchSummary,
        identifiedThemes,
        sourceComparisons,
        conflictingInformation,
        extractedCitations,
        detailedAnalysis,
        result: {
          content: analysis, // Full structured analysis
          format: "markdown",
          metadata: {
            agentType: "researcher",
            researchDepth: state.researchDepth,
            specificQuestions: state.specificQuestions,
            themesCount: identifiedThemes.length,
            citationsCount: extractedCitations.length,
            processedFiles: state.context.fileCount,
            totalWords: state.context.totalWords,
          },
        },
        tokensUsed,
        cost: this.calculateCost(tokensUsed),
        currentStep: "processWithAI",
        progress: 80,
      };
    } catch (error) {
      this.logger.error(
        `[${this.name}] AI processing error: ${error.message}`,
        error
      );
      return {
        ...state,
        status: "failed",
        error: `AI processing failed: ${error.message}`,
        currentStep: "processWithAI_error",
      };
    }
  }

  calculateCost(tokens) {
    // Consistent with NoteTakerAgent, can be refined per model
    const costPer1kTokens =
      this.llmProvider === "anthropic"
        ? (0.003 + 0.015) / 2
        : (0.01 + 0.03) / 2;
    return (tokens / 1000) * costPer1kTokens;
  }
}

module.exports = ResearcherAgent;
