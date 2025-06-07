const axios = require('axios');

/**
 * Web Search Service Implementation
 * Provides web search functionality with multiple provider support
 */
class WebSearchService {
  constructor() {
    this.providers = {
      brave: {
        apiKey: process.env.BRAVE_SEARCH_API_KEY,
        endpoint: 'https://api.search.brave.com/res/v1/web/search'
      },
      tavily: {
        apiKey: process.env.TAVILY_API_KEY,
        endpoint: 'https://api.tavily.com/search'
      }
    };
    
    this.activeProvider = this.getActiveProvider();
  }

  /**
   * Determine which provider is available
   */
  getActiveProvider() {
    if (this.providers.tavily.apiKey) {
      return 'tavily';
    } else if (this.providers.brave.apiKey) {
      return 'brave';
    }
    return null;
  }

  /**
   * Check if service is available
   */
  isAvailable() {
    return this.activeProvider !== null;
  }

  /**
   * Search for URLs
   */
  async searchForUrls(query, options = {}) {
    try {
      if (!this.isAvailable()) {
        return {
          success: false,
          error: 'No search provider configured',
          results: []
        };
      }

      if (this.activeProvider === 'tavily') {
        return await this.searchWithTavily(query, options);
      } else if (this.activeProvider === 'brave') {
        return await this.searchWithBrave(query, options);
      }
    } catch (error) {
      console.error('[WebSearchService] Search error:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Search with Tavily
   */
  async searchWithTavily(query, options = {}) {
    try {
      const response = await axios.post(this.providers.tavily.endpoint, {
        api_key: this.providers.tavily.apiKey,
        query: query,
        search_depth: 'basic',
        max_results: options.num || 5,
        include_answer: true,
        include_raw_content: false
      });

      const results = response.data.results || [];
      
      return {
        success: true,
        results: results.map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.content || r.snippet || ''
        })),
        answer: response.data.answer || null
      };
    } catch (error) {
      console.error('[WebSearchService] Tavily error:', error);
      throw error;
    }
  }

  /**
   * Search with Brave
   */
  async searchWithBrave(query, options = {}) {
    try {
      const params = {
        q: query,
        count: options.num || 5
      };

      const response = await axios.get(this.providers.brave.endpoint, {
        params,
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': this.providers.brave.apiKey
        }
      });

      const results = response.data.web?.results || [];
      
      return {
        success: true,
        results: results.map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.description || ''
        }))
      };
    } catch (error) {
      console.error('[WebSearchService] Brave error:', error);
      throw error;
    }
  }

  /**
   * Extract content from URLs
   */
  async extractContentFromUrls(urls, query = '', options = {}) {
    try {
      // For now, we'll return a simple implementation
      // In production, you'd want to use a proper content extraction service
      const extractedContent = [];
      
      for (const url of urls.slice(0, 3)) { // Limit to 3 URLs
        try {
          // In a real implementation, you'd fetch and parse the URL content
          // For now, we'll return a placeholder
          extractedContent.push({
            url: url,
            title: `Content from ${url}`,
            content: `This is where the extracted content from ${url} would appear. In a production system, this would use a service like Firecrawl or similar to extract clean text from the webpage.`,
            snippet: `Preview of content from ${url}`
          });
        } catch (error) {
          console.error(`Failed to extract content from ${url}:`, error);
        }
      }

      return {
        success: true,
        extractedContent
      };
    } catch (error) {
      console.error('[WebSearchService] Content extraction error:', error);
      return {
        success: false,
        error: error.message,
        extractedContent: []
      };
    }
  }

  /**
   * Combined search and extract
   */
  async searchAndExtract(query, options = {}) {
    try {
      // First search
      const searchResults = await this.searchForUrls(query, options);
      
      if (!searchResults.success || searchResults.results.length === 0) {
        return searchResults;
      }

      // Extract URLs from search results
      const urls = searchResults.results
        .slice(0, options.extractCount || 3)
        .map(r => r.url);

      // Extract content
      const extractResult = await this.extractContentFromUrls(urls, query, options);

      return {
        success: true,
        searchResults: searchResults.results,
        extractedContent: extractResult.extractedContent || [],
        answer: searchResults.answer || null
      };
    } catch (error) {
      console.error('[WebSearchService] Search and extract error:', error);
      return {
        success: false,
        error: error.message,
        searchResults: [],
        extractedContent: []
      };
    }
  }
}

// Create singleton instance
const webSearchService = new WebSearchService();

module.exports = webSearchService;