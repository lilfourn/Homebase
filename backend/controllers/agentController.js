const AgentTask = require("../models/agentTask.model");
const AgentConversation = require("../models/agentConversation.model");
const AgentTemplate = require("../models/agentTemplate.model");
// const hybridDataService = require("../services/hybridDataService"); // Removed
// const agentTaskQueue = require("../services/queues/agentTaskQueue"); // Removed - no queuing
const googleDriveService = require("../services/googleDrive/googleDriveService");
// const fileProcessingService = require("../services/fileProcessingService"); // Removed
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

      // await hybridDataService.validateCourseOwnership(userId, courseInstanceId); // TODO: Implement validation
      const fileIds = files.map((f) => f.fileId);
      // const validatedFiles = await hybridDataService.validateFilesForTask(userId, fileIds); // TODO: Implement validation
      const validatedFiles = files; // Temporarily use files as-is
      // const usage = await hybridDataService.getUserUsageStats(userId); // TODO: Implement usage stats
      const usage = { tasksThisMonth: 0, monthlyLimit: 100, remainingTasks: 100 }; // Temporary default

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

      // For researcher agent, files are optional if research prompt is provided
      if (!agentType) {
        return res.status(400).json({
          success: false,
          error: "Agent type is required",
        });
      }
      
      // If no files provided, use research prompt for title generation (researcher only)
      if ((!files || files.length === 0) && agentType === 'researcher' && req.body.researchPrompt) {
        const title = `Research: ${req.body.researchPrompt.substring(0, 50)}${req.body.researchPrompt.length > 50 ? '...' : ''}`;
        return res.json({
          success: true,
          title,
          isDefault: false,
        });
      }
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Files are required for this agent type",
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
        // const processedFiles = await fileProcessingService.processFiles(...); // TODO: Implement file processing
        // For now, use filename as context
        const processedFiles = [{
          content: `File: ${firstFile.fileName}`,
          metadata: { fileName: firstFile.fileName }
        }];

        if (processedFiles && processedFiles.length > 0) {
          const filesWithContent = processedFiles.map((f) => ({
            content: f.content || "",
            fileName: firstFile.fileName,
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

      // For researcher agent, files are optional if research prompt is provided
      if (!agentType) {
        return res
          .status(400)
          .json({ success: false, error: "Agent type is required" });
      }
      
      if (agentType !== 'researcher' && (!files || files.length === 0)) {
        return res
          .status(400)
          .json({ success: false, error: "Files are required for this agent type" });
      }
      
      if (agentType === 'researcher' && (!files || files.length === 0) && !config?.researchPrompt) {
        return res
          .status(400)
          .json({ success: false, error: "Researcher agent requires either files or a research prompt" });
      }

      // Course ownership validation is now optional
      if (courseInstanceId) {
        // await hybridDataService.validateCourseOwnership(userId, courseInstanceId); // TODO: Implement validation
      }
      
      // Handle files validation - skip for researcher with prompt only
      let validatedMongoFiles = [];
      if (files && files.length > 0) {
        const fileIds = files.map((f) => f.fileId);
        // validatedMongoFiles = await hybridDataService.validateFilesForTask(userId, fileIds); // TODO: Implement validation
        validatedMongoFiles = files; // Temporarily use files as-is
      }

      // const usageStats = await hybridDataService.getUserUsageStats(userId); // TODO: Implement usage stats
      const usageStats = { tasksThisMonth: 0, monthlyLimit: 100, remainingTasks: 100 }; // Temporary default
      if (usageStats.remainingTasks <= 0) {
        return res
          .status(429)
          .json({ success: false, error: "Monthly task limit reached" });
      }

      // Extract mode and model from config if present, put rest in customSettings
      const { mode, model, ...customSettings } = config || {};
      
      const taskDataForMongo = {
        userId,
        courseInstanceId,
        taskName:
          taskName ||
          `${agentType.replace("-", " ")} Task - ${new Date().toLocaleTimeString()}`,
        agentType: agentType.toLowerCase().replace(" ", "-"),
        status: "queued",
        config: {
          mode: mode || undefined,
          model: model || undefined,
          customSettings: customSettings || {}
        },
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

      // Since queuing is removed, mark task as created but not processed
      // You'll need to implement your own processing logic
      console.log(
        `[AgentController] MongoDB Task ${taskId} created (no queuing)`
      );
      // await hybridDataService.incrementUserTaskCount(userId); // TODO: Implement task count increment

      res.status(201).json({
        success: true,
        taskId,
        jobId: taskId, // Use taskId as jobId for compatibility
        message: "Task created successfully",
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

      // Update user stats when task completes successfully
      if (status === "completed" && updatedTask.userId) {
        try {
          const agentType = updatedTask.agentType;
          const updateQuery = {};
          
          // Update stats based on agent type
          if (agentType === 'note-taker') {
            updateQuery['agentStats.noteTaker.notesCreated'] = 1;
            updateQuery['agentStats.noteTaker.lastUsed'] = new Date();
          } else if (agentType === 'researcher') {
            updateQuery['agentStats.researcher.topicsResearched'] = 1;
            updateQuery['agentStats.researcher.lastUsed'] = new Date();
            // Count files as papers analyzed
            if (updatedTask.files && updatedTask.files.length > 0) {
              updateQuery['agentStats.researcher.papersAnalyzed'] = updatedTask.files.length;
            }
          } else if (agentType === 'flashcard-maker') {
            updateQuery['agentStats.flashcardMaker.flashcardsCreated'] = 1;
            updateQuery['agentStats.flashcardMaker.lastUsed'] = new Date();
          } else if (agentType === 'homework-assistant') {
            updateQuery['agentStats.homeworkAssistant.problemsSolved'] = 1;
            updateQuery['agentStats.homeworkAssistant.lastUsed'] = new Date();
          }
          
          // Use $inc to increment counters
          const incFields = {};
          const setFields = {};
          
          Object.keys(updateQuery).forEach(key => {
            if (key.includes('lastUsed')) {
              setFields[key] = updateQuery[key];
            } else {
              incFields[key] = updateQuery[key];
            }
          });
          
          const userUpdate = {};
          if (Object.keys(incFields).length > 0) userUpdate.$inc = incFields;
          if (Object.keys(setFields).length > 0) userUpdate.$set = setFields;
          
          if (Object.keys(userUpdate).length > 0) {
            await User.findOneAndUpdate(
              { userId: updatedTask.userId },
              userUpdate
            );
            console.log(`[AgentController] Updated user stats for ${agentType}`);
          }
        } catch (statsError) {
          console.error("[AgentController] Error updating user stats:", statsError);
          // Don't fail the main request if stats update fails
        }
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
      // const usage = await hybridDataService.getUserUsageStats(userId); // TODO: Implement usage stats
      const usage = { 
        tasksThisMonth: 0, 
        monthlyLimit: 100, 
        remainingTasks: 100,
        resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
      }; // Temporary default
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

      // Queue system removed - no job to cancel
      // if (task.jobId) {
      //   try {
      //     const job = await agentTaskQueue.getJob(task.jobId);
      //     if (job) {
      //       await job.remove();
      //       console.log(`[AgentController] Cancelled Bull job ${task.jobId}`);
      //     }
      //   } catch (jobError) {
      //     console.error(
      //       `[AgentController] Error cancelling Bull job:`,
      //       jobError
      //     );
      //   }
      // }

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

  // Queue system removed - job status not available
  async getJobStatus(req, res) {
    try {
      const { jobId } = req.params;
      // Since we're using taskId as jobId, look up the task
      const task = await AgentTask.findById(jobId);
      if (!task) {
        return res.status(404).json({ success: false, error: "Task not found" });
      }
      res.json({
        success: true,
        job: {
          id: task._id,
          state: task.status,
          progress: task.progress || 0,
          data: { taskId: task._id, agentType: task.agentType },
          result: task.result,
          failedReason: task.error,
          createdAt: task.createdAt,
          processedAt: task.startedAt,
          completedAt: task.completedAt,
        },
      });
    } catch (error) {
      console.error("[AgentController] Error getting task status:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to get task status" });
    }
  },
  async getQueueStatus(req, res) {
    try {
      // Queue system removed - return basic task statistics instead
      const stats = {
        waiting: await AgentTask.countDocuments({ status: "queued" }),
        active: await AgentTask.countDocuments({ status: "processing" }),
        completed: await AgentTask.countDocuments({ status: "completed" }),
        failed: await AgentTask.countDocuments({ status: "failed" }),
      };
      res.json({ success: true, stats, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("[AgentController] Error getting task statistics:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to get task statistics" });
    }
  },
  async getQueueDashboard(req, res) {
    try {
      // Queue system removed - return basic dashboard data from MongoDB
      const dashboardData = {
        overview: {
          totalTasks: await AgentTask.countDocuments(),
          completedTasks: await AgentTask.countDocuments({ status: "completed" }),
          failedTasks: await AgentTask.countDocuments({ status: "failed" }),
          activeTasks: await AgentTask.countDocuments({ status: "processing" }),
          queuedTasks: await AgentTask.countDocuments({ status: "queued" }),
        },
        recentTasks: await AgentTask.find()
          .sort({ createdAt: -1 })
          .limit(10)
          .select("taskName agentType status createdAt completedAt"),
      };
      res.json({ success: true, data: dashboardData });
    } catch (error) {
      console.error("[AgentController] Error getting dashboard data:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to get dashboard data" });
    }
  },

  /**
   * Test web search functionality
   */
  async testWebSearch(req, res) {
    try {
      const authData = req.auth();
      const userId = authData.userId;
      const { query, testExtraction = true } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: "Search query is required",
        });
      }

      const webSearchService = require("../services/webSearchService");

      // Check if web search is available
      if (!webSearchService.isAvailable()) {
        const providers = webSearchService.getProviders();
        return res.status(503).json({
          success: false,
          error:
            "Web search service is not available. Please configure API keys.",
          providers: providers,
          message:
            "You need both a search provider (preferably Brave) and content extractor (preferably Tavily)",
        });
      }

      const providers = webSearchService.getProviders();

      if (
        testExtraction &&
        providers.searchProvider &&
        providers.contentExtractor
      ) {
        // Test the full search and extract workflow
        console.log(
          `[testWebSearch] Testing full workflow with query: ${query}`
        );
        const searchResults = await webSearchService.searchAndExtract(query, {
          num: 5, // Get top 5 search results
          extractCount: 3, // Extract content from top 3
          depth: "advanced",
        });

        res.json({
          success: true,
          testMode: "full",
          providers: providers,
          results: searchResults,
        });
      } else {
        // Test just the search functionality
        console.log(`[testWebSearch] Testing search only with query: ${query}`);
        const searchResults = await webSearchService.searchForUrls(query, {
          num: 5, // Get top 5 results
        });

        res.json({
          success: true,
          testMode: "search-only",
          providers: providers,
          results: searchResults,
          message: testExtraction
            ? "Content extraction not available - showing search results only"
            : "Search test completed",
        });
      }
    } catch (error) {
      console.error("[AgentController] Error testing web search:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to perform web search",
      });
    }
  },
};

const mongoose = require("mongoose"); // Ensure mongoose is available for ObjectId.isValid checks etc.

module.exports = agentController;
