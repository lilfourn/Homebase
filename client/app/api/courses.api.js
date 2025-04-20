export const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function fetchCourses() {
  const res = await fetch(`${API_URL}/api/courses`)
  if (!res.ok) throw new Error(`Fetch error: ${res.status}`)
  return res.json()
}

export async function deleteCourse(id) {
  const res = await fetch(`${API_URL}/api/courses/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  if (!res.ok) throw new Error(`Delete error: ${res.status}`)
  return res.json()
}
