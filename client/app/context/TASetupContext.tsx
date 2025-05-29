"use client";

import { updateTASetupStatus } from "@/app/api/courses.api";
import { useAuth } from "@clerk/nextjs";
import React, { createContext, useCallback, useContext, useState } from "react";

interface TASetupContextType {
  showTASetupModal: boolean;
  courseIdForSetup: string | null;
  courseNameForSetup: string | null;
  openTASetupModal: (courseId: string, courseName?: string) => void;
  closeTASetupModal: () => void;
  skipTASetup: (courseId: string) => void;
  markAsNoTA: (courseId: string) => void;
}

const TASetupContext = createContext<TASetupContextType | undefined>(undefined);

export function TASetupProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const [showTASetupModal, setShowTASetupModal] = useState(false);
  const [courseIdForSetup, setCourseIdForSetup] = useState<string | null>(null);
  const [courseNameForSetup, setCourseNameForSetup] = useState<string | null>(
    null
  );

  const openTASetupModal = useCallback(
    (courseId: string, courseName?: string) => {
      setCourseIdForSetup(courseId);
      setCourseNameForSetup(courseName || null);
      setShowTASetupModal(true);
    },
    []
  );

  const closeTASetupModal = useCallback(() => {
    setShowTASetupModal(false);
    setCourseIdForSetup(null);
    setCourseNameForSetup(null);
  }, []);

  const skipTASetup = useCallback(
    async (courseId: string) => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No authentication token");

        await updateTASetupStatus(courseId, "skipped", token);
        closeTASetupModal();
      } catch (error) {
        console.error("Error skipping TA setup:", error);
      }
    },
    [closeTASetupModal, getToken]
  );

  const markAsNoTA = useCallback(
    async (courseId: string) => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No authentication token");

        await updateTASetupStatus(courseId, "no_ta", token);
        closeTASetupModal();
      } catch (error) {
        console.error("Error marking as no TA:", error);
      }
    },
    [closeTASetupModal, getToken]
  );

  return (
    <TASetupContext.Provider
      value={{
        showTASetupModal,
        courseIdForSetup,
        courseNameForSetup,
        openTASetupModal,
        closeTASetupModal,
        skipTASetup,
        markAsNoTA,
      }}
    >
      {children}
    </TASetupContext.Provider>
  );
}

export function useTASetup() {
  const context = useContext(TASetupContext);
  if (!context) {
    throw new Error("useTASetup must be used within a TASetupProvider");
  }
  return context;
}
