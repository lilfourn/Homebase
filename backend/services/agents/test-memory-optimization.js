/**
 * Test script for memory management and token optimization features
 * Run with: node test-memory-optimization.js
 */

const { createOptimizedAgent } = require("./baseAgent");
const { MemoryManager } = require("./memoryManager");
const { TokenOptimizer } = require("./tokenOptimizer");

async function testMemoryManager() {
  console.log("\n=== Testing Memory Manager ===\n");
  
  const memoryManager = new MemoryManager({
    maxMessages: 5,
    maxTokens: 1000,
    compressionThreshold: 3
  });
  
  // Add some test messages
  const { HumanMessage, AIMessage } = require("@langchain/core/messages");
  
  console.log("Adding messages to memory...");
  memoryManager.addMessage(new HumanMessage("What is the capital of France?"));
  memoryManager.addMessage(new AIMessage("The capital of France is Paris."));
  memoryManager.addMessage(new HumanMessage("Tell me more about Paris."));
  memoryManager.addMessage(new AIMessage("Paris is known as the City of Light..."));
  memoryManager.addMessage(new HumanMessage("What about its population?"));
  memoryManager.addMessage(new AIMessage("Paris has a population of about 2.2 million..."));
  
  // Check stats
  const stats = memoryManager.getStats();
  console.log("\nMemory Stats:", stats);
  
  // Test relevance filtering
  const relevantMessages = memoryManager.getRelevantMessages("population statistics");
  console.log("\nRelevant messages for 'population statistics':", relevantMessages.length);
  
  // Add more messages to trigger compression
  console.log("\nAdding more messages to trigger compression...");
  memoryManager.addMessage(new HumanMessage("What about tourism?"));
  memoryManager.addMessage(new AIMessage("Paris attracts over 30 million tourists annually..."));
  
  const statsAfterCompression = memoryManager.getStats();
  console.log("\nStats after compression:", statsAfterCompression);
}

async function testTokenOptimizer() {
  console.log("\n=== Testing Token Optimizer ===\n");
  
  const optimizer = new TokenOptimizer({
    modelName: "claude-3-5-sonnet-latest",
    maxTokens: 8000
  });
  
  // Test token estimation
  const sampleText = "This is a sample text with some code: function hello() { console.log('Hello World'); } and a URL: https://example.com/path/to/resource";
  const tokens = optimizer.estimateTokens(sampleText);
  console.log(`Sample text tokens: ${tokens} (${sampleText.length} chars)`);
  
  // Test prompt optimization
  const verbosePrompt = "Could you please help me understand what the following code does?";
  const optimized = optimizer.optimizePrompt(verbosePrompt);
  console.log("\nOriginal prompt:", verbosePrompt);
  console.log("Optimized prompt:", optimized);
  console.log(`Token savings: ${optimizer.estimateTokens(verbosePrompt) - optimizer.estimateTokens(optimized)}`);
  
  // Test token budget calculation
  const budget = optimizer.calculateTokenBudget();
  console.log("\nToken Budget:", budget);
  
  // Test text truncation
  const longText = "Lorem ipsum ".repeat(1000);
  const truncated = optimizer.truncateToTokenLimit(longText, 100);
  console.log("\nTruncated text tokens:", optimizer.estimateTokens(truncated));
}

async function testOptimizedAgent() {
  console.log("\n=== Testing Optimized Agent ===\n");
  
  // Skip if no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("Skipping agent test - ANTHROPIC_API_KEY not set");
    return;
  }
  
  const agent = createOptimizedAgent({
    responseStyle: "concise",
    memoryConfig: {
      maxMessages: 10,
      maxTokens: 4000,
      compressionThreshold: 5
    },
    debug: true
  });
  
  console.log("Agent created with memory optimization enabled");
  
  // Simulate a conversation
  try {
    console.log("\nUser: What is machine learning?");
    await agent.invoke("What is machine learning?");
    
    console.log("\nUser: Can you give me an example?");
    await agent.invoke("Can you give me an example?");
    
    // Check memory stats
    const memoryStats = agent.getMemoryStats();
    console.log("\nMemory Stats:", memoryStats);
    
    // Check token stats
    const tokenStats = await agent.getTokenStats();
    console.log("\nToken Stats:", tokenStats);
    
  } catch (error) {
    console.error("Agent test error:", error.message);
  }
}

// Run tests
async function runTests() {
  try {
    await testMemoryManager();
    await testTokenOptimizer();
    await testOptimizedAgent();
    
    console.log("\n=== All tests completed ===\n");
  } catch (error) {
    console.error("Test error:", error);
  }
}

// Run if called directly
if (require.main === module) {
  runTests();
}

module.exports = { testMemoryManager, testTokenOptimizer, testOptimizedAgent };