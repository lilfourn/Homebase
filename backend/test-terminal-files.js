#!/usr/bin/env node

/**
 * Test script to verify terminal file context is being passed correctly
 */

require('dotenv').config();
const { createTerminalAgent } = require('./services/agents/terminalAgent');

async function testTerminalWithFiles() {
  console.log('Testing Terminal Agent with File Context\n');
  
  // Create a terminal agent
  const agent = createTerminalAgent({
    modelName: "claude-3-5-sonnet-latest",
    temperature: 0.7,
    responseStyle: "normal",
    debug: true
  });
  
  // Test message
  const message = "What are the key points from the attached files?";
  
  // Mock attached files (simulating what comes from the controller)
  const attachedFiles = [
    {
      fileName: "test-document.txt",
      mimeType: "text/plain",
      content: `This is a test document about machine learning.
      
Key concepts:
1. Supervised Learning: Learning from labeled data
2. Unsupervised Learning: Finding patterns in unlabeled data
3. Neural Networks: Computational models inspired by the brain
4. Deep Learning: Neural networks with multiple layers

Machine learning has revolutionized many fields including computer vision, natural language processing, and robotics.`,
      size: 500
    },
    {
      fileName: "notes.md",
      mimeType: "text/markdown",
      content: `# Meeting Notes

## Action Items
- Review the machine learning proposal
- Schedule follow-up meeting
- Prepare dataset for training

## Discussion Points
- Need to decide on the model architecture
- Consider using transformer models for NLP tasks
- Budget constraints for GPU resources`,
      size: 300
    }
  ];
  
  try {
    console.log(`Processing message: "${message}"`);
    console.log(`With ${attachedFiles.length} attached files\n`);
    
    const result = await agent.processMessage(message, attachedFiles);
    
    if (result.success) {
      console.log('\n✅ SUCCESS\n');
      console.log('Response:', result.content);
      console.log('\nMetadata:', result.metadata);
    } else {
      console.log('\n❌ ERROR\n');
      console.log('Error:', result.error);
      console.log('Content:', result.content);
    }
  } catch (error) {
    console.error('\n❌ EXCEPTION\n');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testTerminalWithFiles().catch(console.error);