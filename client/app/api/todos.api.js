import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL;

const axiosInstance = axios.create({
  baseURL: API_URL,
});

// Get all todos for a course
export const getTodosByCourse = async (courseInstanceId, authToken) => {
  try {
    const response = await axiosInstance.get(
      `/api/todos/${courseInstanceId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching todos:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
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