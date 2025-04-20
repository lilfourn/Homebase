"use client"

import { createContext, useState, useContext, useCallback, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Create the context
const CourseContext = createContext();

// Create a provider component
export function CourseProvider({ children }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all courses for the current user
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/courses/mine`, { 
        credentials: "include" 
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setCourses(data);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add a new course
  const addCourse = useCallback(async (courseData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/courses`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error: ${response.status}`);
      }
      
      const newCourse = await response.json();
      
      // Update the courses state with the new course
      setCourses(prevCourses => [...prevCourses, newCourse]);
      
      return newCourse;
    } catch (err) {
      console.error("Error adding course:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a course
  const deleteCourse = useCallback(async (courseId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/courses/${courseId}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error: ${response.status}`);
      }
      
      // Remove the deleted course from state
      setCourses(prevCourses => prevCourses.filter(course => course._id !== courseId));
      
    } catch (err) {
      console.error("Error deleting course:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

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
    deleteCourse
  };

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
}

// Custom hook to use the course context
export function useCourses() {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error('useCourses must be used within a CourseProvider');
  }
  return context;
}
