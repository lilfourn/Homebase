export const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function fetchCourses() {
  const res = await fetch(`${API_URL}/api/courses`)
  if (!res.ok) throw new Error(`Fetch error: ${res.status}`)
  return res.json()
}
