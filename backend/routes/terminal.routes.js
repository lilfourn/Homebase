const express = require("express");
const router = express.Router();
const { requireAuth } = require("@clerk/express");
const terminalController = require("../controllers/terminalController");

// Middleware for terminal-specific validation
const validateTerminalRequest = (req, res, next) => {
  // Add request ID for tracking
  req.requestId = `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Log request for monitoring
  console.log(`[Terminal] Request ${req.requestId} from user ${req.auth()?.userId}`);
  
  next();
};

/**
 * Process a terminal message with AI
 * POST /api/terminal/process
 * 
 * Body:
 * - message: string (required) - The user's message
 * - attachedFiles: array (optional) - Array of file objects with content
 * - temperature: number (optional) - AI temperature setting (0-1)
 * - model: string (optional) - Model to use
 */
router.post(
  "/process",
  requireAuth(),
  validateTerminalRequest,
  terminalController.processMessage
);

/**
 * Get terminal usage statistics
 * GET /api/terminal/usage
 * 
 * Returns current usage stats and rate limit information
 */
router.get(
  "/usage",
  requireAuth(),
  terminalController.getUsageStats
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error(`[Terminal] Error in request ${req.requestId}:`, error);
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: "Invalid request data",
      details: error.message
    });
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: "Authentication required"
    });
  }
  
  // Default error response
  res.status(500).json({
    success: false,
    error: "An internal error occurred",
    requestId: req.requestId
  });
});

module.exports = router;