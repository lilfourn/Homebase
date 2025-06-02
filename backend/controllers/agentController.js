const convexService = require('../services/convexService');
const hybridDataService = require('../services/hybridDataService');
const jobQueue = require('../services/jobQueue');
const agentTaskQueue = require('../services/queues/agentTaskQueue');

const agentController = {
  /**
   * Create a new agent task
   */
  async createTask(req, res) {
    try {
      const { userId } = req.auth;
      const { 
        courseInstanceId, 
        taskName, 
        agentType, 
        config, 
        files 
      } = req.body;

      // Validate course ownership
      await hybridDataService.validateCourseOwnership(userId, courseInstanceId);

      // Validate files exist in MongoDB
      const fileIds = files.map(f => f.fileId);
      const validatedFiles = await hybridDataService.validateFilesForTask(userId, fileIds);

      // Check user usage limits
      const usage = await hybridDataService.getUserUsageStats(userId);
      if (usage.remainingTasks <= 0) {
        return res.status(429).json({
          success: false,
          error: 'Monthly task limit reached'
        });
      }

      // Prepare file data for Convex
      const convexFiles = validatedFiles.map(f => ({
        fileId: f.id,
        fileName: f.name,
        fileSize: f.size || 0,
        mimeType: f.mimeType
      }));

      // Return validated data for frontend to create task in Convex
      res.status(201).json({
        success: true,
        data: {
          validated: true,
          userId,
          courseInstanceId,
          taskName,
          agentType,
          config,
          files: convexFiles,
          // Frontend will create the task in Convex and return the taskId
          message: 'Task validated. Frontend should create Convex task.'
        }
      });
    } catch (error) {
      console.error('Error creating agent task:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create agent task'
      });
    }
  },

  /**
   * Get a single task - Frontend handles Convex queries
   */
  async getTask(req, res) {
    // Frontend handles direct Convex queries
    res.status(501).json({
      success: false,
      error: 'Task queries should be handled by frontend Convex hooks'
    });
  },

  /**
   * List tasks - Frontend handles Convex queries
   */
  async listTasks(req, res) {
    // Frontend handles direct Convex queries
    res.status(501).json({
      success: false,
      error: 'Task queries should be handled by frontend Convex hooks'
    });
  },

  /**
   * Update task status (called by workers)
   * Workers will use this endpoint to notify completion
   * Frontend will handle the actual Convex updates
   */
  async updateTaskStatus(req, res) {
    try {
      const { taskId } = req.params;
      const { status, progress, result, error, usage } = req.body;

      // Verify internal API key for worker access
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== process.env.INTERNAL_API_KEY) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Store the result temporarily in Redis or memory
      // Frontend will poll this endpoint to get updates
      console.log('[AgentController] Task status update received:', {
        taskId,
        status,
        progress
      });

      // In a real implementation, store this in Redis
      // For now, just acknowledge receipt
      res.json({
        success: true,
        message: 'Status update received. Frontend should update Convex.'
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update task status'
      });
    }
  },

  /**
   * Add message to task conversation
   */
  async addMessage(req, res) {
    try {
      const { userId } = req.auth;
      const { taskId } = req.params;
      const { message } = req.body;

      await convexService.addMessage({
        taskId,
        userId,
        message
      });

      res.json({
        success: true
      });
    } catch (error) {
      console.error('Error adding message:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to add message'
      });
    }
  },

  /**
   * Delete task endpoint - not needed as frontend handles this
   */
  async deleteTask(req, res) {
    res.status(501).json({
      success: false,
      error: 'Task deletion should be handled by frontend Convex hooks'
    });
  },

  /**
   * Get user usage statistics
   */
  async getUserUsage(req, res) {
    try {
      const { userId } = req.auth;
      
      const usage = await hybridDataService.getUserUsageStats(userId);

      res.json({
        success: true,
        data: usage
      });
    } catch (error) {
      console.error('Error getting user usage:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get user usage'
      });
    }
  },

  /**
   * Get agent templates
   */
  async getTemplates(req, res) {
    try {
      const { userId } = req.auth;
      const { agentType, isPublic } = req.query;

      const templates = await convexService.getTemplates({
        userId,
        ...(agentType && { agentType }),
        ...(isPublic !== undefined && { isPublic: isPublic === 'true' })
      });

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Error getting templates:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get templates'
      });
    }
  },

  /**
   * Share a task
   */
  async shareTask(req, res) {
    try {
      const { userId } = req.auth;
      const { taskId } = req.params;
      const { shareSettings } = req.body;

      const result = await convexService.shareTask({
        taskId,
        userId,
        shareSettings
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error sharing task:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to share task'
      });
    }
  },

  /**
   * Create task with queue processing
   */
  async createTaskWithQueue(req, res) {
    try {
      const { agentType, files, config, courseInstanceId, taskName } = req.body;
      const userId = req.auth.userId;

      // Validate request
      if (!agentType || !files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Agent type and files are required'
        });
      }

      // Validate course ownership
      await hybridDataService.validateCourseOwnership(userId, courseInstanceId);

      // Validate files
      const fileIds = files.map(f => f.fileId);
      const validatedFiles = await hybridDataService.validateFilesForTask(userId, fileIds);

      // Generate task ID
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Queue the job (timeout will be calculated dynamically)
      const jobId = await agentTaskQueue.addTask({
        taskId,
        userId,
        courseInstanceId,
        agentType,
        taskName: taskName || `${agentType} Task`,
        config: config || {},
        files: validatedFiles
      }, {
        attempts: 3
      });

      console.log(`[AgentController] Task ${taskId} queued as job ${jobId}`);

      res.status(200).json({
        success: true,
        taskId,
        jobId,
        message: 'Task queued for processing'
      });

    } catch (error) {
      console.error('[AgentController] Error creating task:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create task'
      });
    }
  },

  /**
   * Get job status
   */
  async getJobStatus(req, res) {
    try {
      const { jobId } = req.params;
      const job = await agentTaskQueue.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      const state = await job.getState();
      const progress = job.progress();

      res.json({
        success: true,
        job: {
          id: job.id,
          state,
          progress,
          data: job.data,
          result: job.returnvalue,
          failedReason: job.failedReason,
          createdAt: new Date(job.timestamp),
          processedAt: job.processedOn ? new Date(job.processedOn) : null,
          completedAt: job.finishedOn ? new Date(job.finishedOn) : null
        }
      });

    } catch (error) {
      console.error('[AgentController] Error getting job status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get job status'
      });
    }
  },

  /**
   * Get queue status
   */
  async getQueueStatus(req, res) {
    try {
      const stats = await agentTaskQueue.getQueueStats();
      
      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[AgentController] Error getting queue status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get queue status'
      });
    }
  },

  /**
   * Get queue dashboard data
   */
  async getQueueDashboard(req, res) {
    try {
      const dashboardData = await agentTaskQueue.getDashboardData();
      
      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      console.error('[AgentController] Error getting dashboard data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard data'
      });
    }
  }
};

module.exports = agentController;