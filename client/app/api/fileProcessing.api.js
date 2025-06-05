import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/file-processing`,
  timeout: 60000, // 60 seconds for file processing
});

// Function to set auth token
const setAuthToken = async (config) => {
  try {
    // Import on client-side only
    if (typeof window !== 'undefined') {
      const { auth } = await import("@clerk/nextjs");
      const { getToken } = auth();
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (error) {
    console.error("Error getting auth token:", error);
  }
  return config;
};

/**
 * Process a file uploaded directly
 * @param {File} file - The file to process
 * @returns {Promise<Object>} Processed file data
 */
export const processUploadedFile = async (file, token) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };

    // Add auth token if provided
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const response = await api.post('/process/upload', formData, config);

    return response.data;
  } catch (error) {
    console.error("Error processing uploaded file:", error);
    throw error.response?.data || error;
  }
};

/**
 * Process a file from Google Drive
 * @param {string} fileId - Google Drive file ID
 * @param {string} fileName - File name
 * @returns {Promise<Object>} Processed file data
 */
export const processGoogleDriveFile = async (fileId, fileName, token) => {
  try {
    const config = {};
    
    // Add auth token if provided
    if (token) {
      config.headers = {
        Authorization: `Bearer ${token}`
      };
    }

    const response = await api.post('/process/google-drive', {
      fileId,
      fileName,
    }, config);

    return response.data;
  } catch (error) {
    console.error("Error processing Google Drive file:", error);
    throw error.response?.data || error;
  }
};

/**
 * Process multiple files from Google Drive
 * @param {Array<{fileId: string, fileName: string}>} files - Array of files to process
 * @returns {Promise<Object>} Processed files data
 */
export const processMultipleFiles = async (files) => {
  try {
    const response = await api.post('/process/multiple', { files });

    return response.data;
  } catch (error) {
    console.error("Error processing multiple files:", error);
    throw error.response?.data || error;
  }
};