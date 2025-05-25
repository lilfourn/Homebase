import { useUser } from "@clerk/nextjs";

export function useUserSync() {
  const { user, isLoaded } = useUser();

  // Simple hook that just returns user data
  // Sync is now triggered by specific user actions (like school selection)
  // instead of automatic syncing

  return { user, isLoaded };
}
