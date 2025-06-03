"use client";

import { useCourses } from "@/app/context/CourseContext";
import * as LucideIcons from "lucide-react";
import { Folder, Loader2, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

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
  const router = useRouter();
  const pathname = usePathname();

  const handleDelete = async (id) => {
    try {
      setIsDeleting(true);
      // If the user is currently viewing the deleted course, redirect to /dashboard immediately
      if (
        pathname &&
        pathname.includes("/dashboard/course/") &&
        pathname.endsWith(id)
      ) {
        router.push("/dashboard");
      }
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
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  if (error) return <p className="text-sm text-red-500 px-2">Error: {error}</p>;
  if (!courses.length) {
    return <p className="text-sm text-gray-400 text-center py-4">No courses yet</p>;
  }

  return (
    <div className="w-full">
      <ul className="space-y-2 w-full">
        {courses.map((c, index) => {
          const Icon =
            c.icon && LucideIcons[c.icon] ? LucideIcons[c.icon] : Folder;
          return (
            <li
              key={c._id}
              className={`group flex justify-between items-center bg-gray-50 hover:bg-gray-100 rounded-xl text-sm transition-all duration-200 w-full`}
            >
              <Link
                href={`/dashboard/course/${c.courseInstanceId}`}
                className={`flex-grow py-3 px-4 overflow-hidden transition-all duration-200 whitespace-nowrap cursor-pointer opacity-100 flex items-center gap-3`}
              >
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                  <Icon
                    className={`w-4 h-4`}
                    style={{ color: "var(--custom-primary-color, inherit)" }}
                  />
                </div>
                <span className="font-medium text-gray-700 group-hover:text-gray-900">{c.name}</span>
              </Link>
              <button
                onClick={() => handleDelete(c._id)}
                disabled={isDeleting}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-2 mr-2 rounded-lg hover:bg-red-50 transition-all duration-200 cursor-pointer disabled:opacity-50 flex-shrink-0"
                aria-label="Delete course"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
