import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL;

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Validate and create an agent task
 * @param {Object} taskData - Task configuration
 * @param {string} taskData.courseInstanceId - Course ID
 * @param {string} taskData.taskName - Name of the task
 * @param {string} taskData.agentType - Type of agent (note-taker, researcher, study-buddy, assignment)
 * @param {Object} taskData.config - Agent-specific configuration
 * @param {Array} taskData.files - Array of file objects with fileId
 * @param {string} token - Auth token
 */
export async function validateAndCreateTask(taskData, token) {
  try {
    const response = await axiosInstance.post(
      "/api/agents/tasks/validate",
      taskData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error validating agent task:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
}

/**
 * Create an agent task with queue processing
 * @param {Object} taskData - Task configuration
 * @param {string} token - Auth token
 */
export async function createTaskWithQueue(taskData, token) {
  try {
    const response = await axiosInstance.post(
      "/api/agents/tasks/create",
      taskData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error creating agent task:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
}

/**
 * Get job status for a queued task
 * @param {string} jobId - Job ID from queue
 * @param {string} token - Auth token
 */
export async function getJobStatus(jobId, token) {
  try {
    const response = await axiosInstance.get(
      `/api/agents/jobs/${jobId}/status`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error getting job status:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
}

/**
 * Get queue status and statistics
 * @param {string} token - Auth token
 */
export async function getQueueStatus(token) {
  try {
    const response = await axiosInstance.get("/api/agents/queue/status", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error getting queue status:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
}

/**
 * Get queue dashboard data with metrics
 * @param {string} token - Auth token
 */
export async function getQueueDashboard(token) {
  try {
    const response = await axiosInstance.get("/api/agents/queue/dashboard", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error getting dashboard data:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
}

/**
 * Get user's agent usage statistics
 * @param {string} token - Auth token
 */
export async function getUserUsage(token) {
  try {
    const response = await axiosInstance.get("/api/agents/usage", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error getting user usage:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
}

/**
 * Poll job status until completion
 * @param {string} jobId - Job ID
 * @param {string} token - Auth token
 * @param {Object} options - Polling options
 * @param {number} options.interval - Polling interval in ms (default: 2000)
 * @param {number} options.timeout - Maximum polling time in ms (default: 600000)
 * @param {Function} options.onProgress - Progress callback
 * @param {Function} options.onComplete - Completion callback
 * @param {Function} options.onError - Error callback
 */
export async function pollJobStatus(jobId, token, options = {}) {
  const {
    interval = 2000,
    timeout = 600000,
    onProgress = () => {},
    onComplete = () => {},
    onError = () => {},
  } = options;

  const startTime = Date.now();
  let polling = true;

  const poll = async () => {
    if (!polling) return;

    try {
      const response = await getJobStatus(jobId, token);
      const { job } = response;

      // Update progress
      if (job.progress !== undefined) {
        onProgress(job.progress);
      }

      // Check if completed
      if (job.state === "completed") {
        polling = false;
        onComplete(job.result);
        return;
      }

      // Check if failed
      if (job.state === "failed") {
        polling = false;
        onError(new Error(job.failedReason || "Task failed"));
        return;
      }

      // Check timeout
      if (Date.now() - startTime > timeout) {
        polling = false;
        onError(new Error("Task timeout exceeded"));
        return;
      }

      // Continue polling
      setTimeout(poll, interval);
    } catch (error) {
      polling = false;
      onError(error);
    }
  };

  // Start polling
  poll();

  // Return stop function
  return () => {
    polling = false;
  };
}