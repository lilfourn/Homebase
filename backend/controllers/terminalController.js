const { createTerminalAgent } = require("../services/agents/terminalAgent");
const User = require("../models/users.model");
const mongoose = require("mongoose");
const crypto = require("crypto");

// In-memory agent cache (in production, consider a more persistent cache like Redis)
const agentCache = new Map();
const AGENT_CACHE_TTL = 3600000; // 1 hour in ms

// In-memory rate limiting store (in production, use Redis)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 3600000; // 1 hour in ms
const MAX_REQUESTS_PER_HOUR = 100;
const MAX_TOKENS_PER_HOUR = 100000;

/**
 * Terminal Controller - Handles AI assistant interactions
 */
const terminalController = {
  /**
   * Process a terminal message with optional file attachments
   */
  async processMessage(req, res) {
    const startTime = Date.now();
    let tokenCount = 0;

    try {
      const authData = req.auth();
      const userId = authData?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      // Check rate limits
      const rateLimitResult = checkRateLimit(userId);
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          success: false,
          error: rateLimitResult.message,
          retryAfter: rateLimitResult.retryAfter,
        });
      }

      // Validate request body
      const {
        message,
        attachedFiles = [],
        temperature,
        model,
        responseStyle,
        threadId,
        imageData, // Receive imageData from the frontend
      } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({
          success: false,
          error: "Message is required and must be a string",
        });
      }

      // Message length validation
      if (message.length > 2000) {
        return res.status(400).json({
          success: false,
          error: "Message exceeds maximum length of 2000 characters",
        });
      }

      // Validate attached files
      if (!Array.isArray(attachedFiles)) {
        return res.status(400).json({
          success: false,
          error: "Attached files must be an array",
        });
      }

      if (attachedFiles.length > 10) {
        return res.status(400).json({
          success: false,
          error: "Maximum 10 files can be attached",
        });
      }

      // The `imageData` field is now passed directly from the frontend.
      // The old `processedFiles` logic is no longer needed for vision capabilities.
      console.log(
        `[Terminal] Received message with ${attachedFiles.length} attached files.`
      );
      if (imageData) {
        console.log(
          `[Terminal] Image data received for processing (${imageData.mimeType})`
        );
      }

      // Calculate approximate token count for rate limiting (text only for now)
      tokenCount = estimateTokenCount(message, []); // Text-based files are not the focus here

      // Check token rate limit
      if (!checkTokenLimit(userId, tokenCount)) {
        return res.status(429).json({
          success: false,
          error: "Token limit exceeded. Please try again later.",
          retryAfter: RATE_LIMIT_WINDOW,
        });
      }

      // Get or create agent instance from cache
      const agent = getOrCreateAgent(
        threadId,
        {
          temperature: temperature || 0.7,
          modelName: model || "claude-3-5-sonnet-latest",
          responseStyle: responseStyle || "normal",
          userId: userId, // Pass userId to the agent
        },
        userId
      );

      // Process the message with conversation context
      console.log(
        `[Terminal] Processing message for user ${userId}, style: ${responseStyle || "normal"}, thread: ${threadId || "new"}`
      );
      const result = await agent.processMessage(message, attachedFiles, {
        threadId,
        imageData, // Pass the image data directly to the agent
      });

      // Update rate limit counters
      updateRateLimits(userId, tokenCount);

      // Log usage for analytics (could be saved to DB)
      const processingTime = Date.now() - startTime;
      console.log(
        `[Terminal] Message processed in ${processingTime}ms, ~${tokenCount} tokens`
      );

      // Return response with thread ID
      if (result.success) {
        const responseThreadId = threadId || `${userId}_${Date.now()}`;
        res.json({
          success: true,
          content: result.content,
          threadId: responseThreadId,
          metadata: {
            ...result.metadata,
            processingTime,
            approximateTokens: tokenCount,
            filesProcessed: attachedFiles.length, // Keep track of total files
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          content: result.content,
        });
      }
    } catch (error) {
      console.error("[Terminal] Error processing message:", error);
      console.error("[Terminal] Error stack:", error.stack);

      // More detailed error response for debugging
      const errorResponse = {
        success: false,
        error: "An error occurred processing your message",
        details: error.message || "Unknown error",
      };

      // Include more details in development
      if (process.env.NODE_ENV === "development") {
        errorResponse.stack = error.stack;
        errorResponse.type = error.constructor.name;
      }

      res.status(500).json(errorResponse);
    }
  },

  /**
   * Get terminal usage statistics for the user
   */
  async getUsageStats(req, res) {
    try {
      const authData = req.auth();
      const userId = authData?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      const userLimits = rateLimitStore.get(userId) || {
        requests: 0,
        tokens: 0,
        windowStart: Date.now(),
      };

      // Calculate time remaining in window
      const windowElapsed = Date.now() - userLimits.windowStart;
      const windowRemaining = Math.max(0, RATE_LIMIT_WINDOW - windowElapsed);

      res.json({
        success: true,
        usage: {
          requests: {
            used: userLimits.requests,
            limit: MAX_REQUESTS_PER_HOUR,
            remaining: MAX_REQUESTS_PER_HOUR - userLimits.requests,
          },
          tokens: {
            used: userLimits.tokens,
            limit: MAX_TOKENS_PER_HOUR,
            remaining: MAX_TOKENS_PER_HOUR - userLimits.tokens,
          },
          resetIn: windowRemaining,
          resetAt: new Date(
            userLimits.windowStart + RATE_LIMIT_WINDOW
          ).toISOString(),
        },
      });
    } catch (error) {
      console.error("[Terminal] Error getting usage stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve usage statistics",
      });
    }
  },
};

