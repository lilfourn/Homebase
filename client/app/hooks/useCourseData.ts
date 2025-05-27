import { fetchCourseByInstanceId } from "@/app/api/courses.api";
import { fetchUserByClerkId } from "@/app/api/users.api";
import {
  CourseData,
  UseCourseDataReturn,
  UserData,
} from "@/app/types/course.types";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export const useCourseData = (
  courseInstanceId: string
): UseCourseDataReturn => {
  const { getToken, isSignedIn, isLoaded, userId: authUserId } = useAuth();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const router = useRouter();

  const [course, setCourse] = useState<CourseData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);

  // Fetch user data for Google Drive status
  useEffect(() => {
    const loadUserData = async () => {
      if (isClerkLoaded && clerkUser?.id) {
        setIsLoadingUserData(true);
        try {
          const data = await fetchUserByClerkId(clerkUser.id);
          setUserData(data);
        } catch (err) {
          console.error("Failed to fetch user data for course page:", err);
        } finally {
          setIsLoadingUserData(false);
        }
      }
    };
    loadUserData();
  }, [isClerkLoaded, clerkUser]);

  // Fetch course data
  useEffect(() => {
    console.log(
      "[useCourseData] Auth state: isLoaded:",
      isLoaded,
      "isSignedIn:",
      isSignedIn,
      "authUserId:",
      authUserId
    );

    if (!isLoaded) {
      console.log("[useCourseData] Auth not loaded yet, waiting...");
      setLoading(true);
      return;
    }

    if (!isSignedIn) {
      console.log("[useCourseData] User not signed in according to useAuth.");
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
      } catch (err: any) {
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
  }, [courseInstanceId, getToken, isSignedIn, isLoaded, authUserId, router]);

  return {
    course,
    userData,
    loading,
    error,
    isLoadingUserData,
  };
};
