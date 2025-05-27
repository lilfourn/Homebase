"use client";

import { createContext, useCallback, useContext, useState } from "react";

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [changes, setChanges] = useState({
    university: null,
    customPrimary: null,
    customSecondary: null,
    schoolLogo: null,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updateChange = useCallback((key, value, hasChanged = true) => {
    setChanges((prev) => {
      const newChanges = {
        ...prev,
        [key]: hasChanged ? value : null,
      };

      // Check if any changes exist
      const anyChanges = Object.values(newChanges).some(
        (change) => change !== null
      );
      setHasChanges(anyChanges);

      return newChanges;
    });
  }, []);

  const clearChanges = useCallback(() => {
    setChanges({
      university: null,
      customPrimary: null,
      customSecondary: null,
      schoolLogo: null,
    });
    setHasChanges(false);
  }, []);

  const setSaving = useCallback((saving) => {
    setIsSaving(saving);
  }, []);

  const value = {
    changes,
    hasChanges,
    isSaving,
    updateChange,
    clearChanges,
    setSaving,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
