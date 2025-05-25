"use client";
import { UserProfile } from "@clerk/nextjs";

export default function Profile() {
  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Your Profile</h1>

        <div>
          <UserProfile routing="hash" />
        </div>
      </div>
    </main>
  );
}
