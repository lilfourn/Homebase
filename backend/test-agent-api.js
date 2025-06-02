const axios = require('axios');

async function testAgentAPI() {
  const API_URL = 'http://localhost:8080';
  
  // Test data
  const testTask = {
    agentType: 'note-taker',
    files: [
      {
        fileId: 'test-file-123',
        fileName: 'Machine Learning Notes.pdf',
        mimeType: 'application/pdf',
        size: 1024 * 100 // 100KB
      }
    ],
    config: {
      noteStyle: 'bullet',
      summaryLength: 'moderate',
      includeFormulas: true
    }
  };

  try {
    console.log('Testing Agent API...\n');

    // 1. Test queue status
    console.log('1. Testing queue status endpoint...');
    const queueResponse = await axios.get(`${API_URL}/api/agents/queue/status`, {
      headers: {
        'Authorization': 'Bearer test-token' // You'll need a real Clerk token
      }
    });
    console.log('Queue Status:', queueResponse.data);
    console.log('---\n');

    // 2. Test creating a task
    console.log('2. Testing task creation...');
    console.log('Request payload:', JSON.stringify(testTask, null, 2));
    
    // Note: You'll need a real Clerk auth token for this to work
    // const createResponse = await axios.post(
    //   `${API_URL}/api/agents/tasks/create`,
    //   testTask,
    //   {
    //     headers: {
    //       'Authorization': 'Bearer YOUR_CLERK_TOKEN',
    //       'Content-Type': 'application/json'
    //     },
    //     params: {
    //       courseInstanceId: 'test-course-123'
    //     }
    //   }
    // );
    // console.log('Create Response:', createResponse.data);

    console.log('\nNote: To test task creation, you need a valid Clerk auth token.');
    console.log('You can get one from your browser\'s dev tools while logged into the app.');

  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAgentAPI();