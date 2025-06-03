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

export async function updateUserNameInfo(userId, nameData) {
  const res = await fetch(`${API_URL}/api/users/name-info`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      userId,
      ...nameData,
    }),
  });

  if (!res.ok) throw new Error(`Update name info error: ${res.status}`);
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

export async function updateUserSchoolAndColors(userId, schoolName) {
  const res = await fetch(`${API_URL}/api/users/school-colors`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      userId,
      schoolName,
    }),
  });

  if (!res.ok) throw new Error(`Update school and colors error: ${res.status}`);
  return res.json();
}

export async function updateUserCustomThemeColors(
  userId,
  primaryColor,
  secondaryColor,
  schoolLogoFile
) {
  let headers = {};
  let body;

  if (schoolLogoFile instanceof File) {
    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("primaryColor", primaryColor);
    formData.append("secondaryColor", secondaryColor);
    formData.append("schoolLogo", schoolLogoFile, schoolLogoFile.name);
    body = formData;
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({
      userId,
      primaryColor,
      secondaryColor,
    });
  }

  const res = await fetch(`${API_URL}/api/users/custom-colors`, {
    method: "PUT",
    headers: headers,
    credentials: "include",
    body: body,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(
      `Update custom theme colors error: ${res.statusText} (${res.status}). Server said: ${errorBody}`
    );
  }
  return res.json();
}

export async function fetchUserAgentStats(userId) {
  const res = await fetch(`${API_URL}/api/users/${userId}/agent-stats`, {
    credentials: "include",
  });

  if (!res.ok) throw new Error(`Fetch agent stats error: ${res.status}`);
  return res.json();
}
