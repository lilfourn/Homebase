const Queue = require('bull');
const Redis = require('ioredis');
const { bullConfig } = require('./config/redis');

async function testWorker() {
  console.log('[TestWorker] Starting test worker...');

  const queue = new Queue('agent-tasks', {
    createClient: (type) => {
      return new Redis(bullConfig);
    }
  });

  // Process jobs
  queue.process('process-agent-task', async (job) => {
    console.log('[TestWorker] Processing job:', job.id);
    console.log('[TestWorker] Job data:', job.data);
    
    // Simulate progress
    for (let i = 0; i <= 100; i += 10) {
      await job.progress(i);
      console.log(`[TestWorker] Progress: ${i}%`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return {
      success: true,
      message: 'Test job completed'
    };
  });

  console.log('[TestWorker] Test worker ready');
}

testWorker().catch(console.error);