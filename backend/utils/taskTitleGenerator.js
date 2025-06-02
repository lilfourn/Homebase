const { ChatOpenAI } = require("@langchain/openai");
const { PromptTemplate } = require("@langchain/core/prompts");

// Initialize the LLM for title generation
const titleGeneratorLLM = new ChatOpenAI({
  modelName: "gpt-3.5-turbo", // Using a smaller, faster model for title generation
  temperature: 0.3,
  maxTokens: 50,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

const TITLE_GENERATION_PROMPT = `
You are a helpful assistant that generates concise, descriptive titles for academic documents.

Given the following content from {fileCount} document(s), generate a short, descriptive title (3-7 words) that captures the main topic or theme.

Content preview:
{contentPreview}

Generate ONLY the title, nothing else. Make it specific and academic in tone.
`;

/**
 * Generates an AI-powered title for agent tasks based on document content
 * @param {Array} files - Array of file objects with content
 * @param {string} agentType - Type of agent (note-taker, researcher, etc.)
 * @returns {Promise<string>} Generated task title
 */
async function generateTaskTitle(files, agentType) {
  try {
    // Extract content preview from files (first 500 chars from each file, up to 3 files)
    const contentPreviews = files
      .slice(0, 3)
      .map((file) => {
        const content = file.content || "";
        return content.substring(0, 500).trim();
      })
      .filter((preview) => preview.length > 0);

    if (contentPreviews.length === 0) {
      // Fallback to default title if no content available
      return getDefaultTitle(agentType);
    }

    const contentPreview = contentPreviews.join("\n\n---\n\n");

    // Generate title using AI
    const promptTemplate = PromptTemplate.fromTemplate(TITLE_GENERATION_PROMPT);
    const prompt = await promptTemplate.format({
      fileCount: files.length,
      contentPreview: contentPreview,
    });

    const response = await titleGeneratorLLM.invoke(prompt);
    const baseTitle = response.content.trim();

    // Format title based on agent type
    return formatTitleForAgentType(baseTitle, agentType);
  } catch (error) {
    console.error("[TaskTitleGenerator] Error generating title:", error);
    // Fallback to default title on error
    return getDefaultTitle(agentType);
  }
}

/**
 * Formats the generated title based on the agent type
 * @param {string} baseTitle - The AI-generated base title
 * @param {string} agentType - Type of agent
 * @returns {string} Formatted title
 */
function formatTitleForAgentType(baseTitle, agentType) {
  // Remove any trailing punctuation from base title
  const cleanTitle = baseTitle.replace(/[.,;:!?]+$/, "");

  switch (agentType) {
    case "note-taker":
      return `${cleanTitle} Notes`;
    case "researcher":
      return `${cleanTitle} Research`;
    case "study-buddy":
      return `${cleanTitle} Study Guide`;
    case "assignment":
      return `${cleanTitle} Assignment`;
    default:
      return cleanTitle;
  }
}

/**
 * Gets a default title based on agent type
 * @param {string} agentType - Type of agent
 * @returns {string} Default title
 */
function getDefaultTitle(agentType) {
  const timestamp = new Date().toLocaleTimeString();
  switch (agentType) {
    case "note-taker":
      return `Notes - ${timestamp}`;
    case "researcher":
      return `Research - ${timestamp}`;
    case "study-buddy":
      return `Study Guide - ${timestamp}`;
    case "assignment":
      return `Assignment - ${timestamp}`;
    default:
      return `${agentType} Task - ${timestamp}`;
  }
}

module.exports = {
  generateTaskTitle,
  formatTitleForAgentType,
  getDefaultTitle,
};
