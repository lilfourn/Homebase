"use client";

import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface CourseData {
  _id: string;
  userId: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  courseInstanceId: string;
  createdAt: string;
  updatedAt: string;
}

export default function CoursePage() {
  const params = useParams();
  const { getToken } = useAuth();
  const courseInstanceId = params.courseID as string; // courseID from URL maps to courseInstanceId

  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseInstanceId) {
      setLoading(false);
      setError("Course ID not found in URL.");
      return;
    }

    const fetchCourse = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) {
          setError("Authentication token not available.");
          setLoading(false);
          return;
        }

        const response = await fetch(
          `/api/courses/instance/${courseInstanceId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError(
              "Course not found or you do not have permission to view it."
            );
          } else {
            const errorData = await response.json();
            setError(errorData.message || `Error: ${response.status}`);
          }
          setCourse(null);
        } else {
          const data = await response.json();
          setCourse(data);
        }
      } catch (err) {
        console.error("Failed to fetch course:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred."
        );
        setCourse(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseInstanceId, getToken]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg text-gray-600">Loading course details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-red-50">
        <p className="text-lg text-red-600 p-4 border border-red-300 rounded-md bg-white shadow-md">
          Error: {error}
        </p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg text-gray-600">No course data to display.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex items-center mb-6">
            {course.icon && (
              <Image
                src={course.icon}
                alt={`${course.name} icon`}
                width={80}
                height={80}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mr-4 sm:mr-6 border-2 border-blue-500 object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
                {course.name}
              </h1>
              <p className="text-xl sm:text-2xl text-blue-600 font-semibold">
                {course.code}
              </p>
            </div>
          </div>

          {course.description && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Description
              </h2>
              <p className="text-gray-600 whitespace-pre-wrap">
                {course.description}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-sm text-gray-600">
            <div>
              <strong className="text-gray-700">Course Instance ID:</strong>{" "}
              {course.courseInstanceId}
            </div>
            <div>
              <strong className="text-gray-700">Internal ID:</strong>{" "}
              {course._id}
            </div>
            <div>
              <strong className="text-gray-700">Created:</strong>{" "}
              {new Date(course.createdAt).toLocaleDateString()}
            </div>
            <div>
              <strong className="text-gray-700">Last Updated:</strong>{" "}
              {new Date(course.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
