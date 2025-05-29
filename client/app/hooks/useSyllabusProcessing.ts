import {
  getSyllabusParsedData,
  getSyllabusProcessingStatus,
  processSyllabus,
  reprocessSyllabus,
} from "@/app/api/courses.api";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";

export interface SyllabusProcessingStatus {
  exists: boolean;
  isProcessed: boolean;
  processingError: string | null;
  hasExtractedContent: boolean;
  hasParsedData: boolean;
  fileName?: string;
  uploadedAt?: string;
}

export interface ParsedSyllabusData {
  gradingBreakdown: Record<string, number>;
  assignmentDates: Array<{
    title: string;
    dueDate: string;
    description: string;
  }>;
  examDates: Array<{
    title: string;
    date: string;
    description: string;
  }>;
  contacts: Array<{
    name: string;
    role: string;
    email: string;
    phone: string;
    officeHours?: string;
    assignmentRule?: string;
  }>;
  confidence?: number;
}

export interface UseSyllabusProcessingReturn {
  processingStatus: SyllabusProcessingStatus | null;
  parsedData: ParsedSyllabusData | null;
  isProcessing: boolean;
  processingError: string | null;
  isLoadingStatus: boolean;
  startProcessing: () => Promise<void>;
  reprocess: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  loadParsedData: () => Promise<void>;
}

interface UseSyllabusProcessingProps {
  courseInstanceId: string;
  isSignedIn: boolean;
  isLoaded: boolean;
  showToast?: (message: string, type: "success" | "error") => void;
}

export const useSyllabusProcessing = ({
  courseInstanceId,
  isSignedIn,
  isLoaded,
  showToast,
}: UseSyllabusProcessingProps): UseSyllabusProcessingReturn => {
  const { getToken } = useAuth();

  const [processingStatus, setProcessingStatus] =
    useState<SyllabusProcessingStatus | null>(null);
  const [parsedData, setParsedData] = useState<ParsedSyllabusData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Fetch processing status
  const refreshStatus = useCallback(async () => {
    if (!courseInstanceId || !isSignedIn || !isLoaded) return;

    setIsLoadingStatus(true);
    try {
      const token = await getToken();
      if (token) {
        const status = await getSyllabusProcessingStatus(
          courseInstanceId,
          token
        );
        setProcessingStatus(status);
        setProcessingError(status.processingError);
      }
    } catch (error: any) {
      console.error("Failed to fetch processing status:", error);
      setProcessingError(error.message || "Failed to fetch processing status");
    } finally {
      setIsLoadingStatus(false);
    }
  }, [courseInstanceId, isSignedIn, isLoaded, getToken]);

  // Load parsed data
  const loadParsedData = useCallback(async () => {
    if (!courseInstanceId || !isSignedIn || !isLoaded) return;

    try {
      const token = await getToken();
      if (token) {
        const data = await getSyllabusParsedData(courseInstanceId, token);
        setParsedData(data.parsedData);
      }
    } catch (error: any) {
      console.error("Failed to load parsed data:", error);
      // Don't show error toast here as this might be called when data doesn't exist yet
    }
  }, [courseInstanceId, isSignedIn, isLoaded, getToken]);

  // Poll for processing completion - moved before other functions that depend on it
  const pollForCompletion = useCallback(() => {
    const pollInterval = setInterval(async () => {
      try {
        const token = await getToken();
        if (token) {
          const status = await getSyllabusProcessingStatus(
            courseInstanceId,
            token
          );
          setProcessingStatus(status);

          if (status.isProcessed) {
            clearInterval(pollInterval);
            setIsProcessing(false);
            showToast?.("Syllabus processing completed!", "success");
            await loadParsedData();
          } else if (status.processingError) {
            clearInterval(pollInterval);
            setIsProcessing(false);
            setProcessingError(status.processingError);
            showToast?.(status.processingError, "error");
          }
        }
      } catch (error: any) {
        console.error("Error polling status:", error);
        clearInterval(pollInterval);
        setIsProcessing(false);
      }
    }, 3000); // Poll every 3 seconds

    // Cleanup after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setIsProcessing(false);
    }, 300000);
  }, [courseInstanceId, getToken, showToast, loadParsedData]);

  // Start processing
  const startProcessing = useCallback(async () => {
    if (!courseInstanceId || !isSignedIn) return;

    setIsProcessing(true);
    setProcessingError(null);

    try {
      const token = await getToken();
      if (token) {
        const result = await processSyllabus(courseInstanceId, token);

        if (result.isProcessed) {
          // Already processed
          showToast?.("Syllabus is already processed!", "success");
          await refreshStatus();
          await loadParsedData();
        } else {
          // Processing started
          showToast?.(
            "Syllabus processing started! This may take a few moments.",
            "success"
          );

          // Poll for completion
          pollForCompletion();
        }
      }
    } catch (error: any) {
      console.error("Failed to start processing:", error);
      setProcessingError(error.message || "Failed to start processing");
      showToast?.(error.message || "Failed to start processing", "error");
    } finally {
      setIsProcessing(false);
    }
  }, [
    courseInstanceId,
    isSignedIn,
    getToken,
    showToast,
    refreshStatus,
    loadParsedData,
    pollForCompletion,
  ]);

  // Reprocess syllabus
  const reprocess = useCallback(async () => {
    if (!courseInstanceId || !isSignedIn) return;

    setIsProcessing(true);
    setProcessingError(null);

    try {
      const token = await getToken();
      if (token) {
        await reprocessSyllabus(courseInstanceId, token);
        showToast?.("Syllabus reprocessing started!", "success");

        // Poll for completion
        pollForCompletion();
      }
    } catch (error: any) {
      console.error("Failed to reprocess:", error);
      setProcessingError(error.message || "Failed to reprocess");
      showToast?.(error.message || "Failed to reprocess", "error");
    } finally {
      setIsProcessing(false);
    }
  }, [courseInstanceId, isSignedIn, getToken, showToast, pollForCompletion]);

  // Initial load
  useEffect(() => {
    if (
      isLoaded &&
      isSignedIn &&
      courseInstanceId &&
      courseInstanceId !== "undefined"
    ) {
      refreshStatus();
    }
  }, [isLoaded, isSignedIn, courseInstanceId, refreshStatus]);

  // Load parsed data when status indicates it's processed
  useEffect(() => {
    if (processingStatus?.isProcessed && processingStatus?.hasParsedData) {
      loadParsedData();
    }
  }, [
    processingStatus?.isProcessed,
    processingStatus?.hasParsedData,
    loadParsedData,
  ]);

  return {
    processingStatus,
    parsedData,
    isProcessing,
    processingError,
    isLoadingStatus,
    startProcessing,
    reprocess,
    refreshStatus,
    loadParsedData,
  };
};
