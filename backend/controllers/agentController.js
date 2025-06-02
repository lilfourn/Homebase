const AgentTask = require("../models/agentTask.model");
const AgentConversation = require("../models/agentConversation.model");
const AgentTemplate = require("../models/agentTemplate.model");
const hybridDataService = require("../services/hybridDataService");
const agentTaskQueue = require("../services/queues/agentTaskQueue");
const googleDriveService = require("../services/googleDrive/googleDriveService");
const fileProcessingService = require("../services/fileProcessingService");
const { generateTaskTitle } = require("../utils/taskTitleGenerator");
const User = require("../models/users.model");

const agentController = {
  /**
   * DEPRECATED/ADJUST: This was for a flow where frontend creates Convex task.
   * With MongoDB as primary, this might be absorbed by createTaskWithQueue or become purely for validation.
   */
  async createTask(req, res) {
    try {
      const authData = req.auth();
      const userId = authData.userId;
      const { courseInstanceId, taskName, agentType, config, files } = req.body;

      await hybridDataService.validateCourseOwnership(userId, courseInstanceId);
      const fileIds = files.map((f) => f.fileId);
      const validatedFiles = await hybridDataService.validateFilesForTask(
        userId,
        fileIds
      );
      const usage = await hybridDataService.getUserUsageStats(userId);

      if (usage.remainingTasks <= 0) {
        return res
          .status(429)
          .json({ success: false, error: "Monthly task limit reached" });
      }

      // This endpoint now primarily validates. Actual creation is in createTaskWithQueue.
      // Or, it could be removed if createTaskWithQueue handles all pre-checks.
      res.status(200).json({
        success: true,
        data: {
          validated: true,
          message:
            "Validation successful. Use /tasks/create for task creation.",
          userId,
          courseInstanceId,
          taskName,
          agentType,
          config,
          files: validatedFiles,
        },
      });
    } catch (error) {
      console.error("Error validating agent task data:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to validate task data",
      });
    }
  },

  /**
   * Generate an AI-powered title for the task based on file content
   */
  async generateTaskTitle(req, res) {
    try {
      const { files, agentType } = req.body;
      const authData = req.auth();
      const userId = authData.userId;

      if (!files || files.length === 0 || !agentType) {
        return res.status(400).json({
          success: false,
          error: "Files and agent type are required",
        });
      }

      // Get user's Google Drive tokens
      const user = await User.findOne({ userId }).select(
        "+googleDrive.accessToken +googleDrive.refreshToken"
      );

      if (!user || !user.googleDrive || !user.googleDrive.accessToken) {
        // Return default title if Google Drive not connected
        const defaultTitle =
          require("../utils/taskTitleGenerator").getDefaultTitle(agentType);
        return res.json({
          success: true,
          title: defaultTitle,
          isDefault: true,
        });
      }

      const tokens = {
        access_token: user.googleDrive.accessToken,
        refresh_token: user.googleDrive.refreshToken,
      };

      // Download and process first file to get content preview
      const firstFile = files[0];
      try {
        const fileStream = await googleDriveService.downloadFile(
          tokens,
          firstFile.fileId
        );

        // Convert stream to buffer
        const chunks = [];
        for await (const chunk of fileStream) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // Process file to extract text
        const processedFiles = await fileProcessingService.processFiles(
          [
            {
              id: firstFile.fileId,
              fileName: firstFile.fileName,
              mimeType: firstFile.mimeType,
              size: firstFile.fileSize,
              buffer: buffer,
            },
          ],
          {
            validateSizes: false,
            extractMetadata: false,
            deduplicateContent: false,
            chunkContent: false,
            performSecurityScan: false,
          }
        );

        if (processedFiles.files && processedFiles.files.length > 0) {
          const filesWithContent = processedFiles.files.map((f) => ({
            content: f.content || "",
            fileName: f.fileName,
          }));

          // Generate title using AI
          const title = await generateTaskTitle(filesWithContent, agentType);

          res.json({
            success: true,
            title,
            isDefault: false,
          });
        } else {
          throw new Error("Failed to process file content");
        }
      } catch (error) {
        console.error("[AgentController] Error generating title:", error);
        // Return default title on error
        const defaultTitle =
          require("../utils/taskTitleGenerator").getDefaultTitle(agentType);
        res.json({
          success: true,
          title: defaultTitle,
          isDefault: true,
        });
      }
    } catch (error) {
      console.error("[AgentController] Error in generateTaskTitle:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to generate title",
      });
    }
  },

  /**
   * Create task with queue processing (MongoDB version)
   */
  async createTaskWithQueue(req, res) {
    try {
      const { agentType, files, config, courseInstanceId, taskName } = req.body;
      const authData = req.auth();
      const userId = authData.userId;

      if (!agentType || !files || files.length === 0) {
        return res
          .status(400)
          .json({ success: false, error: "Agent type and files are required" });
      }

      await hybridDataService.validateCourseOwnership(userId, courseInstanceId);
      const fileIds = files.map((f) => f.fileId);
      const validatedMongoFiles = await hybridDataService.validateFilesForTask(
        userId,
        fileIds
      );

      const usageStats = await hybridDataService.getUserUsageStats(userId);
      if (usageStats.remainingTasks <= 0) {
        return res
          .status(429)
          .json({ success: false, error: "Monthly task limit reached" });
      }

      const taskDataForMongo = {
        userId,
        courseInstanceId,
        taskName:
          taskName ||
          `${agentType.replace("-", " ")} Task - ${new Date().toLocaleTimeString()}`,
        agentType: agentType.toLowerCase().replace(" ", "-"),
        status: "queued",
        config: config || {},
        files: validatedMongoFiles.map((f) => ({
          // Map to AgentFileSchema structure
          fileId: f.id,
          fileName: f.name,
          fileSize: f.size,
          mimeType: f.mimeType,
        })),
        progress: 0,
      };

      const createdTask = await AgentTask.create(taskDataForMongo);
      const taskId = createdTask._id.toString();

      if (!taskId) {
        throw new Error("Failed to create agent task in MongoDB.");
      }

      const jobId = await agentTaskQueue.addTask(
        {
          taskId, // MongoDB document _id
          userId,
          courseInstanceId,
          agentType: createdTask.agentType,
          taskName: createdTask.taskName,
          config: createdTask.config,
          files: validatedMongoFiles, // Worker might still want the richer validatedFiles object
        },
        { attempts: 3 }
      );

      await AgentTask.findByIdAndUpdate(taskId, { jobId }); // Save jobId to the task

      console.log(
        `[AgentController] MongoDB Task ${taskId} created and queued as job ${jobId}`
      );
      await hybridDataService.incrementUserTaskCount(userId);

      res.status(201).json({
        success: true,
        taskId,
        jobId,
        message: "Task created and queued for processing",
        task: createdTask, // Return the created task object
      });
    } catch (error) {
      console.error(
        "[AgentController] Error creating task with queue (MongoDB):",
        error.message,
        error.stack
      );
      res.status(500).json({
        success: false,
        error: error.message || "Failed to create task",
      });
    }
  },

  /**
   * Update task status (called by workers, updates MongoDB)
   */
  async updateTaskStatus(req, res) {
    try {
      const { taskId } = req.params;
      const {
        status,
        progress,
        result,
        error: taskError,
        usage: taskUsage,
      } = req.body;
      const apiKey = req.headers["x-api-key"];

      if (apiKey !== process.env.INTERNAL_API_KEY) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const updateData = { status, progress };
      if (result) updateData.result = result;
      if (taskError) updateData.error = taskError;
      if (taskUsage) updateData.usage = taskUsage;
      if (status === "completed" || status === "failed") {
        updateData.completedAt = new Date();
      }
      if (progress !== undefined) updateData.progress = progress;

      const updatedTask = await AgentTask.findByIdAndUpdate(
        taskId,
        { $set: updateData },
        { new: true }
      );

      if (!updatedTask) {
        return res
          .status(404)
          .json({ success: false, error: "Task not found for status update" });
      }

      console.log("[AgentController] Task status updated in MongoDB:", {
        taskId,
        status,
        progress,
      });
      res.json({
        success: true,
        message: "Task status updated in MongoDB",
        task: updatedTask,
      });
    } catch (error) {
      console.error("Error updating task status (MongoDB):", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to update task status",
      });
    }
  },

  /**
   * Add message to task conversation (MongoDB version)
   */
  async addMessage(req, res) {
    try {
      const authData = req.auth();
      const userId = authData.userId;
      const { taskId } = req.params;
      const { role, content } = req.body.message; // Assuming message object {role, content}

      if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid Task ID format" });
      }

      const conversation = await AgentConversation.findOneAndUpdate(
        { taskId: taskId, userId },
        {
          $push: { messages: { role, content, timestamp: new Date() } },
          $setOnInsert: { taskId: taskId, userId }, // Ensures userId is set on creation
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.json({ success: true, conversation });
    } catch (error) {
      console.error("Error adding message (MongoDB):", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to add message",
      });
    }
  },

  /**
   * Get a single task by ID (MongoDB version)
   */
  async getTask(req, res) {
    try {
      const authData = req.auth();
      const userId = authData.userId;
      const { taskId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid Task ID format" });
      }

      const task = await AgentTask.findOne({ _id: taskId, userId });
      if (!task) {
        return res
          .status(404)
          .json({ success: false, error: "Task not found or unauthorized" });
      }
      res.json({ success: true, data: task });
    } catch (error) {
      console.error("Error getting task (MongoDB):", error);
      res
        .status(500)
        .json({ success: false, error: error.message || "Failed to get task" });
    }
  },

  /**
   * List tasks for a user, optionally by course (MongoDB version)
   */
  async listTasks(req, res) {
    try {
      const authData = req.auth();
      const userId = authData.userId;
      const { courseInstanceId } = req.query;
      const query = { userId };
      if (courseInstanceId) {
        query.courseInstanceId = courseInstanceId;
      }
      // Add pagination later if needed: const { page = 1, limit = 10 } = req.query;
      const tasks = await AgentTask.find(query).sort({ createdAt: -1 }); // Sort by newest first
      res.json({ success: true, data: tasks });
    } catch (error) {
      console.error("Error listing tasks (MongoDB):", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to list tasks",
      });
    }
  },

  /**
   * Delete task (MongoDB version)
   */
  async deleteTask(req, res) {
    try {
      const authData = req.auth();
      const userId = authData.userId;
      const { taskId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid Task ID format" });
      }

      const result = await AgentTask.findOneAndDelete({ _id: taskId, userId });
      if (!result) {
        return res.status(404).json({
          success: false,
          error: "Task not found or unauthorized for deletion",
        });
      }
      // Optionally, delete related conversations
      await AgentConversation.deleteMany({ taskId: taskId, userId });
      res.json({
        success: true,
        message: "Task and related conversations deleted",
      });
    } catch (error) {
      console.error("Error deleting task (MongoDB):", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to delete task",
      });
    }
  },

  /**
   * Get agent templates (MongoDB version)
   */
  async getTemplates(req, res) {
    try {
      const authData = req.auth();
      const userId = authData.userId; // User-specific templates
      const { agentType, isPublic } = req.query;
      const query = {
        $or: [
          { userId }, // User's own templates
          { isPublic: true }, // Public templates
        ],
      };
      if (agentType) query.agentType = agentType;
      // isPublic query param can be used to filter for only public or only private if needed
      // For now, it gets user's own + all public ones.

      const templates = await AgentTemplate.find(query).sort({ createdAt: -1 });
      res.json({ success: true, data: templates });
    } catch (error) {
      console.error("Error getting templates (MongoDB):", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get templates",
      });
    }
  },

  // ShareTask would need significant redesign for MongoDB (e.g., separate SharedTasks collection or ACLs)
  // Deferring this as it's a complex feature.
  async shareTask(req, res) {
    res.status(501).json({
      success: false,
      error: "ShareTask not implemented for MongoDB yet.",
    });
  },

  // getUserUsage is already in this file and uses hybridDataService, which is fine for now.
  async getUserUsage(req, res) {
    try {
      const authData = req.auth();
      const userId = authData.userId;
      const usage = await hybridDataService.getUserUsageStats(userId);
      res.json({ success: true, data: usage });
    } catch (error) {
      console.error("Error getting user usage:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get user usage",
      });
    }
  },

  /**
   * Cancel a running task
   */
  async cancelTask(req, res) {
    try {
      const authData = req.auth();
      const userId = authData.userId;
      const { taskId } = req.params;

      // Verify task ownership
      const task = await AgentTask.findOne({ _id: taskId, userId });
      if (!task) {
        return res.status(404).json({
          success: false,
          error: "Task not found or unauthorized",
        });
      }

      if (task.status !== "queued" && task.status !== "processing") {
        return res.status(400).json({
          success: false,
          error: "Task cannot be cancelled in its current state",
        });
      }

      // Cancel the Bull job if it exists
      if (task.jobId) {
        try {
          const job = await agentTaskQueue.getJob(task.jobId);
          if (job) {
            await job.remove();
            console.log(`[AgentController] Cancelled Bull job ${task.jobId}`);
          }
        } catch (jobError) {
          console.error(
            `[AgentController] Error cancelling Bull job:`,
            jobError
          );
        }
      }

      // Update task status to cancelled
      const updatedTask = await AgentTask.findByIdAndUpdate(
        taskId,
        {
          status: "failed",
          error: "Task cancelled by user",
          completedAt: new Date(),
          progress: task.progress || 0,
        },
        { new: true }
      );

      console.log(`[AgentController] Task ${taskId} cancelled by user`);
      res.json({
        success: true,
        message: "Task cancelled successfully",
        task: updatedTask,
      });
    } catch (error) {
      console.error("Error cancelling task:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to cancel task",
      });
    }
  },

  // Job/Queue status methods remain as they are, interacting with Bull directly.
  async getJobStatus(req, res) {
    try {
      const { jobId } = req.params;
      const job = await agentTaskQueue.getJob(jobId);
      if (!job) {
        return res.status(404).json({ success: false, error: "Job not found" });
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
          completedAt: job.finishedOn ? new Date(job.finishedOn) : null,
        },
      });
    } catch (error) {
      console.error("[AgentController] Error getting job status:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to get job status" });
    }
  },
  async getQueueStatus(req, res) {
    try {
      const stats = await agentTaskQueue.getQueueStats();
      res.json({ success: true, stats, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("[AgentController] Error getting queue status:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to get queue status" });
    }
  },
  async getQueueDashboard(req, res) {
    try {
      const dashboardData = await agentTaskQueue.getDashboardData();
      res.json({ success: true, data: dashboardData });
    } catch (error) {
      console.error("[AgentController] Error getting dashboard data:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to get dashboard data" });
    }
  },
};

const mongoose = require("mongoose"); // Ensure mongoose is available for ObjectId.isValid checks etc.

module.exports = agentController;
