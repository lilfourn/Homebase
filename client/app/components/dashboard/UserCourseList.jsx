"use client"

import { useState } from "react";
import { useCourses } from "@/app/context/CourseContext";
import { X, Loader2 } from "lucide-react";
import { useContext } from "react";
import { SidebarContext } from "@/app/components/ui/sidebar";

export default function UserCourseList() {
  const { courses, error, loading, deleteCourse } = useCourses();
  const [isDeleting, setIsDeleting] = useState(false);
  const { expanded } = useContext(SidebarContext);

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

  if (loading) return <p className="text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Loading...</p>;
  if (error) return <p className="text-sm text-red-500">Error: {error}</p>;
  if (!courses.length) return <p className="text-sm text-gray-500">No courses yet.</p>;

  return (
    <div className="w-full">
      <ul className="space-y-2 w-full">
        {courses.map(c => (
          <li key={c._id} className={`flex cursor-pointer justify-between items-center p-2 bg-white hover:bg-gray-50 rounded-md text-sm transition-colors shadow-sm w-full ${expanded ? '' : 'justify-center'}`}>
            <span className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${expanded ? 'opacity-100' : 'w-0 opacity-0'}`}>
              {c.name}
            </span>
            <button 
              onClick={() => handleDelete(c._id)}
              disabled={isDeleting}
              className="text-red-500 hover:text-red-600 p-1 rounded-full hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
              aria-label="Delete course"
            >
              {isDeleting ? 
                <Loader2 className="h-4 w-4 animate-spin" /> : 
                <X className="h-4 w-4" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
