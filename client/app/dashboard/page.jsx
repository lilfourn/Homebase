"use client";
import { useUserSchool } from "@/hooks/useUserSchool";

export default function Dashboard() {
  const { schoolName, isLoading, hasSchool } = useUserSchool();

  return (
    <main className="p-6">
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
            <span className="text-white font-bold text-lg">🎓</span>
          </div>
          <h1 className="text-3xl font-bold">
            Welcome to {isLoading ? "Your Dashboard" : schoolName}
          </h1>
        </div>
        <p className="text-lg text-gray-600 ml-13">
          {hasSchool
            ? `Your personalized academic hub for ${schoolName}`
            : "Complete your profile to get started with your personalized academic experience"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-blue-600 font-bold text-lg">📚</span>
            </div>
            <h2 className="text-xl font-semibold text-blue-600">Quick Start</h2>
          </div>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
              Add your courses from the sidebar
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
              Upload study materials
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
              Connect with classmates
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-green-600 font-bold text-lg">📈</span>
            </div>
            <h2 className="text-xl font-semibold text-green-600">
              Academic Progress
            </h2>
          </div>
          <p className="text-gray-600">
            Track your study progress, upcoming deadlines, and academic
            milestones.
          </p>
          <div className="mt-4 text-sm text-gray-500">No courses added yet</div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-purple-600 font-bold text-lg">🤝</span>
            </div>
            <h2 className="text-xl font-semibold text-purple-600">
              Study Groups
            </h2>
          </div>
          <p className="text-gray-600">
            Join study groups, collaborate on projects, and share knowledge with
            peers.
          </p>
          <div className="mt-4 text-sm text-gray-500">Coming soon</div>
        </div>
      </div>

      {!hasSchool && !isLoading && (
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-yellow-800 font-bold">!</span>
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-yellow-800">
                Complete Your Profile
              </h3>
              <p className="mt-1 text-yellow-700">
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
