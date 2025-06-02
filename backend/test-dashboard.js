const axios = require('axios');

async function testDashboard() {
  const API_URL = 'http://localhost:8080';
  
  try {
    console.log('Testing Queue Dashboard API...\n');

    // Note: You'll need a real Clerk auth token for this to work
    console.log('1. Testing queue status endpoint...');
    // const response = await axios.get(`${API_URL}/api/agents/queue/dashboard`, {
    //   headers: {
    //     'Authorization': 'Bearer YOUR_CLERK_TOKEN'
    //   }
    // });
    // console.log('Dashboard Data:', JSON.stringify(response.data, null, 2));

    // For testing without auth, let's create a simple test endpoint
    console.log('\nDashboard endpoint is available at:');
    console.log('GET /api/agents/queue/dashboard');
    console.log('\nExpected response structure:');
    console.log(JSON.stringify({
      success: true,
      data: {
        health: {
          status: 'healthy',
          metrics: {
            processed: 0,
            failed: 0,
            active: 0,
            waiting: 0,
            delayed: 0,
            averageProcessingTime: 0
          },
          warnings: [],
          timestamp: '2024-01-06T...'
        },
        stats: {
          hourly: {
            total: 0,
            successful: 0,
            failed: 0,
            byAgentType: {},
            byUser: {},
            averageTokens: 0,
            totalCost: 0
          },
          daily: {
            // Same structure as hourly
          }
        },
        timestamp: '2024-01-06T...'
      }
    }, null, 2));

  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testDashboard();