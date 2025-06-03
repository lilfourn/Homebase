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
You are an expert academic researcher. Your goal is to analyze multiple documents and synthesize comprehensive research insights.

Context:
- Number of documents: {fileCount}
- Total words: {totalWords}
- Research depth: {researchDepth}
- Include citations: {includeCitations}

Documents Content:
{content}

IMPORTANT FORMATTING RULES:
1. Use proper markdown formatting for all sections
2. Use ## for main headings, ### for subheadings
3. Use **bold** for important terms, findings, and concepts
4. Use *italics* for emphasis
5. Use bullet points (-) for lists
6. Use numbered lists (1., 2., etc.) for sequential items
7. Use > for important quotes or key findings
8. Use tables for comparative analysis when appropriate
9. Leave blank lines between sections for better readability

You MUST structure your response EXACTLY as follows:

## Research Summary

Provide a comprehensive overview of the key findings across all documents. This should synthesize the main insights and highlight connections between sources.

## Key Themes and Patterns

Identify and explain the major themes that emerge across the documents:

### Theme 1: [Theme Name]
Detailed explanation of this theme and how it appears across documents.

### Theme 2: [Theme Name]
Detailed explanation of this theme and how it appears across documents.

(Continue as needed)

## Comparative Analysis

Compare and contrast the perspectives, methodologies, or findings across documents:

| Aspect | Document 1 | Document 2 | Document 3 |
|--------|------------|------------|------------|
| Main Argument | ... | ... | ... |
| Methodology | ... | ... | ... |
| Key Findings | ... | ... | ... |

## Critical Insights

Provide deeper analysis and critical evaluation:

1. **Insight 1**: Detailed explanation
2. **Insight 2**: Detailed explanation
3. **Insight 3**: Detailed explanation

## Knowledge Gaps and Future Directions

Identify areas that need further research:

- Gap 1: Description and why it matters
- Gap 2: Description and why it matters
- Gap 3: Description and why it matters

{citationSection}

## Recommendations

Based on the research analysis, provide actionable recommendations:

1. **Recommendation 1**: Detailed explanation
2. **Recommendation 2**: Detailed explanation
3. **Recommendation 3**: Detailed explanation

Remember to maintain academic rigor and use proper markdown formatting throughout.
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
    this.logger.info("[ResearcherAgent] Processing with AI");
    await this.updateProgress(state.taskId, 60, "Analyzing documents...");

    const promptTemplate = PromptTemplate.fromTemplate(
      RESEARCHER_PROMPT_TEMPLATE
    );

    try {
      const researchDepth = state.researchDepth || "standard";
      const includeCitations = state.includeCitations !== false; // default true

      const citationSection = includeCitations
        ? `## Citations and References

Extract and format all citations found in the documents:

- **Citation 1**: Full citation details
- **Citation 2**: Full citation details
(Continue for all citations found)`
        : "";

      const prompt = await promptTemplate.format({
        fileCount: state.context.fileCount,
        totalWords: state.context.totalWords,
        researchDepth: researchDepth,
        includeCitations: includeCitations ? "yes" : "no",
        citationSection: citationSection,
        content: state.context.chunks.slice(0, 20).join("\n\n---\n\n"), // Use more chunks for research
      });

      const response = await this.llm.invoke(prompt);
      const analysis = response.content;

      // Extract key components using updated regex patterns
      const researchSummary = analysis
        .match(/## Research Summary\s*\n([\s\S]*?)(?=\n##|$)/)?.[1]
        ?.trim();

      const keyThemes = [];
      const themesMatch = analysis.match(
        /## Key Themes and Patterns\s*\n([\s\S]*?)(?=\n##|$)/
      );
      if (themesMatch) {
        const themeMatches = themesMatch[1].matchAll(
          /### Theme \d+: (.+?)\n([\s\S]*?)(?=\n###|\n##|$)/g
        );
        for (const match of themeMatches) {
          keyThemes.push({
            theme: match[1],
            description: match[2].trim(),
          });
        }
      }

      const comparativeAnalysis = analysis
        .match(/## Comparative Analysis\s*\n([\s\S]*?)(?=\n##|$)/)?.[1]
        ?.trim();

      const criticalInsights = [];
      const insightsMatch = analysis.match(
        /## Critical Insights\s*\n([\s\S]*?)(?=\n##|$)/
      );
      if (insightsMatch) {
        const insightMatches = insightsMatch[1].matchAll(
          /\d+\.\s*\*\*(.+?)\*\*:\s*(.+)/g
        );
        for (const match of insightMatches) {
          criticalInsights.push({
            insight: match[1],
            explanation: match[2],
          });
        }
      }

      const knowledgeGaps = [];
      const gapsMatch = analysis.match(
        /## Knowledge Gaps and Future Directions\s*\n([\s\S]*?)(?=\n##|$)/
      );
      if (gapsMatch) {
        const gaps = gapsMatch[1]
          .split("\n")
          .filter((line) => line.trim().startsWith("-"))
          .map((line) => line.replace(/^-\s*/, "").trim())
          .filter((gap) => gap.length > 0);
        knowledgeGaps.push(...gaps);
      }

      const citations = [];
      if (includeCitations) {
        const citationsMatch = analysis.match(
          /## Citations and References\s*\n([\s\S]*?)(?=\n##|$)/
        );
        if (citationsMatch) {
          const cites = citationsMatch[1]
            .split("\n")
            .filter((line) => line.trim().startsWith("-"))
            .map((line) =>
              line.replace(/^-\s*\*\*Citation \d+\*\*:\s*/, "").trim()
            )
            .filter((cite) => cite.length > 0);
          citations.push(...cites);
        }
      }

      const recommendations = [];
      const recsMatch = analysis.match(
        /## Recommendations\s*\n([\s\S]*?)(?=\n##|$)/
      );
      if (recsMatch) {
        const recMatches = recsMatch[1].matchAll(
          /\d+\.\s*\*\*(.+?)\*\*:\s*(.+)/g
        );
        for (const match of recMatches) {
          recommendations.push({
            recommendation: match[1],
            explanation: match[2],
          });
        }
      }

      // Calculate token usage (approximate)
      const tokensUsed = Math.ceil((prompt.length + analysis.length) / 4);

      return {
        ...state,
        analysis,
        researchSummary,
        keyThemes,
        comparativeAnalysis,
        criticalInsights,
        knowledgeGaps,
        citations,
        recommendations,
        result: {
          content: analysis,
          format: "markdown",
          metadata: {
            agentType: "researcher",
            researchDepth: researchDepth,
            includeCitations: includeCitations,
            themesFound: keyThemes.length,
            insightsCount: criticalInsights.length,
            gapsIdentified: knowledgeGaps.length,
            citationsFound: citations.length,
            recommendationsCount: recommendations.length,
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
        `[ResearcherAgent] AI processing error: ${error.message}`,
        error
      );
      return {
        ...state,
        status: "failed",
        error: `AI processing failed: ${error.message}`,
        progress: state.progress,
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
