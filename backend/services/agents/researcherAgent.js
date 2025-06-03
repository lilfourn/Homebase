const BaseAgent = require("./baseAgent");
const { ChatOpenAI } = require("@langchain/openai");
const { ChatAnthropic } = require("@langchain/anthropic");
const webSearchService = require("../webSearchService");
// const { z } = require("zod");
const { PromptTemplate } = require("@langchain/core/prompts");

// Define the state schema for ResearcherAgent
// This can be expanded with more specific config options later
// const ResearcherState = z.object({
//   researchDepth: z.enum(["surface", "moderate", "deep"]).default("moderate"),
//   specificQuestions: z.array(z.string()).optional(), // User-defined questions to focus on
//   includeWebSearch: z.boolean().default(true), // Whether to include web search
//   webSearchQueries: z.array(z.string()).optional(), // Specific search queries
//   // --- Fields to be populated by the agent ---
//   identifiedThemes: z.array(z.string()).optional(),
//   sourceComparisons: z.array(z.string()).optional(), // Textual descriptions of comparisons
//   conflictingInformation: z.array(z.string()).optional(), // Textual descriptions of conflicts
//   extractedCitations: z.array(z.string()).optional(),
//   researchSummary: z.string().optional(),
//   detailedAnalysis: z.string().optional(), // Main body of the research output
//   webSearchResults: z.any().optional(), // Web search results
// });

