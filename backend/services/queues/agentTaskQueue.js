const Queue = require("bull");
const Redis = require("ioredis");
const { bullConfig } = require("../../config/redis");
const QueueMonitor = require("./queueMonitor");

class AgentTaskQueue {
  constructor() {
    this.queue = new Queue("agent-tasks", {
      createClient: (type) => {
        // Create new Redis instances for Bull with proper config
        return new Redis(bullConfig);
      },
      defaultJobOptions: {
        removeOnComplete: {
          age: 24 * 3600, // 24 hours
          count: 100, // Keep last 100
        },
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        timeout: 300000, // 5 minutes default timeout
      },
    });

    this.setupEventHandlers();

    // Initialize queue monitor
    this.monitor = new QueueMonitor(this.queue);
  }

  setupEventHandlers() {
    this.queue.on("completed", (job, result) => {
      console.log(`[Queue] Job ${job.id} completed`);
    });

    this.queue.on("failed", (job, err) => {
      console.error(`[Queue] Job ${job.id} failed:`, err.message);

      // Check if it's a timeout error
      if (err.message && err.message.includes("timed out")) {
        this.handleTimeout(job);
      }
    });

    this.queue.on("stalled", (job) => {
      console.warn(`[Queue] Job ${job.id} stalled`);
    });
  }

  async handleTimeout(job) {
    const { taskId } = job.data;
    const AgentTask = require("../../models/agentTask.model");

    try {
      await AgentTask.findByIdAndUpdate(taskId, {
        status: "failed",
        error:
          "Task processing timed out. Please try with smaller files or simpler requests.",
        completedAt: new Date(),
      });
    } catch (error) {
      console.error(
        `[Queue] Failed to update timeout status for task ${taskId}:`,
        error
      );
    }
  }

  async addTask(taskData, options = {}) {
    // Calculate dynamic timeout based on agent type and file sizes
    const timeout = this.calculateTimeout(taskData);

    const jobOptions = {
      ...options,
      timeout: options.timeout || timeout,
    };

    const job = await this.queue.add(
      "process-agent-task",
      taskData,
      jobOptions
    );
    return job.id;
  }

  calculateTimeout(taskData) {
    const { agentType, files } = taskData;

    // Base timeout per agent type (in ms)
    const baseTimeouts = {
      "note-taker": 180000, // 3 minutes
      researcher: 300000, // 5 minutes
      "study-buddy": 240000, // 4 minutes
      assignment: 360000, // 6 minutes
    };

    // Calculate total file size in MB
    const totalSizeMB = files.reduce((sum, file) => {
      return sum + (file.size || 0) / (1024 * 1024);
    }, 0);

    // Add 30 seconds per MB
    const sizeTimeout = totalSizeMB * 30000;

    // Get base timeout for agent type
    const baseTimeout = baseTimeouts[agentType] || 300000;

    // Total timeout with max of 10 minutes
    const totalTimeout = Math.min(baseTimeout + sizeTimeout, 600000);

    console.log(
      `[Queue] Calculated timeout for ${agentType}: ${totalTimeout}ms (${totalTimeout / 1000}s)`
    );

    return totalTimeout;
  }

  async getJob(jobId) {
    return await this.queue.getJob(jobId);
  }

  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  async close() {
    await this.queue.close();
  }

  async getDashboardData() {
    return await this.monitor.getDashboardData();
  }

  async getHealth() {
    return await this.monitor.getQueueHealth();
  }
}

module.exports = new AgentTaskQueue();
