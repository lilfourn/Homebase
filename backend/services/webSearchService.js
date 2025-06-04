const { Tool } = require("@langchain/core/tools");
const { z } = require("zod");

class EnhancedWebSearchTool extends Tool {
  constructor(webSearchService) {
    super();
    this.name = "enhanced_web_search";
    this.description = "Search the web and extract content from results";
    this.schema = z.object({
      query: z.string().describe("Search query"),
      numResults: z.number().default(5).describe("Number of results"),
      extractContent: z
        .boolean()
        .default(true)
        .describe("Extract page content"),
    });
    this.webSearchService = webSearchService;
  }

  async _call(input) {
    try {
      const { query, numResults, extractContent } = input;

      if (!this.webSearchService.isAvailable()) {
        return JSON.stringify({
          success: false,
          error: "Web search service not configured",
        });
      }

      const results = await this.webSearchService.searchAndExtract(query, {
        num: numResults,
        extractCount: extractContent ? Math.min(numResults, 3) : 0,
        depth: "advanced",
      });

      return JSON.stringify({
        success: true,
        results: results,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = EnhancedWebSearchTool;
