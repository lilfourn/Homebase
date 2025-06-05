"use client";

import { useCourses } from "@/app/context/CourseContext";
import * as LucideIcons from "lucide-react";
import { Folder, Loader2, X, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { getTodoStatsByUser } from "@/app/api/todos.api";
import { useAuth } from "@clerk/nextjs";

const COURSE_COLORS = [
  { 
    bg: "#3B82F6", 
    light: "#DBEAFE", 
    gradient: "from-blue-600 to-indigo-600",
    activeGradient: "from-blue-400 to-indigo-400",
    borderColor: "border-blue-200",
    bgColor: "bg-blue-50"
  },
  { 
    bg: "#10B981", 
    light: "#D1FAE5",
    gradient: "from-emerald-600 to-teal-600",
    activeGradient: "from-emerald-400 to-teal-400",
    borderColor: "border-emerald-200",
    bgColor: "bg-emerald-50"
  },
  { 
    bg: "#8B5CF6", 
    light: "#EDE9FE",
    gradient: "from-violet-600 to-purple-600",
    activeGradient: "from-violet-400 to-purple-400",
    borderColor: "border-violet-200",
    bgColor: "bg-violet-50"
  },
  { 
    bg: "#EC4899", 
    light: "#FCE7F3",
    gradient: "from-pink-600 to-rose-600",
    activeGradient: "from-pink-400 to-rose-400",
    borderColor: "border-pink-200",
    bgColor: "bg-pink-50"
  },
  { 
    bg: "#F59E0B", 
    light: "#FEF3C7",
    gradient: "from-amber-600 to-orange-600",
    activeGradient: "from-amber-400 to-orange-400",
    borderColor: "border-amber-200",
    bgColor: "bg-amber-50"
  },
  { 
    bg: "#06B6D4", 
    light: "#CFFAFE",
    gradient: "from-cyan-600 to-sky-600",
    activeGradient: "from-cyan-400 to-sky-400",
    borderColor: "border-cyan-200",
    bgColor: "bg-cyan-50"
  }
];

const getCourseColor = (index) => {
  return COURSE_COLORS[index % COURSE_COLORS.length];
};

export default function UserCourseList() {
  const { courses, error, loading, deleteCourse } = useCourses();
  const [isDeleting, setIsDeleting] = useState(false);
  const [hoveredCourse, setHoveredCourse] = useState(null);
  const [todoStats, setTodoStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { getToken } = useAuth();
  const intervalRef = useRef(null);

  // Get custom primary color
  const customPrimaryColor = useMemo(() => {
    if (typeof window !== "undefined") {
      const computedStyle = getComputedStyle(document.documentElement);
      return computedStyle.getPropertyValue("--custom-primary-color")?.trim() || "#6366f1";
    }
    return "#6366f1";
  }, []);

  // Fetch todo stats function
  const fetchTodoStats = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setStatsLoading(true);
      
      const token = await getToken();
      if (!token) return;
      
      const response = await getTodoStatsByUser(token);
      if (response.success) {
        setTodoStats(prevStats => {
          // Only update if data has changed to prevent unnecessary re-renders
          const newStats = response.stats || {};
          const hasChanged = JSON.stringify(prevStats) !== JSON.stringify(newStats);
          return hasChanged ? newStats : prevStats;
        });
      }
    } catch (error) {
      console.error("Error fetching todo stats:", error);
    } finally {
      if (showLoading) setStatsLoading(false);
    }
  }, [getToken]);

  // Initial fetch and set up polling
  useEffect(() => {
    if (courses.length > 0) {
      // Initial fetch
      fetchTodoStats(true);
      
      // Set up polling every 5 seconds
      intervalRef.current = setInterval(() => {
        fetchTodoStats(false); // Don't show loading on subsequent fetches
      }, 5000);
    } else {
      setStatsLoading(false);
    }

    // Cleanup interval on unmount or when courses change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [courses.length, fetchTodoStats]);

  // Listen for todo updates from other parts of the app
  useEffect(() => {
    const handleTodoUpdate = () => {
      fetchTodoStats(false);
    };

    // Listen for custom events that might be dispatched when todos are updated
    window.addEventListener('todoUpdated', handleTodoUpdate);
    window.addEventListener('focus', handleTodoUpdate); // Refresh when window regains focus

    return () => {
      window.removeEventListener('todoUpdated', handleTodoUpdate);
      window.removeEventListener('focus', handleTodoUpdate);
    };
  }, [fetchTodoStats]);

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
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="text-sm text-gray-500">Loading courses...</span>
        </div>
      </div>
    );
  
  if (error) return (
    <div className="text-center py-8">
      <p className="text-sm text-red-500">Error loading courses</p>
      <p className="text-xs text-gray-400 mt-1">{error}</p>
    </div>
  );
  
  if (!courses.length) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Folder className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 font-medium">No courses yet</p>
        <p className="text-xs text-gray-400 mt-1">Add your first course to get started</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="space-y-1.5 w-full">
        {courses.map((c, index) => {
          const Icon =
            c.icon && LucideIcons[c.icon] ? LucideIcons[c.icon] : Folder;
          const color = getCourseColor(index);
          const isHovered = hoveredCourse === c._id;
          
          // Get real todo stats for this course
          const courseStats = todoStats[c.courseInstanceId] || {
            total: 0,
            completed: 0,
            incomplete: 0,
            progress: 0
          };
          
          return (
            <div
              key={c._id}
              className="group relative"
              onMouseEnter={() => setHoveredCourse(c._id)}
              onMouseLeave={() => setHoveredCourse(null)}
            >
              <Link
                href={`/dashboard/course/${c.courseInstanceId}`}
                className="block w-full"
              >
                <div className={`
                  relative overflow-hidden rounded-lg bg-white
                  border transition-all duration-200
                  ${isHovered ? `${color.borderColor} shadow-md` : 'border-gray-150 shadow-sm'}
                `}>
                  {/* Subtle gradient overlay */}
                  <div 
                    className={`absolute inset-0 opacity-0 transition-opacity duration-200 ${isHovered ? 'opacity-100' : ''}`}
                    style={{
                      background: `linear-gradient(135deg, transparent 0%, ${color.light}20 100%)`
                    }}
                  />
                  
                  {/* Main Content - Compact */}
                  <div className="relative px-3 py-2.5 flex items-center gap-2.5">
                    {/* Compact Icon */}
                    <div className={`
                      relative p-2 rounded-lg ${color.bgColor}
                      transition-transform duration-200
                      ${isHovered ? 'scale-105' : 'scale-100'}
                    `}>
                      <Icon
                        className="w-4 h-4"
                        style={{ color: color.bg }}
                      />
                    </div>
                    
                    {/* Course Info - Inline Layout */}
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className={`
                          font-medium text-sm leading-tight
                          transition-colors duration-200
                          ${isHovered ? 'text-gray-900' : 'text-gray-800'}
                        `}>
                          {c.name}
                        </h3>
                        
                        {/* Inline Stats - Only show tasks */}
                        {(courseStats.incomplete > 0 || statsLoading) && (
                          <div className="flex items-center gap-2.5 mt-0.5">
                            {statsLoading ? (
                              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                Loading...
                              </span>
                            ) : (
                              <span className={`text-[11px] text-gray-500 flex items-center gap-1 transition-all duration-300`}>
                                <div className={`w-0.5 h-0.5 rounded-full bg-gray-400 ${!statsLoading ? 'animate-pulse' : ''}`} />
                                {courseStats.incomplete} {courseStats.incomplete === 1 ? 'task' : 'tasks'} left
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Actions - Always visible but subtle */}
                      <div className="flex items-center gap-1 ml-2">
                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(c._id);
                          }}
                          disabled={isDeleting}
                          className={`
                            p-1 rounded
                            text-gray-400 hover:text-red-500 hover:bg-red-50
                            transition-all duration-200
                            disabled:opacity-50
                            ${isHovered ? 'opacity-100' : 'opacity-0'}
                          `}
                          aria-label="Delete course"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </button>
                        
                        {/* Arrow Icon */}
                        <ChevronRight className={`
                          w-3.5 h-3.5 text-gray-400
                          transition-all duration-200
                          ${isHovered ? 'translate-x-0.5 text-gray-500' : ''}
                        `} />
                      </div>
                    </div>
                  </div>
                  
                  {/* Slim Progress Bar - Only show if there are tasks */}
                  {courseStats.total > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100">
                      <div 
                        className={`h-full bg-gradient-to-r ${color.gradient} transition-all duration-300`}
                        style={{ 
                          width: `${courseStats.progress}%`,
                          opacity: isHovered ? 1 : 0.6
                        }}
                      />
                    </div>
                  )}
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
