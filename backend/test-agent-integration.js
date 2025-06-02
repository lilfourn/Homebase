// Test script for Express-Convex integration
require('dotenv').config();
const convexService = require('./services/convexService');
const hybridDataService = require('./services/hybridDataService');

async function testConvexIntegration() {
  console.log('Testing Express-Convex Integration...\n');
  
  // Test 1: Convex client initialization
  console.log('1. Testing Convex client initialization...');
  try {
    const testUserId = 'test_user_123';
    const tasks = await convexService.listTasks({ 
      userId: testUserId,
      limit: 5 
    });
    console.log('✅ Convex client initialized successfully');
    console.log(`   Found ${tasks?.tasks?.length || 0} tasks for test user\n`);
  } catch (error) {
    console.log('❌ Convex client initialization failed:', error.message, '\n');
  }

  // Test 2: Hybrid data service
  console.log('2. Testing hybrid data service...');
  try {
    // This will fail gracefully if no real data exists
    const usage = await hybridDataService.getUserUsageStats('test_user_123');
    console.log('✅ Hybrid data service working');
    console.log(`   Usage stats:`, {
      totalTasks: usage.totalTasks,
      remainingTasks: usage.remainingTasks
    }, '\n');
  } catch (error) {
    console.log('❌ Hybrid data service failed:', error.message, '\n');
  }

  // Test 3: Job queue connection
  console.log('3. Testing job queue...');
  try {
    const jobQueue = require('./services/jobQueue');
    const status = await jobQueue.getQueueStatus('agent-task-processing');
    console.log('✅ Job queue connected');
    console.log(`   Queue status:`, status, '\n');
  } catch (error) {
    console.log('❌ Job queue connection failed (Redis may not be running):', error.message, '\n');
  }

  console.log('Integration test complete!');
  console.log('\nNext steps:');
  console.log('1. Ensure Redis is running for job queue');
  console.log('2. Update frontend AgentsTab component to use Convex hooks');
  console.log('3. Test the complete flow with real data');
  
  process.exit(0);
}

testConvexIntegration().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});