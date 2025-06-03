"use client";
import { useUserSchool } from "@/hooks/useUserSchool";

export default function Dashboard() {
  const { schoolName, isLoading, hasSchool } = useUserSchool();

  return (
    <main className="p-8 min-h-screen bg-gray-50">
      {/* Header Section with modern minimalist design */}
      <div className="mb-12">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-[var(--custom-primary-color,#3B82F6)] rounded-2xl flex items-center justify-center mr-4 shadow-lg shadow-[var(--custom-primary-color,#3B82F6)]/20">
            <span className="text-white font-bold text-xl">🎓</span>
          </div>
          <h1 className="text-4xl font-light text-gray-900">
            Welcome to <span className="font-medium">{isLoading ? "Your Dashboard" : schoolName}</span>
          </h1>
        </div>
        <p className="text-lg text-gray-500 ml-16 max-w-2xl">
          {hasSchool
            ? `Your personalized academic hub for ${schoolName}`
            : "Complete your profile to get started with your personalized academic experience"}
        </p>
      </div>

      {/* Cards Grid with clean, modern design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quick Start Card */}
        <div className="group bg-white rounded-2xl p-8 hover:shadow-lg transition-all duration-300 border border-gray-100">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mr-4">
              <span className="text-2xl">📚</span>
            </div>
            <h2 className="text-xl font-medium text-gray-900">Quick Start</h2>
          </div>
          <ul className="space-y-3 text-gray-600">
            <li className="flex items-start">
              <div className="w-1 h-1 bg-[var(--custom-primary-color,#3B82F6)] rounded-full mr-3 mt-2 flex-shrink-0"></div>
              <span className="text-sm">Add your courses from the sidebar</span>
            </li>
            <li className="flex items-start">
              <div className="w-1 h-1 bg-[var(--custom-primary-color,#3B82F6)] rounded-full mr-3 mt-2 flex-shrink-0"></div>
              <span className="text-sm">Upload study materials</span>
            </li>
            <li className="flex items-start">
              <div className="w-1 h-1 bg-[var(--custom-primary-color,#3B82F6)] rounded-full mr-3 mt-2 flex-shrink-0"></div>
              <span className="text-sm">Connect with classmates</span>
            </li>
          </ul>
        </div>

        {/* Academic Progress Card */}
        <div className="group bg-white rounded-2xl p-8 hover:shadow-lg transition-all duration-300 border border-gray-100">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mr-4">
              <span className="text-2xl">📈</span>
            </div>
            <h2 className="text-xl font-medium text-gray-900">
              Academic Progress
            </h2>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Track your study progress, upcoming deadlines, and academic
            milestones.
          </p>
          <div className="mt-auto pt-6 border-t border-gray-50">
            <p className="text-sm text-gray-400">No courses added yet</p>
          </div>
        </div>

        {/* Study Groups Card */}
        <div className="group bg-white rounded-2xl p-8 hover:shadow-lg transition-all duration-300 border border-gray-100">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mr-4">
              <span className="text-2xl">🤝</span>
            </div>
            <h2 className="text-xl font-medium text-gray-900">
              Study Groups
            </h2>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Join study groups, collaborate on projects, and share knowledge with
            peers.
          </p>
          <div className="mt-auto pt-6 border-t border-gray-50">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              Coming soon
            </span>
          </div>
        </div>
      </div>

      {/* Profile Completion Alert with clean design */}
      {!hasSchool && !isLoading && (
        <div className="mt-12 bg-white border border-gray-200 rounded-2xl p-8">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-[var(--custom-primary-color,#3B82F6)] bg-opacity-10 rounded-xl flex items-center justify-center">
                <span className="text-[var(--custom-primary-color,#3B82F6)] font-bold text-lg">!</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Complete Your Profile
              </h3>
              <p className="text-gray-600 text-sm">
                Add your school information to unlock personalized features and
                connect with your academic community.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
