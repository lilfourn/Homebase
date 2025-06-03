const axios = require("axios");

class WebSearchService {
  constructor() {
    this.searchProviders = {
      brave: {
        apiKey: process.env.BRAVE_SEARCH_API_KEY,
        baseUrl: "https://api.search.brave.com/res/v1/web/search",
        enabled: !!process.env.BRAVE_SEARCH_API_KEY,
      },
      serpapi: {
        apiKey: process.env.SERPAPI_KEY,
        baseUrl: "https://serpapi.com/search",
        enabled: !!process.env.SERPAPI_KEY,
      },
      serper: {
        apiKey: process.env.SERPER_API_KEY,
        baseUrl: "https://google.serper.dev/search",
        enabled: !!process.env.SERPER_API_KEY,
      },
    };

    // Tavily is now specifically for content extraction
    this.contentExtractors = {
      tavily: {
        apiKey: process.env.TAVILY_API_KEY,
        baseUrl: "https://api.tavily.com/search",
        enabled: !!process.env.TAVILY_API_KEY,
      },
      scrapingbee: {
        apiKey: process.env.SCRAPINGBEE_API_KEY,
        baseUrl: "https://app.scrapingbee.com/api/v1/",
        enabled: !!process.env.SCRAPINGBEE_API_KEY,
      },
    };

    // Select the first available search provider (prefer Brave)
    this.activeSearchProvider = this.searchProviders.brave.enabled
      ? "brave"
      : Object.keys(this.searchProviders).find(
          (provider) => this.searchProviders[provider].enabled
        );

    // Select content extractor (prefer Tavily)
    this.activeContentExtractor = this.contentExtractors.tavily.enabled
      ? "tavily"
      : this.contentExtractors.scrapingbee.enabled
        ? "scrapingbee"
        : null;

    if (!this.activeSearchProvider) {
      console.warn(
        "[WebSearchService] No web search API keys configured. Web search functionality will be limited."
      );
    }

    if (!this.activeContentExtractor) {
      console.warn(
        "[WebSearchService] No content extraction API keys configured. Content extraction will be limited."
      );
    }
  }

  /**
   * Perform a web search to find relevant URLs
   * @param {string} query - The search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results with URLs
   */
  async searchForUrls(query, options = {}) {
    if (!this.activeSearchProvider) {
      console.error("[WebSearchService] No web search provider configured");
      return {
        success: false,
        error: "No web search provider configured",
        results: [],
      };
    }

    try {
      switch (this.activeSearchProvider) {
        case "brave":
          return await this.searchWithBrave(query, options);
        case "serpapi":
          return await this.searchWithSerpApi(query, options);
        case "serper":
          return await this.searchWithSerper(query, options);
        default:
          throw new Error(`Unknown provider: ${this.activeSearchProvider}`);
      }
    } catch (error) {
      console.error(
        `[WebSearchService] Web search error with ${this.activeSearchProvider}:`,
        error
      );
      return {
        success: false,
        error: error.message,
        results: [],
      };
    }
  }

  /**
   * Extract detailed content from URLs using Tavily or other extractors
   * @param {Array<string>} urls - Array of URLs to extract content from
   * @param {string} query - Original search query for context
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} Extracted content
   */
  async extractContentFromUrls(urls, query, options = {}) {
    if (!this.activeContentExtractor) {
      console.error("[WebSearchService] No content extractor configured");
      return {
        success: false,
        error: "No content extractor configured",
        extractedContent: [],
      };
    }

    try {
      switch (this.activeContentExtractor) {
        case "tavily":
          return await this.extractWithTavily(urls, query, options);
        case "scrapingbee":
          return await this.extractWithScrapingBee(urls, options);
        default:
          throw new Error(`Unknown extractor: ${this.activeContentExtractor}`);
      }
    } catch (error) {
      console.error(
        `[WebSearchService] Content extraction error with ${this.activeContentExtractor}:`,
        error
      );
      return {
        success: false,
        error: error.message,
        extractedContent: [],
      };
    }
  }

  /**
   * Combined search and extract workflow
   * @param {string} query - The search query
   * @param {Object} options - Options for both search and extraction
   * @returns {Promise<Object>} Combined results
   */
  async searchAndExtract(query, options = {}) {
    // Step 1: Search for URLs
    const searchResults = await this.searchForUrls(query, options);

    if (!searchResults.success || searchResults.results.length === 0) {
      return searchResults;
    }

    // Step 2: Extract top URLs for content
    const topUrls = searchResults.results
      .slice(0, options.extractCount || 5)
      .map((result) => result.url);

    const extractedContent = await this.extractContentFromUrls(
      topUrls,
      query,
      options
    );

    return {
      success: true,
      searchProvider: this.activeSearchProvider,
      contentExtractor: this.activeContentExtractor,
      searchResults: searchResults.results,
      extractedContent: extractedContent.extractedContent || [],
      combinedData: this.combineSearchAndContent(
        searchResults.results,
        extractedContent.extractedContent || []
      ),
    };
  }

  /**
   * Search using Brave Search API
   */
  async searchWithBrave(query, options) {
    const provider = this.searchProviders.brave;
    const params = {
      q: query,
      count: options.num || 10,
      ...options,
    };

    const response = await axios.get(provider.baseUrl, {
      params,
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": provider.apiKey,
      },
    });

