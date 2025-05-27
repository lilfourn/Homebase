"use client";

import { fetchCourseByInstanceId } from "@/app/api/courses.api";
import { fetchUserByClerkId } from "@/app/api/users.api";
import CourseGoogleDriveImporter from "@/app/components/courses/CourseGoogleDriveImporter.jsx";
import { useAuth, useUser } from "@clerk/nextjs";
import * as LucideIcons from "lucide-react";
import { Folder, Library, ListChecks } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
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
  const { getToken, isSignedIn, isLoaded, userId: authUserId } = useAuth();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const courseInstanceId = params.courseID as string; // courseID from URL maps to courseInstanceId
  const router = useRouter();

  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // New state for active tab

  useEffect(() => {
    // Fetch user data for Google Drive status
    const loadUserData = async () => {
      if (isClerkLoaded && clerkUser?.id) {
        setIsLoadingUserData(true);
        try {
          const data = await fetchUserByClerkId(clerkUser.id);
          setUserData(data);
        } catch (err) {
          console.error("Failed to fetch user data for course page:", err);
          // Optionally set an error state for user data loading
        } finally {
          setIsLoadingUserData(false);
        }
      }
    };
    loadUserData();
  }, [isClerkLoaded, clerkUser]);

  useEffect(() => {
    console.log(
      "[CoursePage] Auth state: isLoaded:",
      isLoaded,
      "isSignedIn:",
      isSignedIn,
      "authUserId:",
      authUserId
    );
    console.log("[CoursePage] Received courseID from params:", params.courseID);

    if (!isLoaded) {
      console.log("[CoursePage] Auth not loaded yet, waiting...");
      setLoading(true); // Keep loading true
      return; // Wait for auth to load
    }

    if (!isSignedIn) {
      console.log("[CoursePage] User not signed in according to useAuth.");
      setLoading(false);
      setError("User not authenticated. Please sign in.");
      return;
    }

    if (!courseInstanceId || courseInstanceId === "undefined") {
      setLoading(false);
      setError("Course ID not found in URL or is invalid.");
      return;
    }

    const fetchCourse = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const data = await fetchCourseByInstanceId(courseInstanceId, token);
        setCourse(data);
      } catch (err) {
        console.error("Failed to fetch course:", err);
        if (
          err &&
          (err.status === 404 ||
            (err.message && err.message.toLowerCase().includes("not found")))
        ) {
          router.push("/dashboard");
        } else {
          setError(
            err instanceof Error ? err.message : "An unknown error occurred."
          );
        }
        setCourse(null);
      } finally {
        setLoading(false);
      }
    };

    if (
      isSignedIn &&
      isLoaded &&
      courseInstanceId &&
      courseInstanceId !== "undefined"
    ) {
      fetchCourse();
    }
  }, [
    courseInstanceId,
    getToken,
    isSignedIn,
    isLoaded,
    authUserId,
    params.courseID,
    router,
  ]);

  if (!isLoaded || loading || isLoadingUserData) {
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

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <>
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
            {/* Add other overview content here as needed */}
          </>
        );
      case "library":
        return (
          <CourseGoogleDriveImporter
            courseId={course?._id}
            isConnected={userData?.googleDrive?.connected || false}
          />
        );
      // Add more cases here for future tabs (e.g., "assignments", "syllabus")
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        {/* Header Section - remains outside tabs */}
        <div className="p-6 sm:p-8 border-b border-gray-200">
          <div className="flex items-center">
            {(() => {
              const Icon =
                course.icon && LucideIcons[course.icon]
                  ? LucideIcons[course.icon]
                  : Folder;
              return (
                <Icon
                  className="w-12 h-12 sm:w-16 sm:h-16 mr-4 sm:mr-6 text-[var(--custom-primary-color)]"
                  aria-label={`${course.name} icon`}
                />
              );
            })()}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                {course.name}
              </h1>
              <p className="text-lg sm:text-xl text-[var(--custom-primary-color)] font-semibold">
                {course.code}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav
            className="-mb-px flex space-x-1 px-4 sm:px-6 lg:px-8"
            aria-label="Tabs"
          >
            <button
              onClick={() => setActiveTab("overview")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm cursor-pointer 
                ${
                  activeTab === "overview"
                    ? "border-[var(--custom-primary-color)] text-[var(--custom-primary-color)]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              <ListChecks className="inline-block h-5 w-5 mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab("library")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm cursor-pointer 
                ${
                  activeTab === "library"
                    ? "border-[var(--custom-primary-color)] text-[var(--custom-primary-color)]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              <Library className="inline-block h-5 w-5 mr-2" />
              Library
            </button>
            {/* Add more tab buttons here as new sections are developed */}
          </nav>
        </div>

        {/* Tab Content Area */}
        <div className="p-6 sm:p-8">{renderTabContent()}</div>
      </div>
    </div>
  );
}
