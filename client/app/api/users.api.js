export const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function syncUserData(userId, school = null) {
  const res = await fetch(`${API_URL}/api/users/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      userId,
      ...(school && { school }),
    }),
  });

  if (!res.ok) throw new Error(`Sync error: ${res.status}`);
  return res.json();
}

export async function fetchUserByClerkId(userId) {
  const res = await fetch(`${API_URL}/api/users/${userId}`, {
    credentials: "include",
  });

  if (!res.ok) throw new Error(`Fetch user error: ${res.status}`);
  return res.json();
}

export async function updateUserSchool(userId, school) {
  const res = await fetch(`${API_URL}/api/users/school`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      userId,
      school,
    }),
  });

  if (!res.ok) throw new Error(`Update school error: ${res.status}`);
  return res.json();
}

export async function fetchAllUsers() {
  const res = await fetch(`${API_URL}/api/users`, {
    credentials: "include",
  });

  if (!res.ok) throw new Error(`Fetch users error: ${res.status}`);
  return res.json();
}

export async function manualSyncUser(userId) {
  const res = await fetch(`${API_URL}/api/users/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      userId,
    }),
  });

  if (!res.ok) throw new Error(`Manual sync error: ${res.status}`);
  return res.json();
}
