"use client";
import { useUserSchool } from "@/hooks/useUserSchool";
import { useUser } from "@clerk/nextjs";

export default function Profile() {
  const { user } = useUser();
  const { schoolName, isLoading, hasSchool } = useUserSchool();

  return (
    <main className="p-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">Your Profile</h1>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <p className="text-gray-900">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <p className="text-gray-900">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Academic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                School
              </label>
              {isLoading ? (
                <p className="text-gray-500">Loading...</p>
              ) : hasSchool ? (
                <p className="text-gray-900">{schoolName}</p>
              ) : (
                <div className="flex items-center space-x-2">
                  <p className="text-gray-500">No school selected</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Incomplete
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
