"use client";

import { SidebarContext } from "@/app/components/ui/sidebar";
import { useCourses } from "@/app/context/CourseContext";
import * as LucideIcons from "lucide-react";
import { Folder, Loader2, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
        {courses.map((c, index) => {
          const Icon =
            c.icon && LucideIcons[c.icon] ? LucideIcons[c.icon] : Folder;
          return (
            <Link
              key={c._id}
              href={`/dashboard/course/${c.courseInstanceId}`}
              className="flex items-center justify-center cursor-pointer"
              title={`${c.name} (${c.code})`}
            >
              <Icon
                className={`w-3 h-3 flex-shrink-0`}
                style={{ color: "var(--custom-primary-color, inherit)" }}
              />
            </Link>
          );
        })}
      </div>
    );
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
              className={`flex justify-between items-center bg-white hover:bg-gray-50 rounded-md text-sm transition-colors shadow-sm w-full`}
            >
              <Link
                href={`/dashboard/course/${c.courseInstanceId}`}
                className={`flex-grow p-2 overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap cursor-pointer opacity-100 flex items-center gap-2`}
              >
                <Icon
                  className={`w-4 h-4`}
                  style={{ color: "var(--custom-primary-color, inherit)" }}
                />
                <span>{c.name}</span>
              </Link>
              <button
                onClick={() => handleDelete(c._id)}
                disabled={isDeleting}
                className="text-red-500 hover:text-red-600 p-1 mr-2 rounded-full hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
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
