const agentTaskQueue = require('./services/queues/agentTaskQueue');

async function testQueueSystem() {
  console.log('Testing queue system...');

  // Add a test job
  const jobId = await agentTaskQueue.addTask({
    taskId: 'test_' + Date.now(),
    userId: 'test_user',
    courseInstanceId: 'test_course',
    agentType: 'note-taker',
    config: {
      noteStyle: 'bullet',
      summaryLength: 'moderate',
      includeFormulas: true
    },
    files: [
      {
        fileName: 'test.txt',
        mimeType: 'text/plain',
        content: 'This is a test file content. It contains information about machine learning, artificial intelligence, and neural networks. The content is designed to test the note-taking capabilities of our AI agent.',
        size: 200,
        wordCount: 30
      }
    ]
  });

  console.log('Job added with ID:', jobId);

  // Check queue stats
  const stats = await agentTaskQueue.getQueueStats();
  console.log('Queue stats:', stats);

  // Get job status
  const job = await agentTaskQueue.getJob(jobId);
  console.log('Job state:', await job.getState());

  // Monitor job progress
  const checkProgress = setInterval(async () => {
    const updatedJob = await agentTaskQueue.getJob(jobId);
    const state = await updatedJob.getState();
    console.log(`Job ${jobId} - State: ${state}, Progress: ${updatedJob.progress()}%`);
    
    if (state === 'completed' || state === 'failed') {
      console.log('Job result:', updatedJob.returnvalue);
      console.log('Failed reason:', updatedJob.failedReason);
      clearInterval(checkProgress);
      
      // Final stats
      const finalStats = await agentTaskQueue.getQueueStats();
      console.log('Final queue stats:', finalStats);
      
      // Close queue connection
      await agentTaskQueue.close();
      process.exit(0);
    }
  }, 2000);

  // Timeout after 30 seconds
  setTimeout(() => {
    console.log('Test timeout reached');
    clearInterval(checkProgress);
    agentTaskQueue.close();
    process.exit(1);
  }, 30000);
}

testQueueSystem().catch(console.error);