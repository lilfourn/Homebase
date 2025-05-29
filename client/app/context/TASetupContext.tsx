"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface TASetupContextType {
  showTASetupModal: boolean;
  courseIdForSetup: string | null;
  courseNameForSetup: string | null;
  openTASetupModal: (courseId: string, courseName?: string) => void;
  closeTASetupModal: () => void;
  skipTASetup: (courseId: string) => void;
  markAsNoTA: (courseId: string) => void;
  isSkipped: (courseId: string) => boolean;
  isMarkedNoTA: (courseId: string) => boolean;
}

const TASetupContext = createContext<TASetupContextType | undefined>(undefined);

export function TASetupProvider({ children }: { children: React.ReactNode }) {
  const [showTASetupModal, setShowTASetupModal] = useState(false);
  const [courseIdForSetup, setCourseIdForSetup] = useState<string | null>(null);
  const [courseNameForSetup, setCourseNameForSetup] = useState<string | null>(null);
  const [skippedCourses, setSkippedCourses] = useState<Set<string>>(new Set());
  const [noTACourses, setNoTACourses] = useState<Set<string>>(new Set());

  const openTASetupModal = useCallback((courseId: string, courseName?: string) => {
    // Don't show modal if already skipped or marked as no TA
    if (skippedCourses.has(courseId) || noTACourses.has(courseId)) {
      return;
    }
    setCourseIdForSetup(courseId);
    setCourseNameForSetup(courseName || null);
    setShowTASetupModal(true);
  }, [skippedCourses, noTACourses]);

  const closeTASetupModal = useCallback(() => {
    setShowTASetupModal(false);
    setCourseIdForSetup(null);
    setCourseNameForSetup(null);
  }, []);

  const skipTASetup = useCallback((courseId: string) => {
    setSkippedCourses((prev) => new Set(prev).add(courseId));
    closeTASetupModal();
  }, [closeTASetupModal]);

  const markAsNoTA = useCallback((courseId: string) => {
    setNoTACourses((prev) => new Set(prev).add(courseId));
    closeTASetupModal();
  }, [closeTASetupModal]);

  const isSkipped = useCallback((courseId: string) => {
    return skippedCourses.has(courseId);
  }, [skippedCourses]);

  const isMarkedNoTA = useCallback((courseId: string) => {
    return noTACourses.has(courseId);
  }, [noTACourses]);

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
        isSkipped,
        isMarkedNoTA,
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