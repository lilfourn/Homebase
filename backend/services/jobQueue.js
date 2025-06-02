const Queue = require('bull');
const agentTaskWorker = require('./workers/agentTaskWorker');

class JobQueueService {
  constructor() {
    this.queues = {};
    this.initializeQueues();
  }

  initializeQueues() {
    // Initialize agent task processing queue
    this.queues['agent-task-processing'] = new Queue('agent-task-processing', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      }
    });

    // Set up queue processor
    this.queues['agent-task-processing'].process(5, async (job) => {
      return await agentTaskWorker.processTask(job);
    });

    // Set up event handlers
    this.setupQueueEvents('agent-task-processing');
  }

  setupQueueEvents(queueName) {
    const queue = this.queues[queueName];

    queue.on('completed', (job, result) => {
      console.log(`[JobQueue] Job ${job.id} completed in queue ${queueName}`);
    });

    queue.on('failed', (job, err) => {
      console.error(`[JobQueue] Job ${job.id} failed in queue ${queueName}:`, err);
    });

    queue.on('stalled', (job) => {
      console.warn(`[JobQueue] Job ${job.id} stalled in queue ${queueName}`);
    });
  }

  async addJob(queueName, data, options = {}) {
    const queue = this.queues[queueName];
    
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const defaultOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: true,
      removeOnFail: false
    };

    const job = await queue.add(data, { ...defaultOptions, ...options });
    console.log(`[JobQueue] Added job ${job.id} to queue ${queueName}`);
    
    return job;
  }

  async getJob(queueName, jobId) {
    const queue = this.queues[queueName];
    
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return await queue.getJob(jobId);
  }

  async getQueueStatus(queueName) {
    const queue = this.queues[queueName];
    
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed
    };
  }

  async cleanQueue(queueName, grace = 0) {
    const queue = this.queues[queueName];
    
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.clean(grace, 'completed');
    await queue.clean(grace, 'failed');
  }

  async closeAll() {
    for (const queueName in this.queues) {
      await this.queues[queueName].close();
    }
  }
}

// Export singleton instance
module.exports = new JobQueueService();