/**
 * Process an attached file to extract its content
 */
async function processAttachedFile(file, userId) {
  try {
    // Validate file object
    if (!file.id || !file.fileName) {
      console.warn("Invalid file object:", file);
      return null;
    }

    // If file already has processed content, use it
    // Check both 'content' and 'processedContent' fields
    const fileContent = file.content || file.processedContent;
    if (file.processed && fileContent) {
      return {
        fileName: file.fileName,
        mimeType: file.mimeType,
        content: fileContent,
        size: file.size,
      };
    }

    // For local files, fetch content from database
    if (file.source === "local_upload") {
      const result = await User.aggregate([
        { $match: { userId } },
        { $unwind: "$googleDriveFiles" },
        {
          $match: {
            "googleDriveFiles._id": new mongoose.Types.ObjectId(file.id),
          },
        },
        {
          $project: {
            _id: 0,
            file: {
              fileName: "$googleDriveFiles.fileName",
              mimeType: "$googleDriveFiles.mimeType",
              content: "$googleDriveFiles.processedContent",
              size: "$googleDriveFiles.size",
            },
          },
        },
      ]);

      if (result && result.length > 0) {
        return result[0].file;
      }
    }

    // For Google Drive files, content should already be in the file object
    // If not, we skip it as we don't want to re-fetch in this endpoint
    console.warn(`File ${file.fileName} has no processed content`);
    return null;
  } catch (error) {
    console.error("Error processing attached file:", error);
    return null;
  }
}

/**
 * Get or create an agent from the cache
 */
function getOrCreateAgent(threadId, config, userId) {
  if (agentCache.has(threadId)) {
    const cachedAgent = agentCache.get(threadId);
    // Update timestamp to prevent premature eviction
    cachedAgent.lastAccessed = Date.now();
    console.log(`[Terminal] Reusing agent from cache for thread ${threadId}`);
    return cachedAgent.agent;
  }

  console.log(`[Terminal] Creating new agent for thread ${threadId}`);
  const newAgent = createTerminalAgent({ ...config, userId }); // Pass userId here
  agentCache.set(threadId, {
    agent: newAgent,
    lastAccessed: Date.now(),
  });
  return newAgent;
}

/**
 * Check rate limit for user
 */
function checkRateLimit(userId) {
  const now = Date.now();
  let userLimits = rateLimitStore.get(userId);

  // Initialize or reset if window expired
  if (!userLimits || now - userLimits.windowStart > RATE_LIMIT_WINDOW) {
    userLimits = {
      requests: 0,
      tokens: 0,
      windowStart: now,
    };
    rateLimitStore.set(userId, userLimits);
  }

  // Check request limit
  if (userLimits.requests >= MAX_REQUESTS_PER_HOUR) {
    const retryAfter = RATE_LIMIT_WINDOW - (now - userLimits.windowStart);
    return {
      allowed: false,
      message: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_HOUR} requests per hour.`,
      retryAfter,
    };
  }

  return { allowed: true };
}

/**
 * Check token limit for user
 */
function checkTokenLimit(userId, additionalTokens) {
  const userLimits = rateLimitStore.get(userId);
  if (!userLimits) return true;

  return userLimits.tokens + additionalTokens <= MAX_TOKENS_PER_HOUR;
}

/**
 * Update rate limit counters
 */
function updateRateLimits(userId, tokenCount) {
  const userLimits = rateLimitStore.get(userId);
  if (userLimits) {
    userLimits.requests += 1;
    userLimits.tokens += tokenCount;
    rateLimitStore.set(userId, userLimits);
  }
}

/**
 * Estimate token count for rate limiting
 * Rough estimate: 1 token ≈ 4 characters
 */
function estimateTokenCount(message, files) {
  let totalChars = message.length;

  for (const file of files) {
    if (file.content) {
      totalChars += file.content.length;
    }
  }

  return Math.ceil(totalChars / 4);
}

/**
 * Clean up expired rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [userId, limits] of rateLimitStore.entries()) {
    if (now - limits.windowStart > RATE_LIMIT_WINDOW) {
      rateLimitStore.delete(userId);
    }
  }
}, 300000); // Clean up every 5 minutes

/**
 * Clean up expired agents from the cache periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [threadId, cachedAgent] of agentCache.entries()) {
    if (now - cachedAgent.lastAccessed > AGENT_CACHE_TTL) {
      console.log(
        `[Terminal] Evicting agent for thread ${threadId} from cache`
      );
      agentCache.delete(threadId);
    }
  }
}, 600000); // Clean up every 10 minutes

module.exports = terminalController;
