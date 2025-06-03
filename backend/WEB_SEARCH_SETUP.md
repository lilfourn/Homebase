# Web Search Setup for Researcher Agent

The researcher agent uses a powerful two-stage approach to gather information from the web:

1. **Brave Search** - Finds relevant URLs based on your research queries
2. **Tavily** - Extracts detailed content from those URLs for in-depth analysis

This combination provides both broad coverage and deep content extraction for comprehensive research.

## Overview

The system uses:

- **Brave Search** - Privacy-focused search engine to find relevant URLs
- **Tavily API** - AI-optimized content extraction from specific pages
- Optional fallback providers for search (Serper, SerpApi) and extraction (ScrapingBee)

## Setup Instructions

### 1. Set up Brave Search (Required for URL Discovery)

Brave Search provides high-quality, privacy-focused search results.

1. Sign up at [https://brave.com/search/api/](https://brave.com/search/api/)
2. Get your API key from the dashboard
3. Add to your `.env` file:
   ```
   BRAVE_SEARCH_API_KEY=your_brave_search_api_key_here
   ```

### 2. Set up Tavily (Required for Content Extraction)

Tavily extracts and analyzes content from the URLs found by Brave Search.

1. Sign up at [https://tavily.com](https://tavily.com)
2. Get your API key from the dashboard
3. Add to your `.env` file:
   ```
   TAVILY_API_KEY=your_tavily_api_key_here
   ```

### 3. Optional Fallback Providers

#### Alternative Search Providers

If Brave Search is not available, the system can fall back to:

**Serper API** (Google Search results):

```
SERPER_API_KEY=your_serper_api_key_here
```

**SerpApi** (Multiple search engines):

```
SERPAPI_KEY=your_serpapi_key_here
```

#### Alternative Content Extraction

**ScrapingBee** (For sites that Tavily can't access):

```
SCRAPINGBEE_API_KEY=your_scrapingbee_api_key_here
```

## How It Works

1. **Search Phase**: The researcher agent uses Brave Search to find the most relevant URLs for your research queries
2. **Extraction Phase**: Tavily then visits the top URLs and extracts detailed content, providing:
   - Full text content
   - AI-generated summaries
   - Structured data extraction
   - Published dates and metadata

This two-stage approach ensures you get both breadth (many relevant sources) and depth (detailed content from each source).

## Using Web Search with Researcher Agent

### Via API

When creating a researcher task, web search is enabled by default:

```javascript
{
  "agentType": "researcher",
  "files": [...],
  "config": {
    "researchDepth": "deep",
    "includeWebSearch": true,
    "includeCitations": true,
    "specificQuestions": [
      "What are the latest developments in quantum computing?",
      "How does this compare to recent research papers?"
    ],
    "webSearchQueries": [
      "quantum computing breakthroughs 2024",
      "quantum supremacy latest research"
    ]
  }
}
```

### Configuration Options

- `includeWebSearch`: Enable/disable web search (default: true)
- `specificQuestions`: Array of specific research questions to explore
- `webSearchQueries`: Array of specific search queries to use (optional - will auto-generate if not provided)

## Testing Your Setup

Test if both services are properly configured:

```bash
curl -X POST http://localhost:3000/api/agents/test-web-search \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "latest AI research papers 2024"
  }'
```

A successful response will show:

- Search provider: "brave" (or your fallback)
- Content extractor: "tavily" (or your fallback)
- Search results with extracted content

## Understanding the Results

The researcher agent will provide:

1. **Search Results**: A list of relevant URLs found by Brave Search
2. **Extracted Content**: Detailed content from the top pages, including:
   - Full text excerpts
   - AI-generated summaries
   - Published dates
   - Source metadata
3. **Integrated Analysis**: The agent combines this web data with your uploaded documents for comprehensive insights

## Cost Considerations

- **Brave Search**: Typically offers generous free tier
- **Tavily**: Optimized for AI use cases, check current pricing
- The system limits searches to 3 queries per task and extracts content from top 5 URLs per query
- Monitor your usage through each provider's dashboard

## Troubleshooting

1. **"Web search service is not available"**: Ensure both BRAVE_SEARCH_API_KEY and TAVILY_API_KEY are in your `.env` file

2. **No search results**: Check your Brave Search API key and quota

3. **No extracted content**: Verify your Tavily API key and remaining credits

4. **Partial results**: Some sites may block extraction - this is normal

## Security Notes

- Keep all API keys in your backend `.env` file only
- Never expose API keys in frontend code or commits
- Use environment variables for all sensitive data
- Consider implementing rate limiting to prevent abuse
