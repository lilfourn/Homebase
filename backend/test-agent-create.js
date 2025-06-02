const axios = require('axios');

async function testAgentTaskCreation() {
  const API_URL = 'http://localhost:8080';
  
  try {
    console.log('Testing Agent Task Creation...\n');

    // Test data
    const taskData = {
      courseInstanceId: 'test-course-123',
      taskName: 'Test Note Taking Task',
      agentType: 'note-taker',
      config: {
        format: 'bullet-points',
        style: 'concise'
      },
      files: [
        { fileId: 'file-123' }
      ]
    };

    console.log('1. Creating agent task with data:', JSON.stringify(taskData, null, 2));
    
    // Note: In real usage, you'd need a valid Clerk auth token
    // For testing, you can modify the backend temporarily to skip auth
    const response = await axios.post(`${API_URL}/api/agents/tasks/create`, taskData, {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });

    console.log('\n2. Response:', JSON.stringify(response.data, null, 2));

    if (response.data.jobId) {
      console.log('\n3. Task created successfully!');
      console.log('   Task ID:', response.data.taskId);
      console.log('   Job ID:', response.data.jobId);
      
      // Check job status
      console.log('\n4. Checking job status...');
      const statusResponse = await axios.get(
        `${API_URL}/api/agents/jobs/${response.data.jobId}/status`,
        {
          headers: {
            'Authorization': 'Bearer test-token'
          }
        }
      );
      
      console.log('   Job Status:', JSON.stringify(statusResponse.data, null, 2));
    }

  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run test
testAgentTaskCreation();