// Placeholder for a more complex prompt later
const RESEARCHER_PROMPT_TEMPLATE = `
You are an expert academic researcher with access to both document analysis and web search capabilities. Your goal is to analyze provided documents and synthesize comprehensive research insights, supplemented with current information from the web when relevant.

Context:
- Number of documents: {fileCount}
- Total words: {totalWords}
- Research depth: {researchDepth}
- Include citations: {includeCitations}
- Web search enabled: {webSearchEnabled}

Documents Content:
{content}

{webSearchResultsSection}

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

Provide a comprehensive overview of the key findings across all documents. This should synthesize the main insights and highlight connections between sources. If web search was performed, integrate relevant current information.

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

{webSearchIntegrationSection}

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
  constructor(llmProvider = "anthropic") {
    super("ResearcherAgent", llmProvider);

    // Default to Anthropic for better research capabilities
    if (llmProvider === "anthropic") {
      this.llm = new ChatAnthropic({
        modelName: "claude-3-opus-20240229", // Using most advanced model for research
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

    this.webSearchService = webSearchService;
  }

  async performWebSearch(state) {
    if (!state.includeWebSearch || !this.webSearchService.isAvailable()) {
      return null;
    }

    this.logger.info("[ResearcherAgent] Performing web search");
    await this.updateProgress(
      state.taskId,
      40,
      "Searching the web for relevant sources..."
    );

    try {
      // Extract key topics from documents to generate search queries
      const searchQueries =
        state.webSearchQueries || this.generateSearchQueries(state);
      const webResults = [];

      for (const query of searchQueries.slice(0, 3)) {
        // Limit to 3 queries
        this.logger.info(`[ResearcherAgent] Searching for: ${query}`);

        // Use the new searchAndExtract method for combined workflow
        const searchResult = await this.webSearchService.searchAndExtract(
          query,
          {
            num: 10, // Get top 10 search results
            extractCount: 5, // Extract content from top 5 URLs
            depth: "advanced", // Use advanced extraction for better content
          }
        );

        if (searchResult.success) {
          webResults.push({
            query,
            searchResults: searchResult.searchResults,
            extractedContent: searchResult.extractedContent,
            combinedData: searchResult.combinedData,
            answer: searchResult.answer,
            providers: {
              search: searchResult.searchProvider,
              extractor: searchResult.contentExtractor,
            },
          });

          // Update progress
          await this.updateProgress(
            state.taskId,
            45,
            `Found ${searchResult.searchResults.length} sources and extracted content from ${searchResult.extractedContent.length} pages...`
          );
        }
      }

      return webResults;
    } catch (error) {
      this.logger.error(
        `[ResearcherAgent] Web search error: ${error.message}`,
        error
      );
      return null;
    }
  }

  generateSearchQueries(state) {
    // Extract key terms from the document content to generate search queries
    const content = state.context.chunks.join(" ");
    const queries = [];

    // Simple keyword extraction (can be enhanced with NLP)
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq = {};

    // Count word frequency
    words.forEach((word) => {
      if (word.length > 5) {
        // Focus on longer words
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    // Get top keywords
    const topKeywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    // Generate queries based on keywords
    if (topKeywords.length > 0) {
      queries.push(`latest research ${topKeywords.slice(0, 3).join(" ")}`);
      queries.push(
        `recent developments ${topKeywords[0]} ${new Date().getFullYear()}`
      );
    }

    // Add specific questions if provided
    if (state.specificQuestions) {
      queries.push(...state.specificQuestions.slice(0, 2));
    }

    return queries;
  }

  formatWebSearchResults(webResults) {
    if (!webResults || webResults.length === 0) {
      return "";
    }

    let formatted = "## Web Research Results\n\n";

    webResults.forEach(
      ({
        query,
        searchResults,
        extractedContent,
        combinedData,
        answer,
        providers,
      }) => {
        formatted += `### Search Query: "${query}"\n\n`;

        if (providers) {
          formatted += `*Search Provider: ${providers.search} | Content Extractor: ${providers.extractor}*\n\n`;
        }

        if (answer) {
          formatted += `**AI Summary:** ${answer}\n\n`;
        }

        // Show extracted content if available
        if (extractedContent && extractedContent.length > 0) {
          formatted += "**Extracted Content from Top Sources:**\n\n";

          extractedContent.forEach((content, index) => {
            formatted += `#### ${index + 1}. [${content.title || "Untitled"}](${content.url})\n`;

            // Include a meaningful excerpt from the content
            if (content.content) {
              const excerpt = content.content.substring(0, 500).trim();
              formatted += `> ${excerpt}${content.content.length > 500 ? "..." : ""}\n\n`;
            } else if (content.snippet) {
              formatted += `> ${content.snippet}\n\n`;
            }

            if (content.publishedDate) {
              formatted += `*Published: ${content.publishedDate}*\n\n`;
            }
          });
        } else {
          // Fallback to showing just search results if no content extracted
          formatted += "**Top Search Results:**\n";
          searchResults.slice(0, 5).forEach((result) => {
            formatted += `- **[${result.title}](${result.url})**\n`;
            formatted += `  ${result.snippet}\n\n`;
          });
        }

        formatted += "---\n\n";
      }
    );

    return formatted;
  }

  async processWithAI(state) {
    this.logger.info("[ResearcherAgent] Processing with AI");

    // Perform web search if enabled
    const webSearchResults = await this.performWebSearch(state);

    await this.updateProgress(
      state.taskId,
      60,
      "Analyzing documents and web results..."
    );

    const promptTemplate = PromptTemplate.fromTemplate(
      RESEARCHER_PROMPT_TEMPLATE
    );

    try {
      const researchDepth = state.researchDepth || "deep"; // Default to deep research
      const includeCitations = state.includeCitations !== false; // default true
      const webSearchEnabled =
        state.includeWebSearch !== false && webSearchResults !== null;

      const citationSection = includeCitations
        ? `## Citations and References

Extract and format all citations found in the documents:

- **Citation 1**: Full citation details
- **Citation 2**: Full citation details
(Continue for all citations found)`
        : "";

      const webSearchIntegrationSection = webSearchEnabled
        ? `## Web Research Integration

Integrate relevant findings from web search results with document analysis. Highlight any updates, confirmations, or contradictions to the document content based on current web information.`
        : "";

      const webSearchResultsSection = webSearchEnabled
        ? `Web Search Results:
${this.formatWebSearchResults(webSearchResults)}`
        : "";

      const prompt = await promptTemplate.format({
        fileCount: state.context.fileCount,
        totalWords: state.context.totalWords,
        researchDepth: researchDepth,
        includeCitations: includeCitations ? "yes" : "no",
        webSearchEnabled: webSearchEnabled ? "yes" : "no",
        citationSection: citationSection,
        webSearchIntegrationSection: webSearchIntegrationSection,
        webSearchResultsSection: webSearchResultsSection,
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

      const webIntegration = webSearchEnabled
        ? analysis
            .match(/## Web Research Integration\s*\n([\s\S]*?)(?=\n##|$)/)?.[1]
            ?.trim()
        : null;

      // Include web search metadata in the result
      const webSearchMetadata =
        webSearchEnabled && webSearchResults
          ? {
              queriesUsed: webSearchResults.flatMap((r) => r.query),
              totalSourcesFound: webSearchResults.reduce(
                (sum, r) => sum + (r.searchResults?.length || 0),
                0
              ),
              contentExtracted: webSearchResults.reduce(
                (sum, r) => sum + (r.extractedContent?.length || 0),
                0
              ),
              providers: webSearchResults[0]?.providers || {},
            }
          : null;

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
        webIntegration,
        knowledgeGaps,
        citations,
        recommendations,
        webSearchResults,
        result: {
          content: analysis,
          format: "markdown",
          metadata: {
            agentType: "researcher",
            researchDepth: researchDepth,
            includeCitations: includeCitations,
            webSearchEnabled: webSearchEnabled,
            webSearchProvider: webSearchEnabled
              ? this.webSearchService.getProviders().searchProvider
              : null,
            contentExtractor: webSearchEnabled
              ? this.webSearchService.getProviders().contentExtractor
              : null,
            webSearchMetadata,
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
    // Updated cost estimation for more advanced models
    // Claude 3 Opus: $0.015 / 1K input tokens, $0.075 / 1K output tokens
    // GPT-4 Turbo: ~$0.01 / 1K input tokens, ~$0.03 / 1K output tokens
    const costPer1kTokens =
      this.llmProvider === "anthropic"
        ? (0.015 + 0.075) / 2 // Claude 3 Opus average
        : (0.01 + 0.03) / 2; // GPT-4 average
    return (tokens / 1000) * costPer1kTokens;
  }
}

module.exports = ResearcherAgent;
