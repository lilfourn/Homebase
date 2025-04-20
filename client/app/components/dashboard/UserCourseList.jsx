"use client"

import { useState } from "react";
import { useCourses } from "@/app/context/CourseContext";

export default function UserCourseList() {
  const { courses, error, loading, deleteCourse } = useCourses();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (id) => {
    try {
      setIsDeleting(true);
      await deleteCourse(id);
      // The course list will automatically update via context
    } catch (err) {
      console.error("Error deleting course:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <p>Loading courses...</p>;
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
