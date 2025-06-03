"use client";

import { Bot } from "lucide-react";
import AgentsPage from "@/app/components/agents/AgentsPage";

export default function AgentsPageWrapper() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[var(--custom-primary-color)] to-[var(--custom-secondary-color)] text-white p-6 sm:p-8">
          <div className="flex items-center space-x-4">
            <Bot className="h-10 w-10" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">AI Agents</h1>
              <p className="text-sm sm:text-base opacity-90 mt-1">
                Automate your academic tasks with AI-powered agents
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-6 sm:p-8">
          <AgentsPage />
        </div>
      </div>
    </div>
  );
}