const express = require("express");
const router = express.Router();
const agentController = require("../controllers/agentController");
const { requireAuth } = require("../middleware/auth.middleware");
const { validateAgentTask } = require("../middleware/agentValidation");

/**
 * Backend Agent Routes (Now using MongoDB)
 */

// Create new agent task (validation is part of createTaskWithQueue)
router.post(
  "/tasks",
  requireAuth(),
  validateAgentTask,
  agentController.createTaskWithQueue
);

// Generate AI-powered task title
router.post(
  "/tasks/generate-title",
  requireAuth(),
  agentController.generateTaskTitle
);

// List all tasks for the user (optionally filter by courseInstanceId)
router.get("/tasks", requireAuth(), agentController.listTasks);

// Get a specific task by ID
router.get("/tasks/:taskId", requireAuth(), agentController.getTask);

// Worker endpoint to update task status (remains the same, controller logic updated)
router.put("/tasks/:taskId/status", agentController.updateTaskStatus);

// Delete a specific task
router.delete("/tasks/:taskId", requireAuth(), agentController.deleteTask);

// Cancel a running task
router.post("/tasks/:taskId/cancel", requireAuth(), agentController.cancelTask);

// Add a message to a task's conversation
router.post(
  "/tasks/:taskId/messages",
  requireAuth(),
  agentController.addMessage
);

// Get agent templates (user-specific and public)
router.get("/templates", requireAuth(), agentController.getTemplates);

// Get user usage stats (from MongoDB via hybridDataService)
router.get("/usage", requireAuth(), agentController.getUserUsage);

// --- Routes that might need adjustment or were placeholders for Convex ---
// The old '/tasks/validate' is removed as createTaskWithQueue now handles validation and creation.
// ShareTask is deferred.
// router.post('/tasks/:taskId/share', requireAuth(), agentController.shareTask);

// Queue management routes (remain unchanged as they interact with Bull/Redis directly)
router.get("/jobs/:jobId/status", requireAuth(), agentController.getJobStatus);
router.get("/queue/status", requireAuth(), agentController.getQueueStatus);
router.get(
  "/queue/dashboard",
  requireAuth(),
  agentController.getQueueDashboard
);

module.exports = router;