    return {
      success: true,
      provider: "brave",
      results: this.formatBraveResults(response.data),
    };
  }

  /**
   * Extract content using Tavily (focused on specific URLs)
   */
  async extractWithTavily(urls, query, options) {
    const extractor = this.contentExtractors.tavily;

    // Tavily can be used in a targeted way by including URLs in the query
    const data = {
      api_key: extractor.apiKey,
      query: `${query} site:${urls.join(" OR site:")}`,
      search_depth: options.depth || "advanced",
      max_results: urls.length,
      include_answer: true,
      include_raw_content: true,
      include_domains: urls.map((url) => new URL(url).hostname),
      ...options,
    };

    const response = await axios.post(extractor.baseUrl, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return {
      success: true,
      extractor: "tavily",
      extractedContent: this.formatTavilyExtractedContent(response.data),
      answer: response.data.answer,
    };
  }

  /**
   * Extract content using ScrapingBee
   */
  async extractWithScrapingBee(urls, options) {
    const extractor = this.contentExtractors.scrapingbee;
    const extractedContent = [];

    // Process URLs in parallel (limit to prevent overwhelming the API)
    const batchSize = 3;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchPromises = batch.map((url) =>
        this.fetchWithScrapingBee(url, options)
      );

      try {
        const results = await Promise.allSettled(batchPromises);
        results.forEach((result, index) => {
          if (result.status === "fulfilled" && result.value.success) {
            extractedContent.push({
              url: batch[index],
              content: result.value.content,
              title: result.value.title || "",
            });
          }
        });
      } catch (error) {
        console.error(`[WebSearchService] Batch extraction error:`, error);
      }
    }

    return {
      success: true,
      extractor: "scrapingbee",
      extractedContent,
    };
  }

  /**
   * Legacy search method for backward compatibility
   */
  async search(query, options = {}) {
    return await this.searchForUrls(query, options);
  }

  /**
   * Format Brave Search results
   */
  formatBraveResults(data) {
    const webResults = data.web?.results || [];

    return webResults.map((result, index) => ({
      title: result.title,
      url: result.url,
      snippet: result.description,
      position: index + 1,
      source: new URL(result.url).hostname,
      age: result.age,
      language: result.language,
    }));
  }

  /**
   * Search using SerpApi
   */
  async searchWithSerpApi(query, options) {
    const provider = this.searchProviders.serpapi;
    const params = {
      api_key: provider.apiKey,
      q: query,
      engine: "google",
      num: options.num || 10,
      ...options,
    };

    const response = await axios.get(provider.baseUrl, { params });

    return {
      success: true,
      provider: "serpapi",
      results: this.formatSerpApiResults(response.data),
    };
  }

  /**
   * Search using Serper API
   */
  async searchWithSerper(query, options) {
    const provider = this.searchProviders.serper;
    const data = {
      q: query,
      num: options.num || 10,
      ...options,
    };

    const response = await axios.post(provider.baseUrl, data, {
      headers: {
        "X-API-KEY": provider.apiKey,
        "Content-Type": "application/json",
      },
    });

    return {
      success: true,
      provider: "serper",
      results: this.formatSerperResults(response.data),
    };
  }

  /**
   * Format SerpApi results to a common structure
   */
  formatSerpApiResults(data) {
    const organicResults = data.organic_results || [];

    return organicResults.map((result) => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      position: result.position,
      source: result.source,
    }));
  }

  /**
   * Format Serper results to a common structure
   */
  formatSerperResults(data) {
    const organicResults = data.organic || [];

    return organicResults.map((result, index) => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      position: index + 1,
      source: new URL(result.link).hostname,
    }));
  }

  /**
   * Format Tavily extracted content
   */
  formatTavilyExtractedContent(data) {
    const results = data.results || [];

    return results.map((result) => ({
      url: result.url,
      title: result.title,
      content: result.raw_content || result.content,
      snippet: result.content,
      score: result.score,
      publishedDate: result.published_date,
    }));
  }

  /**
   * Get content from a specific URL
   */
  async fetchUrlContent(url, options = {}) {
    try {
      // Use a scraping service if available
      if (process.env.SCRAPINGBEE_API_KEY) {
        return await this.fetchWithScrapingBee(url, options);
      }

      // Fallback to direct fetch (may not work for all sites)
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ResearcherBot/1.0)",
        },
        timeout: options.timeout || 10000,
      });

      return {
        success: true,
        content: response.data,
        url: url,
      };
    } catch (error) {
      console.error(
        `[WebSearchService] Error fetching URL content: ${url}`,
        error
      );
      return {
        success: false,
        error: error.message,
        url: url,
      };
    }
  }

  /**
   * Fetch content using ScrapingBee
   */
  async fetchWithScrapingBee(url, options) {
    const params = {
      api_key: process.env.SCRAPINGBEE_API_KEY,
      url: url,
      render_js: options.renderJs || false,
      extract_rules: options.extractRules || {
        title: "title",
        description: 'meta[name="description"]@content',
        body: "body",
      },
    };

    const response = await axios.get("https://app.scrapingbee.com/api/v1/", {
      params,
    });

    return {
      success: true,
      content: response.data,
      url: url,
      title: response.data.title,
    };
  }

  /**
   * Combine search results with extracted content
   */
  combineSearchAndContent(searchResults, extractedContent) {
    const contentMap = new Map(
      extractedContent.map((item) => [item.url, item])
    );

    return searchResults.map((result) => ({
      ...result,
      extractedContent: contentMap.get(result.url) || null,
      hasDetailedContent: contentMap.has(result.url),
    }));
  }

  /**
   * Check if web search is available
   */
  isAvailable() {
    return !!this.activeSearchProvider || !!this.activeContentExtractor;
  }

  /**
   * Get the current provider names
   */
  getProviders() {
    return {
      searchProvider: this.activeSearchProvider || "none",
      contentExtractor: this.activeContentExtractor || "none",
    };
  }

  /**
   * Legacy method for backward compatibility
   */
  getProvider() {
    return this.activeSearchProvider || "none";
  }
}

module.exports = new WebSearchService();
