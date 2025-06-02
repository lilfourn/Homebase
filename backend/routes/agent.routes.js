const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const { requireAuth } = require('../middleware/auth.middleware');
const { validateAgentTask } = require('../middleware/agentValidation');

/**
 * Backend Agent Routes
 * 
 * This is a hybrid architecture where:
 * - Backend validates and prepares data
 * - Frontend handles Convex mutations and queries
 * - Workers update status through backend endpoints
 */

// Validate and prepare agent task creation
router.post('/tasks/validate', requireAuth(), validateAgentTask, agentController.createTask);

// Create task with queue processing
router.post('/tasks/create', requireAuth(), agentController.createTaskWithQueue);

// Worker endpoint to update task status
router.put('/tasks/:taskId/status', agentController.updateTaskStatus);

// Get user usage stats (from MongoDB)
router.get('/usage', requireAuth(), agentController.getUserUsage);

// Queue management routes
router.get('/jobs/:jobId/status', requireAuth(), agentController.getJobStatus);
router.get('/queue/status', requireAuth(), agentController.getQueueStatus);
router.get('/queue/dashboard', requireAuth(), agentController.getQueueDashboard);

module.exports = router;