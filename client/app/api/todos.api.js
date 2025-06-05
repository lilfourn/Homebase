import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL;

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 20000, // 20 second timeout to account for server timeouts
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for consistent error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout - please check your connection';
    } else if (error.code === 'ERR_NETWORK') {
      error.message = 'Network error - please check your connection';
    } else if (!error.response) {
      error.message = 'Cannot connect to server';
    }
    return Promise.reject(error);
  }
);

// Get todo stats for all user courses
export const getTodoStatsByUser = async (authToken) => {
  try {
    const response = await axiosInstance.get(
      `/api/todos/stats/all`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    
    if (!response.data) {
      return { success: false, error: "No data received from server", stats: {} };
    }
    
    return response.data;
  } catch (error) {
    console.error("Error fetching todo stats:", error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || "Failed to fetch todo stats",
      stats: {}
    };
  }
};

// Get all todos for a course
export const getTodosByCourse = async (courseInstanceId, authToken) => {
  try {
    const response = await axiosInstance.get(
      `/api/todos/${courseInstanceId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        // timeout already set in axios instance
      }
    );
    
    // Ensure we always return the expected format
    if (!response.data) {
      return { success: false, error: "No data received from server", data: [] };
    }
    
    // Handle various response formats
    if (typeof response.data === 'object' && 'success' in response.data) {
      return response.data;
    }
    
    // If response is just an array of todos
    if (Array.isArray(response.data)) {
      return { success: true, data: response.data };
    }
    
    // Unexpected format
    console.error("Unexpected response format:", response.data);
    return { success: false, error: "Unexpected response format", data: [] };
  } catch (error) {
    console.error(
      "Error fetching todos:",
      error.response?.data || error.message
    );
    
    // Handle timeout specifically
    if (error.code === 'ECONNABORTED') {
      return { success: false, error: "Request timeout - please try again", data: [] };
    }
    
    // Return standardized error format
    return {
      success: false,
      error: error.response?.data?.message || error.message || "Failed to fetch todos",
      data: [],
    };
  }
};

// Create a new todo
export const createTodo = async (todoData, authToken) => {
  try {
    const response = await axiosInstance.post(
      "/api/todos",
      todoData,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error creating todo:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};

// Update a todo
export const updateTodo = async (todoId, todoData, authToken) => {
  try {
    const response = await axiosInstance.put(
      `/api/todos/${todoId}`,
      todoData,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error updating todo:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};

// Toggle todo completion
export const toggleTodoCompletion = async (todoId, authToken) => {
  try {
    const response = await axiosInstance.patch(
      `/api/todos/${todoId}/toggle`,
      {},
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error toggling todo:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};

// Delete a todo
export const deleteTodo = async (todoId, authToken) => {
  try {
    const response = await axiosInstance.delete(
      `/api/todos/${todoId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error deleting todo:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};

// Bulk update todos
export const bulkUpdateTodos = async (todoIds, updates, authToken) => {
  try {
    const response = await axiosInstance.patch(
      "/api/todos/bulk/update",
      { todoIds, updates },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error bulk updating todos:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};