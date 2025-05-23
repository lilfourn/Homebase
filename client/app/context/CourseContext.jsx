"use client";

import { useAuth } from "@clerk/nextjs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Create the context
const CourseContext = createContext();

// Create a provider component
export function CourseProvider({ children }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { getToken, isSignedIn } = useAuth();

  // Fetch all courses for the current user
  const fetchCourses = useCallback(async () => {
    if (!isSignedIn) {
      console.log("User not signed in, clearing courses");
      setCourses([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("Fetching courses for signed-in user");
      console.log("API URL:", API_URL);

      const token = await getToken();
      console.log("Got auth token:", token ? "✓" : "✗");

      const apiUrl = `${API_URL}/api/courses/mine`;
      console.log("Fetching from:", apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Courses fetch response status:", response.status);
      console.log(
        "Courses fetch response headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Courses fetch error response:", errorText);
        throw new Error(`Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Courses data received:", data);
      setCourses(data);
    } catch (err) {
      console.error("Error fetching courses:", err);
      console.error("Error details:", {
        name: err.name,
        message: err.message,
        stack: err.stack,
      });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken, isSignedIn]);

  // Add a new course
  const addCourse = useCallback(
    async (courseData) => {
      if (!isSignedIn) {
        setError("Must be signed in to add courses");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const token = await getToken();
        const response = await fetch(`${API_URL}/api/courses`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(courseData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error: ${response.status}`);
        }

        const newCourse = await response.json();

        // Update the courses state with the new course
        setCourses((prevCourses) => [...prevCourses, newCourse]);

        return newCourse;
      } catch (err) {
        console.error("Error adding course:", err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getToken, isSignedIn]
  );

  // Delete a course
  const deleteCourse = useCallback(
    async (courseId) => {
      if (!isSignedIn) {
        setError("Must be signed in to delete courses");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const token = await getToken();
        const response = await fetch(`${API_URL}/api/courses/${courseId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error: ${response.status}`);
        }

        // Remove the deleted course from state
        setCourses((prevCourses) =>
          prevCourses.filter((course) => course._id !== courseId)
        );
      } catch (err) {
        console.error("Error deleting course:", err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getToken, isSignedIn]
  );

  // Initialize courses on mount
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const value = {
    courses,
    loading,
    error,
    fetchCourses,
    addCourse,
    deleteCourse,
  };

  return (
    <CourseContext.Provider value={value}>{children}</CourseContext.Provider>
  );
}

// Custom hook to use the course context
export function useCourses() {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error("useCourses must be used within a CourseProvider");
  }
  return context;
}
