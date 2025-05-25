import { fetchUserByClerkId } from "@/app/api/users.api";

export async function fetchUserSchool(userId) {
  try {
    if (!userId) {
      return null;
    }

    const userData = await fetchUserByClerkId(userId);
    return userData?.school || null;
  } catch (error) {
    console.error("Error fetching user school:", error);
    return null;
  }
}

export function formatSchoolName(schoolName) {
  if (!schoolName) {
    return "Your College";
  }

  // Truncate if too long for sidebar display
  const maxLength = 20;
  if (schoolName.length > maxLength) {
    return `${schoolName.substring(0, maxLength)}...`;
  }

  return schoolName;
}
