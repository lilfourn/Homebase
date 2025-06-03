require("dotenv").config();
const axios = require("axios");

const API_URL = process.env.API_URL || "http://localhost:3000";
const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN; // You'll need to set this

async function testResearcherWithWebSearch() {
  console.log("🔬 Testing Researcher Agent with Web Search...\n");

  try {
    // Test 1: Check if web search is available
    console.log("1️⃣ Testing web search availability...");
    const searchTest = await axios.post(
      `${API_URL}/api/agents/test-web-search`,
      { query: "latest AI research papers 2024" },
      {
        headers: {
          Authorization: `Bearer ${TEST_USER_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Web search test result:");
    console.log("- Test Mode:", searchTest.data.testMode);
    console.log(
      "- Search Provider:",
      searchTest.data.providers?.searchProvider || "none"
    );
    console.log(
      "- Content Extractor:",
      searchTest.data.providers?.contentExtractor || "none"
    );

    if (searchTest.data.testMode === "full") {
      const results = searchTest.data.results;
      console.log(`- URLs Found: ${results.searchResults?.length || 0}`);
      console.log(
        `- Content Extracted: ${results.extractedContent?.length || 0}`
      );

      if (results.extractedContent && results.extractedContent.length > 0) {
        console.log("\n📄 Sample Extracted Content:");
        const firstExtraction = results.extractedContent[0];
        console.log(`- Title: ${firstExtraction.title}`);
        console.log(`- URL: ${firstExtraction.url}`);
        console.log(
          `- Content preview: ${firstExtraction.content?.substring(0, 150)}...`
        );
      }
    } else {
      console.log(
        "- Results Count:",
        searchTest.data.results?.results?.length || 0
      );
      console.log("⚠️", searchTest.data.message);
    }
    console.log("\n");

    // Test 2: Create a researcher task with web search
    console.log("2️⃣ Creating researcher task with web search...");

    // Sample test data - you'll need to adjust based on your file structure
    const taskData = {
      agentType: "researcher",
      courseInstanceId: "test-course-123", // Replace with actual course ID
      files: [
        {
          fileId: "test-file-1",
          fileName: "sample-research.pdf",
          content:
            "This is a sample research document about artificial intelligence and machine learning advances in 2024.",
        },
      ],
      config: {
        researchDepth: "deep",
        includeWebSearch: true,
        includeCitations: true,
        specificQuestions: [
          "What are the latest AI breakthroughs in 2024?",
          "How do current findings compare to the research in this document?",
        ],
        webSearchQueries: [
          "AI breakthroughs 2024",
          "machine learning advances latest",
        ],
      },
      taskName: "Test Research with Web Search",
    };

    const createResponse = await axios.post(
      `${API_URL}/api/agents/tasks`,
      taskData,
      {
        headers: {
          Authorization: `Bearer ${TEST_USER_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Task created:", {
      taskId: createResponse.data.taskId,
      jobId: createResponse.data.jobId,
      message: createResponse.data.message,
    });

    const taskId = createResponse.data.taskId;
    console.log("\n");

    // Test 3: Monitor task progress
    console.log("3️⃣ Monitoring task progress...");
    let taskComplete = false;
    let attempts = 0;
    const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes max

    while (!taskComplete && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

      const statusResponse = await axios.get(
        `${API_URL}/api/agents/tasks/${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${TEST_USER_TOKEN}`,
          },
        }
      );

      const task = statusResponse.data.data;
      console.log(`📊 Status: ${task.status} | Progress: ${task.progress}%`);

      if (task.status === "completed" || task.status === "failed") {
        taskComplete = true;

        if (task.status === "completed") {
          console.log("\n✅ Task completed successfully!");

          // Display results summary
          if (task.result && task.result.metadata) {
            console.log("\n📈 Results Summary:");
            console.log("- Agent Type:", task.result.metadata.agentType);
            console.log(
              "- Research Depth:",
              task.result.metadata.researchDepth
            );
            console.log(
              "- Web Search Enabled:",
              task.result.metadata.webSearchEnabled
            );
            console.log(
              "- Search Provider:",
              task.result.metadata.webSearchProvider
            );
            console.log(
              "- Content Extractor:",
              task.result.metadata.contentExtractor
            );

            // Show web search specific metadata
            if (task.result.metadata.webSearchMetadata) {
              const webMeta = task.result.metadata.webSearchMetadata;
              console.log("\n🔍 Web Search Details:");
              console.log("- Queries Used:", webMeta.queriesUsed?.join(", "));
              console.log("- Total Sources Found:", webMeta.totalSourcesFound);
              console.log(
                "- Content Extracted From:",
                webMeta.contentExtracted,
                "pages"
              );
            }

            console.log("\n📊 Analysis Metrics:");
            console.log("- Themes Found:", task.result.metadata.themesFound);
            console.log(
              "- Insights Count:",
              task.result.metadata.insightsCount
            );
            console.log(
              "- Recommendations:",
              task.result.metadata.recommendationsCount
            );
            console.log(
              "- Total Words Analyzed:",
              task.result.metadata.totalWords
            );

            // Show a snippet of the content
            if (task.result.content) {
              console.log("\n📝 Content Preview (first 500 chars):");
              console.log(task.result.content.substring(0, 500) + "...");

              // Check if web results are included
              if (task.result.content.includes("## Web Research Results")) {
                console.log(
                  "\n✨ Web research results are included in the analysis!"
                );
              }
            }
          }
        } else {
          console.log("\n❌ Task failed:", task.error);
        }
      }

      attempts++;
    }

    if (!taskComplete) {
      console.log("\n⚠️ Task did not complete within timeout period");
    }
  } catch (error) {
    console.error("\n❌ Test failed:", error.response?.data || error.message);
    if (error.response?.status === 503) {
      console.log("\n⚠️ Web search service not available.");
      console.log("You need to configure:");
      console.log("1. BRAVE_SEARCH_API_KEY - for finding URLs");
      console.log("2. TAVILY_API_KEY - for extracting content");
      console.log("\nSee backend/WEB_SEARCH_SETUP.md for instructions.");
    }
  }
}

// Run the test
console.log("🚀 Starting Researcher Agent Web Search Test\n");
console.log("Prerequisites:");
console.log("- Backend server must be running");
console.log("- Redis must be running");
console.log("- Worker must be running");
console.log("- BRAVE_SEARCH_API_KEY must be configured (for URL discovery)");
console.log("- TAVILY_API_KEY must be configured (for content extraction)");
console.log("- TEST_USER_TOKEN must be set in .env\n");

if (!TEST_USER_TOKEN) {
  console.error("❌ TEST_USER_TOKEN not found in environment variables");
  console.log("Please set TEST_USER_TOKEN in your .env file");
  process.exit(1);
}

testResearcherWithWebSearch()
  .then(() => {
    console.log("\n✅ All tests completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test suite failed:", error);
    process.exit(1);
  });
