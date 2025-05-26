"use client";
import { UserProfile } from "@clerk/nextjs";

export default function Profile() {
  return (
    <main className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Your Profile</h1>
        </div>

        <div className="bg-white p-1 rounded-lg shadow-md">
          <UserProfile
            routing="hash"
            appearance={{ elements: { card: "shadow-none" } }}
          />
        </div>
      </div>
    </main>
  );
}
