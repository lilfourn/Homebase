import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL;

const axiosInstance = axios.create({
  baseURL: API_URL,
});

export async function fetchCourses() {
  const res = await fetch(`${API_URL}/api/courses`);
  if (!res.ok) throw new Error(`Fetch error: ${res.status}`);
  return res.json();
}

export async function deleteCourse(id) {
  const res = await fetch(`${API_URL}/api/courses/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Delete error: ${res.status}`);
  return res.json();
}

export async function fetchCourseByInstanceId(courseInstanceId, token) {
  if (!token) {
    throw new Error("Authentication token not provided.");
  }
  if (!courseInstanceId) {
    throw new Error("Course instance ID not provided.");
  }

  const res = await fetch(
    `${API_URL}/api/courses/instance/${courseInstanceId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    // It's helpful to try and parse the error message from the backend if available
    let errorMessage = `Error fetching course: ${res.status}`;
    try {
      const errorData = await res.json();
      if (errorData && errorData.message) {
        errorMessage = errorData.message;
      }
    } catch (e) {
      // Could not parse JSON, use status text or default message
      errorMessage = res.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

export const updateCourse = async (courseInstanceId, data, authToken) => {
  try {
    const response = await axiosInstance.put(
      `/courses/${courseInstanceId}`,
      data,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error updating course:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};

export const getSyllabusStatus = async (courseInstanceId, authToken) => {
  try {
    const response = await axiosInstance.get(
      `/api/syllabus/${courseInstanceId}/status`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching syllabus status:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};

export const getSyllabus = async (courseInstanceId, authToken) => {
  try {
    const response = await axiosInstance.get(
      `/api/syllabus/${courseInstanceId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching syllabus:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};

export const processSyllabus = async (courseInstanceId, authToken) => {
  try {
    const response = await axiosInstance.post(
      `/api/syllabus/${courseInstanceId}/process`,
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
      "Error processing syllabus:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};

export const getSyllabusProcessingStatus = async (
  courseInstanceId,
  authToken
) => {
  try {
    const response = await axiosInstance.get(
      `/api/syllabus/${courseInstanceId}/processing-status`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error getting syllabus processing status:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};

export const getSyllabusParsedData = async (courseInstanceId, authToken) => {
  try {
    const response = await axiosInstance.get(
      `/api/syllabus/${courseInstanceId}/parsed-data`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error getting syllabus parsed data:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};

export const reprocessSyllabus = async (courseInstanceId, authToken) => {
  try {
    const response = await axiosInstance.post(
      `/api/syllabus/${courseInstanceId}/reprocess`,
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
      "Error reprocessing syllabus:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};

export const updateSyllabusParsedData = async (
  courseInstanceId,
  parsedData,
  authToken
) => {
  try {
    const response = await axiosInstance.put(
      `/api/syllabus/${courseInstanceId}/parsed-data`,
      { parsedData },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error updating syllabus parsed data:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};

export const getMatchedTA = async (courseInstanceId, authToken) => {
  try {
    const response = await axiosInstance.get(
      `/api/syllabus/${courseInstanceId}/matched-ta`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error getting matched TA:",
      error.response?.data || error.message || error
    );
    throw error.response?.data || error.message || error;
  }
};

export const addTAManually = async (courseInstanceId, taData, authToken) => {
  try {
    const response = await axiosInstance.post(
      `/api/syllabus/${courseInstanceId}/add-ta`,
      { taData },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error adding TA manually:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};

export const updateTASetupStatus = async (
  courseInstanceId,
  status,
  authToken
) => {
  try {
    const response = await axiosInstance.put(
      `/api/syllabus/${courseInstanceId}/ta-setup-status`,
      { status },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error updating TA setup status:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};
