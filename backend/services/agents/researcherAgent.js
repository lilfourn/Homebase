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

// Prompt templates for different research depths
const SURFACE_PROMPT_TEMPLATE = `
You are a research assistant providing a quick overview of the given materials.

Context:
- Documents: {fileCount}
- Research topic: {researchPrompt}
- Web search: {webSearchEnabled}

Content:
{content}

{webSearchResultsSection}

Provide a CONCISE analysis with these sections:

## Summary
Brief overview of the main points (2-3 paragraphs max).

## Key Facts
- Important fact 1
- Important fact 2
- Important fact 3
(List 5-7 key facts)

## Main Takeaways
1. **Takeaway 1**: One sentence explanation
2. **Takeaway 2**: One sentence explanation
3. **Takeaway 3**: One sentence explanation

Keep responses brief and focused on essential information only.
`;

const MODERATE_PROMPT_TEMPLATE = `
You are an expert researcher providing a balanced analysis of the provided materials.

Context:
- Documents: {fileCount}
- Total words: {totalWords}
- Research topic: {researchPrompt}
- Web search: {webSearchEnabled}

Content:
{content}

{webSearchResultsSection}

Structure your analysis as follows:

## Executive Summary
Comprehensive overview of findings (3-4 paragraphs).

## Key Themes
### Theme 1: [Name]
Explanation and evidence.

### Theme 2: [Name]
Explanation and evidence.

## Comparative Analysis
Brief comparison of different perspectives or sources.

## Critical Insights
1. **Insight 1**: Detailed explanation
2. **Insight 2**: Detailed explanation
3. **Insight 3**: Detailed explanation

{webSearchIntegrationSection}

## Recommendations
1. **Recommendation 1**: Brief explanation
2. **Recommendation 2**: Brief explanation

Use markdown formatting for clarity.
`;

