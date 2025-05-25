import { fetchUserSchool, formatSchoolName } from "@/lib/userSchoolHelper";
import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";

// Safely import context with fallback
let useSchoolUpdate;
try {
  const context = require("@/app/context/SchoolUpdateContext");
  useSchoolUpdate = context.useSchoolUpdate;
} catch {
  useSchoolUpdate = () => ({ updateCount: 0 });
}

export function useUserSchool() {
  const { user } = useUser();
  const { updateCount } = useSchoolUpdate();
  const [schoolName, setSchoolName] = useState("Your College");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSchoolName = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const school = await fetchUserSchool(user.id);
      const formattedName = formatSchoolName(school);
      setSchoolName(formattedName);
    } catch (err) {
      console.error("Failed to load school name:", err);
      setError(err.message);
      setSchoolName("Your College");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSchoolName();
  }, [loadSchoolName, updateCount]);

  const refreshSchoolName = () => {
    loadSchoolName();
  };

  return {
    schoolName,
    isLoading,
    error,
    refreshSchoolName,
    hasSchool: schoolName !== "Your College",
  };
}
