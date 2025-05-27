export const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Get Google OAuth URL for authorization
 */
export async function getGoogleAuthUrl(token) {
  const res = await fetch(`${API_URL}/api/google-drive/auth-url`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!res.ok) throw new Error(`Get auth URL error: ${res.status}`);
  return res.json();
}

/**
 * Disconnect Google Drive
 */
export async function disconnectGoogleDrive(token) {
  const res = await fetch(`${API_URL}/api/google-drive/disconnect`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!res.ok) throw new Error(`Disconnect error: ${res.status}`);
  return res.json();
}

/**
 * List files from Google Drive
 */
export async function listGoogleDriveFiles(
  token,
  pageToken = null,
  pageSize = 20
) {
  const params = new URLSearchParams();
  if (pageToken) params.append("pageToken", pageToken);
  params.append("pageSize", pageSize);

  const res = await fetch(`${API_URL}/api/google-drive/files?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!res.ok) throw new Error(`List files error: ${res.status}`);
  return res.json();
}

/**
 * Import file from Google Drive to database
 */
export async function importGoogleDriveFile(token, fileId, courseId = null) {
  const res = await fetch(`${API_URL}/api/google-drive/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    body: JSON.stringify({
      fileId,
      courseId,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Import file error: ${res.status}`);
  }
  return res.json();
}

/**
 * Remove imported file from database or disassociate from a course
 */
export async function removeGoogleDriveFile(token, fileId, courseId = null) {
  let url = `${API_URL}/api/google-drive/files/${fileId}`;
  if (courseId) {
    url += `?courseId=${courseId}`;
  }

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res
      .json()
      .catch(() => ({ message: res.statusText }));
    throw new Error(
      errorData.message || `Remove/Disassociate file error: ${res.status}`
    );
  }
  return res.json();
}

/**
 * Get imported files for user
 */
export async function getImportedFiles(token, courseId = null) {
  const params = new URLSearchParams();
  if (courseId) params.append("courseId", courseId);

  const res = await fetch(`${API_URL}/api/google-drive/imported?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!res.ok) throw new Error(`Get imported files error: ${res.status}`);
  return res.json();
}

/**
 * Get Google Picker configuration
 */
export async function getGooglePickerConfig(token) {
  const res = await fetch(`${API_URL}/api/google-drive/picker-config`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!res.ok) throw new Error(`Get picker config error: ${res.status}`);
  return res.json();
}

/**
 * Import multiple files from Google Drive to database
 */
export async function importGoogleDriveFiles(token, files, courseId = null) {
  const res = await fetch(`${API_URL}/api/google-drive/import-multiple`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    body: JSON.stringify({
      files,
      courseId,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Import files error: ${res.status}`);
  }
  return res.json();
}

/**
 * Associate existing globally imported files with a specific course
 */
export async function associateGoogleDriveFilesToCourse(
  token,
  fileIds,
  courseId
) {
  const res = await fetch(`${API_URL}/api/google-drive/associate-course`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    body: JSON.stringify({
      fileIds,
      courseId,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Associate files error: ${res.status}`);
  }
  return res.json();
}
