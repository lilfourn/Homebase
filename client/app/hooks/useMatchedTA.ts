import { getMatchedTA } from "@/app/api/courses.api";
import { useTASetup } from "@/app/context/TASetupContext";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";

export interface MatchedTAResult {
  matchedTA: {
    name: string;
    role: string;
    email: string;
    phone: string;
    officeHours?: string;
    assignmentRule?: string;
  } | null;
  allTAs: Array<{
    name: string;
    role: string;
    email: string;
    phone: string;
    officeHours?: string;
    assignmentRule?: string;
  }>;
  matchCriteria: {
    hasLastName: boolean;
    hasStudentId: boolean;
    matchedBy: "lastName" | "studentId" | "default" | "fallback" | null;
  };
  userInfo: {
    hasLastName: boolean;
    hasStudentId: boolean;
  };
  taSetupStatus?: string | null;
}

export function useMatchedTA(
  courseInstanceId: string | null,
  courseName?: string
) {
  const { getToken } = useAuth();
  const { openTASetupModal } = useTASetup();
  const [matchResult, setMatchResult] = useState<MatchedTAResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsLastName, setNeedsLastName] = useState(false);

  const fetchMatchedTA = useCallback(async () => {
    if (!courseInstanceId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("No authentication token");
      }

      const result = await getMatchedTA(courseInstanceId, token);

      // Ensure we have a valid result structure
      if (result && typeof result === "object") {
        setMatchResult(result);

        // Check if we should show the TA setup modal
        // Only show if:
        // 1. There are no TAs
        // 2. The taSetupStatus is null or 'pending' (not yet addressed)
        const shouldShowModal =
          result.allTAs.length === 0 &&
          (!result.taSetupStatus || result.taSetupStatus === "pending");

        if (shouldShowModal) {
          openTASetupModal(courseInstanceId, courseName);
        }

        // Check if user needs to provide lastName for TA matching
        // This happens when there are TAs with assignment rules but user has no lastName
        const hasAssignmentRules = result.allTAs.some(
          (ta: any) => ta.assignmentRule
        );
        const needsName =
          result.allTAs.length > 0 &&
          hasAssignmentRules &&
          !result.userInfo.hasLastName;
        setNeedsLastName(needsName);
      } else {
        console.warn("Invalid matched TA result:", result);
        setMatchResult({
          matchedTA: null,
          allTAs: [],
          matchCriteria: {
            hasLastName: false,
            hasStudentId: false,
            matchedBy: null,
          },
          userInfo: {
            hasLastName: false,
            hasStudentId: false,
          },
          taSetupStatus: null,
        });
      }
    } catch (err: any) {
      console.error("Error fetching matched TA:", err);

      // Set a default empty result when there's an error
      setMatchResult({
        matchedTA: null,
        allTAs: [],
        matchCriteria: {
          hasLastName: false,
          hasStudentId: false,
          matchedBy: null,
        },
        userInfo: {
          hasLastName: false,
          hasStudentId: false,
        },
        taSetupStatus: null,
      });

      // Only show error for actual errors, not missing data
      if (err.response?.status === 500 || err.response?.status === 401) {
        if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else if (err.message) {
          setError(err.message);
        } else {
          setError("Failed to fetch matched TA");
        }
      } else if (err.response?.data?.needsProcessing || err.needsProcessing) {
        // If syllabus needs processing, don't treat it as an error
        setError(null);
      } else {
        // For 404s or other cases, just log but don't show error
        console.log("No matched TA data available");
        setError(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [courseInstanceId, courseName, getToken, openTASetupModal]);

  useEffect(() => {
    fetchMatchedTA();
  }, [fetchMatchedTA]);

  return {
    matchResult,
    isLoading,
    error,
    needsLastName,
    refetch: fetchMatchedTA,
  };
}
