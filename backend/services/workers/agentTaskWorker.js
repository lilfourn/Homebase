const AgentTask = require("../../models/agentTask.model");
const fileProcessingService = require("../fileProcessingService");
const agentOrchestrator = require("../agents/agentOrchestrator");
const googleDriveService = require("../googleDrive/googleDriveService");
const User = require("../../models/users.model");
const { performance } = require("perf_hooks");
const mongoose = require("mongoose");

class AgentTaskWorker {
  constructor() {
    this.processingTasks = new Map();
  }

  async processTask(job) {
    const startTime = performance.now();
    const { taskId, userId, courseInstanceId } = job.data;

    // Store task context for agent processing
    this.currentTaskId = taskId;
    this.currentUserId = userId;
    this.currentCourseId = courseInstanceId;

    // Track active processing
    this.processingTasks.set(taskId, {
      startTime,
      job,
      userId,
    });

    try {
      console.log(`[Worker] Processing task ${taskId} (Job ${job.id})`);

      // Fetch the full task details from MongoDB
      const taskDocument = await AgentTask.findById(taskId);
      if (!taskDocument) {
        throw new Error(`Task ${taskId} not found in MongoDB.`);
      }
      // Now use details from taskDocument
      const { agentType, config, files: taskFilesFromDB } = taskDocument;

      // Update status to processing
      await this.updateTaskStatus(taskId, "processing", 0, "Starting...");
      await job.progress(0);

      // Step 1: Download and process files (0-20%)
      let filesWithContent = [];
      let processedFiles = { files: [] };
      
      // Check if we have files to process
      if (taskFilesFromDB && taskFilesFromDB.length > 0) {
        await this.updateTaskStatus(
          taskId,
          "processing",
          10,
          "Downloading files from Google Drive..."
        );
        await job.progress(10);

        // Get user's Google Drive tokens
        const user = await User.findOne({ userId: userId }).select(
          "+googleDrive.accessToken +googleDrive.refreshToken"
        ); // Include tokens in query

        if (
          !user ||
          !user.googleDrive ||
          !user.googleDrive.accessToken ||
          !user.googleDrive.refreshToken
        ) {
          throw new Error(
            "User Google Drive tokens not found. Please reconnect Google Drive in settings."
          );
        }

        // Create tokens object for Google Drive API
        const tokens = {
          access_token: user.googleDrive.accessToken,
          refresh_token: user.googleDrive.refreshToken,
        };

        // Download actual file content from Google Drive
        for (const taskFile of taskFilesFromDB) {
        try {
          console.log(
            `[Worker] Downloading file: ${taskFile.fileName} (${taskFile.fileId})`
          );
          const fileStream = await googleDriveService.downloadFile(
            tokens,
            taskFile.fileId
          );

          // Convert stream to buffer
          const chunks = [];
          for await (const chunk of fileStream) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);

          filesWithContent.push({
            id: taskFile.fileId,
            fileName: taskFile.fileName,
            mimeType: taskFile.mimeType,
            size: taskFile.fileSize,
            buffer: buffer,
          });
        } catch (error) {
          console.error(
            `[Worker] Failed to download file ${taskFile.fileName}:`,
            error
          );
          throw new Error(
            `Failed to download file ${taskFile.fileName}: ${error.message}`
          );
        }
        }

        processedFiles = await fileProcessingService.processFiles(
          filesWithContent,
          {
            validateSizes: true,
            extractMetadata: true,
            deduplicateContent: true,
            chunkContent: true,
            performSecurityScan: true,
          }
        );
      } else {
        // No files to process (e.g., researcher with prompt only)
        await this.updateTaskStatus(
          taskId,
          "processing",
          10,
          "No files to process..."
        );
        await job.progress(10);
      }

      await this.updateTaskStatus(taskId, "processing", 20, "Files processed");
      await job.progress(20);

      // Step 2: Build context (20-40%)
      await this.updateTaskStatus(
        taskId,
        "processing",
        30,
        "Building context..."
      );
      await job.progress(30);

      const context = await this.buildContext(processedFiles.files);

      await this.updateTaskStatus(taskId, "processing", 40, "Context ready");
      await job.progress(40);

      // Step 3: AI Processing (40-90%)
      await this.updateTaskStatus(taskId, "processing", 50, "AI processing...");
      await job.progress(50);

      // TODO: Replace with actual AI processing when agentOrchestrator is ready
      const result = await this.processWithAI(
        agentType,
        context,
        config,
        async (progress) => {
          const overallProgress = 40 + Math.round(progress * 0.5);
          await job.progress(overallProgress);
          await this.updateTaskStatus(
            taskId,
            "processing",
            overallProgress,
            `AI processing: ${progress}%`
          );
        }
      );

      await job.progress(90);

      // Step 4: Finalize (90-100%)
      await this.updateTaskStatus(
        taskId,
        "processing",
        95,
        "Finalizing results..."
      );

      const processingTime = Math.round(performance.now() - startTime);
      const finalResult = {
        content: result.content,
        format: result.format,
        metadata: {
          ...result.metadata,
          processingTime,
          processedFiles: context.fileCount,
          totalWords: context.totalWords,
        },
      };

      const usage = {
        tokensUsed: result.tokensUsed || 0,
        processingTime,
        cost: result.cost || 0,
        model: result.model || "gpt-3.5-turbo",
      };

      // Complete the task
      await this.updateTaskStatus(
        taskId,
        "completed",
        100,
        "Complete",
        finalResult,
        usage
      );
      await job.progress(100);

      console.log(`[Worker] Task ${taskId} completed in ${processingTime}ms`);

      // Cleanup
      this.processingTasks.delete(taskId);

      // Fetch the final task document to return
      const finalTaskDocument = await AgentTask.findById(taskId);
      if (!finalTaskDocument) {
        console.warn(
          `[Worker] Could not fetch final task document ${taskId} after completion.`
        );
        // Fallback to a simpler success object if fetch fails, though this shouldn't happen
        return {
          success: true,
          taskId,
          status: "completed",
          usage,
          processingTime,
        };
      }
      return finalTaskDocument; // Return the full task document from MongoDB
    } catch (error) {
      console.error(`[Worker] Task ${taskId} failed:`, error);

      await this.updateTaskStatus(
        taskId,
        "failed",
        job.progress(),
        error.message,
        null,
        null,
        error
      );

      // Cleanup
      this.processingTasks.delete(taskId);

      throw error;
    }
  }

  async updateTaskStatus(
    taskId,
    status,
    progress,
    message,
    result = null,
    usage = null,
    error = null
  ) {
    try {
      if (!mongoose.Types.ObjectId.isValid(taskId)) {
        console.error("[Worker] Invalid Task ID for status update:", taskId);
        return; // Or throw an error if this should halt things
      }

      const updateData = { status, progress, workerMessage: message }; // Added workerMessage
      if (result) updateData.result = result;
      if (usage) updateData.usage = usage;
      if (error)
        updateData.error = error.message ? error.message : String(error);
      if (status === "completed" || status === "failed") {
        updateData.completedAt = new Date();
      }

      const updatedTask = await AgentTask.findByIdAndUpdate(
        taskId,
        { $set: updateData },
        { new: true }
      );

      if (!updatedTask) {
        console.warn(
          `[Worker] Task ${taskId} not found during status update to MongoDB.`
        );
        return;
      }
      console.log(
        `[Worker] Task ${taskId} status updated in MongoDB: ${status} at ${progress}%`
      );
    } catch (err) {
      console.error("[Worker] Failed to update task status in MongoDB:", err);
    }
  }

  async buildContext(processedFiles) {
    const validFiles = processedFiles.filter((f) => !f.error && !f.isDuplicate);

    return {
      files: validFiles.map((f) => ({
        name: f.fileName,
        content: f.content,
        type: f.mimeType,
        wordCount: f.wordCount,
        chunks: f.chunks || null,
      })),
      fileCount: validFiles.length,
      totalWords: validFiles.reduce((sum, f) => sum + (f.wordCount || 0), 0),
      totalTokens: validFiles.reduce(
        (sum, f) => sum + Math.ceil((f.contentLength || 0) / 4),
        0
      ),
      hasChunkedContent: validFiles.some(
        (f) => f.chunks && f.chunks.length > 1
      ),
      errorFiles: processedFiles
        .filter((f) => f.error)
        .map((f) => ({
          name: f.fileName,
          error: f.error,
        })),
      duplicateFiles: processedFiles
        .filter((f) => f.isDuplicate)
        .map((f) => f.fileName),
    };
  }

  async processWithAI(agentType, context, config, progressCallback) {
    // Check if agent is implemented
    const availableAgents = agentOrchestrator.getAvailableAgents();
    const agentInfo = availableAgents[agentType];

    if (!agentInfo || agentInfo.comingSoon) {
      // Use placeholder for unimplemented agents
      console.log(
        `[Worker] Agent ${agentType} not yet implemented, using placeholder`
      );

      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        await progressCallback(i);
      }

      // Return placeholder result
      const placeholderResults = {
        "note-taker": {
          content: `# Notes Summary\n\nProcessed ${context.fileCount} files with ${context.totalWords} words.\n\n## Key Points\n- Content extraction successful\n- Ready for AI processing\n\n*Full notes will be generated when AI integration is complete.*`,
          format: "markdown",
          metadata: { agentType: "note-taker" },
          tokensUsed: Math.round(context.totalTokens * 0.5),
          cost: 0.002,
          model: "gpt-3.5-turbo",
        },
        researcher: {
          content: `# Research Analysis\n\nAnalyzed ${context.fileCount} documents.\n\n## Findings\n- Documents processed successfully\n- ${context.totalWords} words analyzed\n- Ready for cross-document analysis\n\n*Detailed research findings will be available when AI integration is complete.*`,
          format: "markdown",
          metadata: { agentType: "researcher" },
          tokensUsed: Math.round(context.totalTokens * 0.6),
          cost: 0.003,
          model: "gpt-3.5-turbo",
        },
        "study-buddy": {
          content: JSON.stringify(
            {
              summary: `Study materials prepared from ${context.fileCount} files`,
              readyForProcessing: true,
              fileStats: {
                count: context.fileCount,
                totalWords: context.totalWords,
              },
              placeholder: true,
            },
            null,
            2
          ),
          format: "json",
          metadata: { agentType: "study-buddy" },
          tokensUsed: Math.round(context.totalTokens * 0.7),
          cost: 0.004,
          model: "gpt-3.5-turbo",
        },
        assignment: {
          content: `# Assignment Assistant\n\nAnalyzed ${context.fileCount} reference materials.\n\n## Overview\n- ${context.totalWords} words of content processed\n- Ready for assignment planning\n\n*Assignment assistance will be provided when AI integration is complete.*`,
          format: "markdown",
          metadata: { agentType: "assignment" },
          tokensUsed: Math.round(context.totalTokens * 0.5),
          cost: 0.002,
          model: "gpt-3.5-turbo",
        },
      };

      return placeholderResults[agentType] || placeholderResults["note-taker"];
    }

    // Use real agent processing
    try {
      const result = await agentOrchestrator.processTask({
        taskId: this.currentTaskId,
        userId: this.currentUserId,
        courseInstanceId: this.currentCourseId,
        agentType,
        config,
        files: context.files,
        progressCallback,
      });

      return result;
    } catch (error) {
      console.error(`[Worker] Agent processing failed:`, error);
      throw error;
    }
  }

  // Graceful shutdown
  async shutdown() {
    console.log("[Worker] Shutting down worker...");

    // Wait for active tasks to complete
    const activeTasks = Array.from(this.processingTasks.entries());
    if (activeTasks.length > 0) {
      console.log(`[Worker] Waiting for ${activeTasks.length} active tasks...`);

      // Set a reasonable timeout
      const timeout = setTimeout(() => {
        console.warn("[Worker] Shutdown timeout reached, forcing shutdown");
      }, 30000); // 30 seconds

      // Wait for all tasks
      await Promise.allSettled(
        activeTasks.map(([taskId, task]) => task.job.finished())
      );

      clearTimeout(timeout);
    }

    console.log("[Worker] Worker shutdown complete");
  }

  calculateCost(tokens, model) {
    // Simple cost calculation based on token usage
    const costPerThousandTokens = {
      "gpt-4": 0.03,
      "gpt-3.5-turbo": 0.002,
      "claude-2": 0.01,
      "claude-instant": 0.001,
    };

    const rate = costPerThousandTokens[model] || 0.002;
    return (tokens / 1000) * rate;
  }
}

module.exports = new AgentTaskWorker();
