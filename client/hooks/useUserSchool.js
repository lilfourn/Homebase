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
  const [schoolData, setSchoolData] = useState({
    name: "Your College",
    logo: "",
    colors: { primary: "", secondary: "" },
    customPrimaryColor: "",
    customSecondaryColor: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSchoolData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      setSchoolData({
        name: "Your College",
        logo: "",
        colors: { primary: "", secondary: "" },
        customPrimaryColor: "",
        customSecondaryColor: "",
      });
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      // fetchUserSchool should be modified to return the full user object or relevant school fields
      const userData = await fetchUserSchool(user.id);
      if (userData && typeof userData === "object" && userData.school) {
        setSchoolData({
          name: userData.school || "Your College",
          logo: userData.schoolLogo || "",
          colors: userData.schoolColors || { primary: "", secondary: "" },
          customPrimaryColor: userData.customPrimaryColor || "",
          customSecondaryColor: userData.customSecondaryColor || "",
        });
      } else if (typeof userData === "string") {
        // Handle legacy case where only school name string is returned
        setSchoolData({
          name: userData || "Your College",
          logo: "",
          colors: { primary: "", secondary: "" },
          customPrimaryColor: "",
          customSecondaryColor: "",
        });
      } else {
        setSchoolData({
          name: "Your College",
          logo: "",
          colors: { primary: "", secondary: "" },
          customPrimaryColor: "",
          customSecondaryColor: "",
        });
      }
    } catch (err) {
      console.error("Failed to load school data:", err);
      setError(err.message);
      setSchoolData({
        name: "Your College",
        logo: "",
        colors: { primary: "", secondary: "" },
        customPrimaryColor: "",
        customSecondaryColor: "",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSchoolData();
  }, [loadSchoolData, updateCount]);

  const refreshSchoolData = () => {
    loadSchoolData();
  };

  return {
    schoolName: schoolData.name,
    sidebarSchoolName: formatSchoolName(schoolData.name), // Kept for potential specific uses
    schoolLogo: schoolData.logo,
    schoolColors: schoolData.colors,
    customPrimaryColor: schoolData.customPrimaryColor,
    customSecondaryColor: schoolData.customSecondaryColor,
    isLoading,
    error,
    refreshSchoolName: refreshSchoolData,
    hasSchool: schoolData.name !== "Your College" && schoolData.name !== "",
  };
}
