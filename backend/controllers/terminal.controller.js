const { z } = require("zod");
const agentManager = require("../services/agents/agentManager");
const { getUserIdFromRequest } = require("../utils/auth");
const {
  incrementMessageCount,
  checkRateLimit,
} = require("../services/usageService");

// Validation schema for the request body
const processMessageSchema = z.object({
  message: z.string(),
  attachedFiles: z.array(z.any()).optional(),
  temperature: z.number().min(0).max(1).optional(),
  model: z.string().optional(),
  responseStyle: z.string().optional(),
  threadId: z.string().optional(),
  imageData: z
    .object({
      base64: z.string(),
      mimeType: z.string(),
    })
    .optional(),
});

exports.processMessage = async (req, res) => {
  try {
    // 1. Validate Request Body
    const validationResult = processMessageSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: validationResult.error.errors,
      });
    }

    // 2. Get User ID and check rate limit
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { isAllowed, retryAfter } = await checkRateLimit(userId);
    if (!isAllowed) {
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({
        error: "Rate limit exceeded. Please try again later.",
        retryAfter,
      });
    }

    // 3. Extract data from the validated body
    const {
      message,
      attachedFiles = [],
      temperature,
      model,
      responseStyle,
      threadId,
      imageData,
    } = validationResult.data;

    console.log(
      `[Terminal] Request ${threadId || "new_thread"} from user ${userId}`
    );
    if (attachedFiles.length > 0) {
      console.log(
        `[Terminal] Received message with ${attachedFiles.length} attached files.`
      );
    }

    // 4. Configure Agent
    const agentConfig = {
      temperature,
      model,
      responseStyle,
      // Add other relevant config here
    };

    if (!threadId) {
      console.log(`[Terminal] Creating new agent for thread ${threadId}`);
    }
    console.log(
      `[Terminal] Processing message for user ${userId}, style: ${responseStyle}, thread: ${threadId}`
    );

    // 5. Construct Input Payload for the Agent
    let inputPayload;
    if (imageData && imageData.base64) {
      console.log("[Terminal] Image data found, creating multimodal payload.");
      // The format baseAgent.js now expects
      inputPayload = {
        message: message,
        imageData: imageData,
      };
    } else {
      console.log("[Terminal] No image data, creating text-only payload.");
      // Standard text-based input
      inputPayload = {
        messages: [{ role: "user", content: message }],
      };
    }

    // 6. Get Agent and Process Stream
    const agent = agentManager.getOrCreateAgent(userId, threadId, {
      ...agentConfig,
      userId,
    });

    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    });

    const startTime = Date.now();
    let finalContent = "";
    let chunkBuffer = "";

    for await (const chunk of agent.stream(inputPayload, { threadId })) {
      if (chunk.content) {
        finalContent += chunk.content;
        chunkBuffer += chunk.content;
        // To avoid sending too many small chunks, you can buffer a bit
        if (chunkBuffer.length > 20) {
          res.write(chunkBuffer);
          chunkBuffer = "";
        }
      }
    }

    // Send any remaining buffered content
    if (chunkBuffer.length > 0) {
      res.write(chunkBuffer);
    }

    res.end();

    const endTime = Date.now();
    const duration = endTime - startTime;
    const tokenCount = Math.round(finalContent.length / 4); // Approximate
    console.log(
      `[Terminal] Message processed in ${duration}ms, ~${tokenCount} tokens`
    );

    // 7. Increment usage count after successful processing
    await incrementMessageCount(userId);
  } catch (error) {
    console.error("[Terminal] Error processing message:", error);
    // Ensure response is ended in case of error
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: "An internal error occurred while processing." });
    } else {
      res.end();
    }
  }
};
