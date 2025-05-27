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