const DEEP_PROMPT_TEMPLATE = `
You are an expert academic researcher with access to both document analysis and web search capabilities. Your goal is to analyze provided documents and synthesize comprehensive research insights, supplemented with current information from the web when relevant.

Context:
- Number of documents: {fileCount}
- Total words: {totalWords}
- Research depth: {researchDepth}
- Include citations: {includeCitations}
- Web search enabled: {webSearchEnabled}
- Research topic: {researchPrompt}

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

// Placeholder for a more complex prompt later
const RESEARCHER_PROMPT_TEMPLATE = DEEP_PROMPT_TEMPLATE; // Default to deep for backward compatibility

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
    
    // Research depth configurations
    this.depthConfigs = {
      surface: {
        name: "Quick Overview",
        description: "Basic analysis with key facts only",
        modelOverride: {
          anthropic: "claude-3-haiku-20240307", // Fastest, most efficient model
          openai: "gpt-4o-mini" // Faster, cheaper model
        },
        maxTokens: 1500,
        temperature: 0.3,
        webSearchQueries: 2, // Limit web searches
        chunksToAnalyze: 5, // Analyze fewer chunks
        includeComparison: false,
        includeKnowledgeGaps: false,
        includeCriticalInsights: false
      },
      moderate: {
        name: "Standard Analysis", 
        description: "Balanced depth with key insights",
        modelOverride: {
          anthropic: "claude-3-5-sonnet-20241022", // Latest Sonnet model
          openai: "gpt-4o" // Latest GPT-4
        },
        maxTokens: 2500,
        temperature: 0.4,
        webSearchQueries: 4,
        chunksToAnalyze: 10,
        includeComparison: true,
        includeKnowledgeGaps: false,
        includeCriticalInsights: true
      },
      deep: {
        name: "Deep Dive",
        description: "Comprehensive analysis with all features",
        modelOverride: null, // Use the best model (already set in constructor)
        maxTokens: 4000,
        temperature: 0.5,
        webSearchQueries: 6,
        chunksToAnalyze: 20,
        includeComparison: true,
        includeKnowledgeGaps: true,
        includeCriticalInsights: true
      }
    };
  }
  
  // Method to configure LLM based on research depth
  configureLLMForDepth(depth, llmProvider) {
    const config = this.depthConfigs[depth] || this.depthConfigs.deep;
    
    if (config.modelOverride) {
      const modelName = config.modelOverride[llmProvider];
      
      if (llmProvider === "anthropic" && modelName) {
        this.llm = new ChatAnthropic({
          modelName: modelName,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        });
      } else if (llmProvider === "openai" && modelName) {
        this.llm = new ChatOpenAI({
          modelName: modelName,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          openAIApiKey: process.env.OPENAI_API_KEY,
        });
      }
    } else {
      // Update temperature and maxTokens for existing LLM
      if (this.llm.temperature !== undefined) {
        this.llm.temperature = config.temperature;
      }
      if (this.llm.maxTokens !== undefined) {
        this.llm.maxTokens = config.maxTokens;
      }
    }
    
    return config;
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
      // Get depth configuration
      const depthConfig = this.depthConfigs[state.researchDepth] || this.depthConfigs.moderate;
      
      // Pass the full state including customSettings to generateSearchQueries
      const searchQueries =
        state.webSearchQueries || this.generateSearchQueries(state);
      const webResults = [];

      for (const query of searchQueries.slice(0, depthConfig.webSearchQueries)) {
        // Limit queries based on depth
        this.logger.info(`[ResearcherAgent] Searching for: ${query}`);

        // Use the new searchAndExtract method for combined workflow
        const searchResult = await this.webSearchService.searchAndExtract(
          query,
          {
            num: depthConfig.webSearchQueries >= 4 ? 10 : 5, // More results for deeper research
            extractCount: depthConfig.webSearchQueries >= 4 ? 5 : 3, // Extract from more URLs for deeper research
            depth: depthConfig.webSearchQueries >= 6 ? "advanced" : "basic", // Advanced extraction for deep research
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
    const depthConfig = this.depthConfigs[state.researchDepth] || this.depthConfigs.moderate;
    const maxQueries = depthConfig.webSearchQueries;
    const queries = [];
    
    // Priority 1: Use research prompt if provided
    const researchPrompt = state.context?.researchPrompt || state.customSettings?.researchPrompt || state.researchPrompt;
    if (researchPrompt) {
      queries.push(researchPrompt);
      
      // Add variations based on depth
      if (maxQueries >= 2) {
        queries.push(`latest research ${researchPrompt} ${new Date().getFullYear()}`);
      }
      if (maxQueries >= 4) {
        queries.push(`${researchPrompt} comparative analysis`);
        queries.push(`${researchPrompt} recent developments`);
      }
      if (maxQueries >= 6) {
        queries.push(`${researchPrompt} future trends`);
        queries.push(`${researchPrompt} challenges and opportunities`);
      }
      
      return queries.slice(0, maxQueries);
    }
    
    // Priority 2: Use specific questions if provided
    if (state.specificQuestions && state.specificQuestions.length > 0) {
      return state.specificQuestions.slice(0, maxQueries);
    }
    
    // Priority 3: Extract from document content if no prompt provided
    if (!state.context?.chunks || state.context.chunks.length === 0) {
      // No content and no prompt - return empty array
      return [];
    }
    
    const content = state.context.chunks.join(" ");
    
    // Simple keyword extraction
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq = {};

    words.forEach((word) => {
      if (word.length > 5) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    const topKeywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    // Generate queries based on keywords and depth
    if (topKeywords.length > 0) {
      queries.push(`latest research ${topKeywords.slice(0, 3).join(" ")}`);
      
      if (maxQueries >= 2) {
        queries.push(
          `recent developments ${topKeywords[0]} ${new Date().getFullYear()}`
        );
      }
      
      if (maxQueries >= 4) {
        queries.push(`${topKeywords[0]} ${topKeywords[1]} analysis`);
      }
    }

    return queries.slice(0, maxQueries);
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

  // Override validateFiles to handle research prompt without files
  async validateFiles(state) {
    const files = state.files || [];
    const researchPrompt = state.customSettings?.researchPrompt || state.researchPrompt;

    this.logger.info(`[${this.name}] Validating ${files.length} files`);
    this.logger.info(`[${this.name}] Research prompt provided: ${!!researchPrompt}`);
    this.logger.info(`[${this.name}] State customSettings:`, state.customSettings);
    this.logger.info(`[${this.name}] Direct state.researchPrompt:`, state.researchPrompt);
    
    await this.updateProgress(state.taskId, 10, "Validating inputs...");

    // For researcher agent, either files OR research prompt is required
    if ((!files || files.length === 0) && !researchPrompt) {
      throw new Error("Either files or a research prompt must be provided");
    }

    return {
      ...state,
      files: files,
      hasResearchPrompt: !!researchPrompt,
      currentStep: "validateFiles",
      progress: 10,
    };
  }

  // Override processFiles to handle case with no files
  async processFiles(state) {
    this.logger.info(`[${this.name}] Processing files`);
    await this.updateProgress(state.taskId, 20, "Processing files...");

    // If no files, create empty processedContent
    if (!state.files || state.files.length === 0) {
      return {
        ...state,
        processedContent: [],
        currentStep: "processFiles",
        progress: 30,
      };
    }

    // Files should already be processed by the worker
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

  // Override buildContext to handle no files case
  async buildContext(state) {
    this.logger.info(`[${this.name}] Building context`);
    await this.updateProgress(state.taskId, 40, "Building context...");

    const validFiles = state.processedContent || [];
    const context = {
      fileCount: validFiles.length,
      totalWords: validFiles.reduce((sum, f) => sum + (f.wordCount || 0), 0),
      chunks: validFiles.flatMap((f) => f.chunks || [f.content]),
      hasResearchPrompt: state.hasResearchPrompt,
      researchPrompt: state.customSettings?.researchPrompt || "",
    };

    return {
      ...state,
      context,
      currentStep: "buildContext",
      progress: 50,
    };
  }

  async processWithAI(state) {
    this.logger.info("[ResearcherAgent] Processing with AI");
    
    // Configure LLM based on research depth
    const researchDepth = state.researchDepth || "moderate"; // Default to moderate
    const depthConfig = this.configureLLMForDepth(researchDepth, state.llmProvider || "anthropic");
    
    this.logger.info(`[ResearcherAgent] Using ${depthConfig.name} research depth`, {
      model: this.llm.modelName,
      maxTokens: depthConfig.maxTokens,
      chunksToAnalyze: depthConfig.chunksToAnalyze
    });

    // Perform web search if enabled
    const webSearchResults = await this.performWebSearch(state);

    await this.updateProgress(
      state.taskId,
      60,
      "Analyzing documents and web results..."
    );

    // Select prompt template based on depth
    let selectedTemplate;
    switch (researchDepth) {
      case "surface":
        selectedTemplate = SURFACE_PROMPT_TEMPLATE;
        break;
      case "moderate":
        selectedTemplate = MODERATE_PROMPT_TEMPLATE;
        break;
      case "deep":
      default:
        selectedTemplate = DEEP_PROMPT_TEMPLATE;
        break;
    }

    const promptTemplate = PromptTemplate.fromTemplate(selectedTemplate);

    try {
      const includeCitations = state.includeCitations !== false; // default true
      const webSearchEnabled =
        state.includeWebSearch !== false && webSearchResults !== null;

      const citationSection = includeCitations && depthConfig.includeCriticalInsights
        ? `## Citations and References

