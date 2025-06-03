"use client";

import { Bot, Info } from "lucide-react";
import AgentsPage from "@/app/components/agents/AgentsPage";

export default function AgentsPageWrapper() {
  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      <div className="h-full mx-auto p-4 flex flex-col">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col">
          {/* Header Section */}
          <div className="bg-[var(--custom-primary-color)] relative">
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 opacity-5">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="white" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dots)" />
              </svg>
            </div>
            
            {/* Content */}
            <div className="relative px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Bot className="h-6 w-6 text-[var(--custom-primary-color)]" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-medium text-white">AI Agents</h1>
                    <p className="text-white text-opacity-70 text-sm">Transform your study materials instantly</p>
                  </div>
                </div>
                
                {/* Info button */}
                <div className="hidden md:flex items-center">
                  <button className="w-10 h-10 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md">
                    <Info className="h-5 w-5 text-[var(--custom-primary-color)]" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden">
            <AgentsPage />
          </div>
        </div>
      </div>
    </div>
  );
}