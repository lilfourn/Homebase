import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/terminal`,
  timeout: 60000, // 60 seconds for AI processing
});

/**
 * Process a terminal message with AI
 * @param {string} message - The user's message
 * @param {Array} attachedFiles - Array of file objects with content
 * @param {Object} options - Additional options (temperature, model, threadId)
 * @param {string} token - Auth token
 * @returns {Promise<Object>} AI response with threadId
 */
export const processTerminalMessage = async (
  message,
  attachedFiles = [],
  options = {},
  token
) => {
  try {
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };

    const payload = {
      message,
      attachedFiles: attachedFiles.map((file) => ({
        id: file.id,
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: file.size,
        content: file.content || file.processedContent,
        processed: file.processed,
        source: file.source,
      })),
      temperature: options.temperature,
      model: options.model,
      responseStyle: options.responseStyle,
      threadId: options.threadId,
      imageData: options.imageData,
    };

    const response = await api.post("/process", payload, config);
    return response.data;
  } catch (error) {
    console.error("Error processing terminal message:", error);

    // Handle rate limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.data.retryAfter || 3600000;
      const retryDate = new Date(Date.now() + retryAfter);
      throw new Error(
        `Rate limit exceeded. Please try again at ${retryDate.toLocaleTimeString()}`
      );
    }

    throw error.response?.data || error;
  }
};

/**
 * Get terminal usage statistics
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Usage statistics
 */
export const getTerminalUsage = async (token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await api.get("/usage", config);
    return response.data;
  } catch (error) {
    console.error("Error getting terminal usage:", error);
    throw error.response?.data || error;
  }
};