Extract and format all citations found in the documents:

- **Citation 1**: Full citation details
- **Citation 2**: Full citation details
(Continue for all citations found)`
        : "";

      const webSearchIntegrationSection = webSearchEnabled && depthConfig.includeComparison
        ? `## Web Research Integration

Integrate relevant findings from web search results with document analysis. Highlight any updates, confirmations, or contradictions to the document content based on current web information.`
        : "";

      const webSearchResultsSection = webSearchEnabled
        ? `Web Search Results:
${this.formatWebSearchResults(webSearchResults)}`
        : "";

      const prompt = await promptTemplate.format({
        fileCount: state.context?.fileCount || 0,
        totalWords: state.context?.totalWords || 0,
        researchDepth: researchDepth,
        researchPrompt: state.context?.researchPrompt || state.customSettings?.researchPrompt || "General research analysis",
        includeCitations: includeCitations ? "yes" : "no",
        webSearchEnabled: webSearchEnabled ? "yes" : "no",
        citationSection: citationSection,
        webSearchIntegrationSection: webSearchIntegrationSection,
        webSearchResultsSection: webSearchResultsSection,
        content: state.context?.chunks && state.context.chunks.length > 0 
          ? state.context.chunks.slice(0, depthConfig.chunksToAnalyze).join("\n\n---\n\n") 
          : "No document content provided - focusing on web research based on the research prompt.", // Use configured chunk limit
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
