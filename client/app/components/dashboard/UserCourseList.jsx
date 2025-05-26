"use client";

import { SidebarContext } from "@/app/components/ui/sidebar";
import { useCourses } from "@/app/context/CourseContext";
import { Folder, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useContext, useState } from "react";

const COURSE_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-red-500",
  "bg-yellow-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-rose-500",
];

const getCourseColor = (index) => {
  return COURSE_COLORS[index % COURSE_COLORS.length];
};

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

  if (loading)
    return (
      <p className="text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Loading...
      </p>
    );
  if (error) return <p className="text-sm text-red-500">Error: {error}</p>;
  if (!courses.length) {
    if (!expanded) {
      return (
        <div className="flex justify-center">
          <p className="text-xs text-gray-400">0</p>
        </div>
      );
    }
    return <p className="text-sm text-gray-500">No courses yet.</p>;
  }

  if (!expanded) {
    return (
      <div className="flex flex-wrap gap-1.5 justify-center max-w-12">
        {courses.map((c, index) => (
          <Link
            key={c._id}
            href={`/dashboard/course/${c.courseInstanceId}`}
            legacyBehavior
            passHref
          >
            <a
              className="flex items-center justify-center cursor-pointer"
              title={`${c.name} (${c.code})`}
            >
              <Folder
                className={`w-3 h-3 ${getCourseColor(index).replace(
                  "bg-",
                  "text-"
                )} flex-shrink-0`}
              />
            </a>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full">
      <ul className="space-y-2 w-full">
        {courses.map((c) => (
          <li
            key={c._id}
            className={`flex justify-between items-center p-2 bg-white hover:bg-gray-50 rounded-md text-sm transition-colors shadow-sm w-full ${
              expanded ? "" : "justify-center"
            }`}
          >
            <Link
              href={`/dashboard/course/${c.courseInstanceId}`}
              legacyBehavior
              passHref
            >
              <a
                className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap cursor-pointer hover:underline ${
                  expanded ? "opacity-100" : "w-0 opacity-0"
                }`}
              >
                {c.name}
              </a>
            </Link>
            <button
              onClick={() => handleDelete(c._id)}
              disabled={isDeleting}
              className="text-red-500 hover:text-red-600 p-1 rounded-full hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
              aria-label="Delete course"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
