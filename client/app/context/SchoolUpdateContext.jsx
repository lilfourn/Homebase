"use client";
import React, { createContext, useContext, useState } from "react";

const SchoolUpdateContext = createContext();

export function useSchoolUpdate() {
  const context = useContext(SchoolUpdateContext);
  if (!context) {
    throw new Error(
      "useSchoolUpdate must be used within a SchoolUpdateProvider"
    );
  }
  return context;
}

export function SchoolUpdateProvider({ children }) {
  const [updateCount, setUpdateCount] = useState(0);

  const triggerSchoolUpdate = () => {
    setUpdateCount((prev) => prev + 1);
  };

  return (
    <SchoolUpdateContext.Provider value={{ updateCount, triggerSchoolUpdate }}>
      {children}
    </SchoolUpdateContext.Provider>
  );
}
