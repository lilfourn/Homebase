const Queue = require('bull');
const Redis = require('ioredis');
const { bullConfig } = require('../../config/redis');
const agentTaskWorker = require('./agentTaskWorker');

async function startWorker() {
  console.log('[Worker] Starting agent task worker...');

  const queue = new Queue('agent-tasks', {
    createClient: (type) => {
      // Create new Redis instances for Bull with proper config
      return new Redis(bullConfig);
    }
  });

  // Process jobs with concurrency of 2
  queue.process('process-agent-task', 2, async (job) => {
    return await agentTaskWorker.processTask(job);
  });

  // Queue event handlers
  queue.on('error', (error) => {
    console.error('[Worker] Queue error:', error);
  });

  queue.on('waiting', (jobId) => {
    console.log(`[Worker] Job ${jobId} is waiting`);
  });

  queue.on('active', (job) => {
    console.log(`[Worker] Job ${job.id} has started`);
  });

  queue.on('completed', (job, result) => {
    console.log(`[Worker] Job ${job.id} completed successfully`);
  });

  queue.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job.id} failed:`, err.message);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[Worker] SIGTERM received, closing queue...');
    await agentTaskWorker.shutdown();
    await queue.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[Worker] SIGINT received, closing queue...');
    await agentTaskWorker.shutdown();
    await queue.close();
    process.exit(0);
  });

  console.log('[Worker] Agent task worker started and ready');
}

// Start if run directly
if (require.main === module) {
  startWorker().catch(err => {
    console.error('[Worker] Failed to start:', err);
    process.exit(1);
  });
}

module.exports = startWorker;