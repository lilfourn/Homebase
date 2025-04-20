"use client"

import { useState, useEffect } from "react";
import { deleteCourse } from "../../api/courses.api";

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function UserCourseList() {
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUserCourses = () => {
    fetch(`${API_URL}/api/courses/mine`, { credentials: "include" })
      .then(res => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then(data => setCourses(data))
      .catch(err => setError(err.message));
  };

  useEffect(() => {
    console.log("👉 Fetching from", API_URL);
    fetchUserCourses();
  }, []);

  const handleDelete = async (id) => {
    try {
      setIsDeleting(true);
      await deleteCourse(id);
      // Refresh the course list after deletion
      fetchUserCourses();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) return <p>Error: {error}</p>;
  if (!courses.length) return <p>No courses yet.</p>;

  return (
    <ul className="space-y-3">
      {courses.map(c => (
        <li key={c._id} className="flex justify-between items-center p-3 border rounded-md">
          <span>{c.name} ({c.code})</span>
          <button 
            onClick={() => handleDelete(c._id)}
            disabled={isDeleting}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </li>
      ))}
    </ul>
  );
}
