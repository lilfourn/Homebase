import { getSyllabusStatus } from "@/app/api/courses.api";
import { uploadSyllabusFile } from "@/app/api/googleDrive.api";
import {
  SyllabusData,
  UseSyllabusManagementReturn,
  UseToastReturn,
} from "@/app/types/course.types";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

interface UseSyllabusManagementProps {
  courseInstanceId: string;
  isSignedIn: boolean;
  isLoaded: boolean;
  showToast: UseToastReturn["showToast"];
}

export const useSyllabusManagement = ({
  courseInstanceId,
  isSignedIn,
  isLoaded,
  showToast,
}: UseSyllabusManagementProps): UseSyllabusManagementReturn => {
  const { getToken } = useAuth();

  const [hasSyllabus, setHasSyllabus] = useState<boolean | null>(null);
  const [syllabusData, setSyllabusData] = useState<SyllabusData | null>(null);
  const [syllabusStatusLoading, setSyllabusStatusLoading] = useState(true);
  const [showSyllabusModal, setShowSyllabusModal] = useState(false);

  // Fetch syllabus status
  useEffect(() => {
    const fetchStatus = async () => {
      if (courseInstanceId && isSignedIn) {
        setSyllabusStatusLoading(true);
        try {
          const token = await getToken();
          if (token) {
            const syllabusStatusResponse = await getSyllabusStatus(
              courseInstanceId,
              token
            );
            setHasSyllabus(syllabusStatusResponse.hasSyllabus);
            setSyllabusData(syllabusStatusResponse.syllabus);

            if (!syllabusStatusResponse.hasSyllabus) {
              setShowSyllabusModal(true); // Show modal if no syllabus
            }
          }
        } catch (err) {
          console.error("Failed to fetch syllabus status:", err);
        } finally {
          setSyllabusStatusLoading(false);
        }
      }
    };

    if (
      isLoaded &&
      isSignedIn &&
      courseInstanceId &&
      courseInstanceId !== "undefined"
    ) {
      fetchStatus();
    }
  }, [courseInstanceId, getToken, isSignedIn, isLoaded]);

  // Handle selected syllabus file
  const handleSyllabusFileSelected = async (docs: any) => {
    try {
      const token = await getToken();
      const result = await uploadSyllabusFile(token, docs, courseInstanceId);

      setHasSyllabus(true);
      setSyllabusData(result.syllabus); // Update local syllabus data
      setShowSyllabusModal(false);
      showToast(result.message || "Syllabus uploaded successfully!", "success");
    } catch (err: any) {
      console.error("Failed to upload syllabus:", err);
      showToast(err.message || "Could not upload syllabus.", "error");
    }
  };

  return {
    hasSyllabus,
    syllabusData,
    syllabusStatusLoading,
    showSyllabusModal,
    setShowSyllabusModal,
    handleSyllabusFileSelected,
  };
};
