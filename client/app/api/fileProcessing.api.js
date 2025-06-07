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
    if (typeof window !== "undefined") {
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
    formData.append("file", file);

    const config = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    };

    // Add auth token if provided
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const response = await api.post("/process/upload", formData, config);

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
        Authorization: `Bearer ${token}`,
      };
    }

    const response = await api.post(
      "/process/google-drive",
      {
        fileId,
        fileName,
      },
      config
    );

    return response.data;
  } catch (error) {
    console.error("Error processing Google Drive file:", error);

    // Check for Google Drive authentication errors (401 with specific error code)
    const errorData = error.response?.data;
    if (
      error.response?.status === 401 &&
      errorData?.errorCode === "GOOGLE_INVALID_GRANT"
    ) {
      // Create a specific error object for this case
      const authError = new Error(
        errorData.error || "Google Drive authentication is invalid"
      );
      authError.isGoogleDriveAuthError = true;
      throw authError;
    }

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
    const response = await api.post("/process/multiple", { files });

    return response.data;
  } catch (error) {
    console.error("Error processing multiple files:", error);
    throw error.response?.data || error;
  }
};

/**
 * Upload file for terminal use
 * @param {File} file - The file to upload
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Uploaded file data
 */
export const uploadTerminalFile = async (file, token, fileDataB64 = null) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    // Append base64 data if it exists
    if (fileDataB64) {
      formData.append("base64Content", fileDataB64);
    }

    const config = {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`,
      },
      timeout: 120000, // 2 minutes for larger files
    };

    const response = await api.post("/terminal/upload", formData, config);
    return response.data;
  } catch (error) {
    console.error("Error uploading terminal file:", error);

    // Handle specific error cases
    if (error.response?.status === 413) {
      throw new Error("File size exceeds 50MB limit");
    }

    throw error.response?.data || error;
  }
};

/**
 * Import Google Drive file for terminal use
 * @param {string} fileId - Google Drive file ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Imported file data
 */
export const importTerminalGoogleDriveFile = async (fileId, token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await api.post(
      "/terminal/import-google-drive",
      { fileId },
      config
    );

    return response.data;
  } catch (error) {
    console.error("Error importing Google Drive file for terminal:", error);

    // Check for Google Drive authentication errors
    const errorData = error.response?.data;
    if (
      error.response?.status === 401 &&
      errorData?.errorCode === "GOOGLE_INVALID_GRANT"
    ) {
      const authError = new Error(
        errorData.error || "Google Drive authentication is invalid"
      );
      authError.isGoogleDriveAuthError = true;
      throw authError;
    }

    throw error.response?.data || error;
  }
};

/**
 * Remove file from terminal
 * @param {string} fileId - File ID to remove
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Success response
 */
export const removeTerminalFile = async (fileId, token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await api.delete(`/terminal/file/${fileId}`, config);
    return response.data;
  } catch (error) {
    console.error("Error removing terminal file:", error);
    throw error.response?.data || error;
  }
};

/**
 * Get content of a local terminal file
 * @param {string} fileId - File ID to retrieve content for
 * @param {string} token - Auth token
 * @returns {Promise<Object>} File content and metadata
 */
export const getTerminalFileContent = async (fileId, token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await api.get(`/terminal/file/${fileId}/content`, config);
    return response.data;
  } catch (error) {
    console.error("Error getting terminal file content:", error);
    throw error.response?.data || error;
  }
};

/**
 * Get full metadata for a terminal file
 * @param {string} fileId - File ID to retrieve
 * @param {string} token - Auth token
 * @returns {Promise<Object>} File object
 */
export const getTerminalFile = async (fileId, token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await api.get(`/terminal/file/${fileId}`, config);
    return response.data;
  } catch (error) {
    console.error("Error getting terminal file:", error);
    throw error.response?.data || error;
  }
};
