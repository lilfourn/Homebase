import { TabNavigationProps } from "@/app/types/course.types";
import { CheckSquare, Library, ListChecks } from "lucide-react";

export const TabNavigation = ({
  activeTab,
  setActiveTab,
}: TabNavigationProps) => {
  return (
    <div className="border-b border-gray-100">
      <nav
        className="flex space-x-8 px-8"
        aria-label="Tabs"
      >
        <button
          onClick={() => setActiveTab("overview")}
          className={`whitespace-nowrap py-4 border-b-2 font-medium text-sm cursor-pointer transition-all duration-200 ${
            activeTab === "overview"
              ? "border-[var(--custom-primary-color)] text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <ListChecks className="inline-block h-4 w-4 mr-2" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          className={`whitespace-nowrap py-4 border-b-2 font-medium text-sm cursor-pointer transition-all duration-200 ${
            activeTab === "tasks"
              ? "border-[var(--custom-primary-color)] text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <CheckSquare className="inline-block h-4 w-4 mr-2" />
          Tasks
        </button>
        <button
          onClick={() => setActiveTab("library")}
          className={`whitespace-nowrap py-4 border-b-2 font-medium text-sm cursor-pointer transition-all duration-200 ${
            activeTab === "library"
              ? "border-[var(--custom-primary-color)] text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Library className="inline-block h-4 w-4 mr-2" />
          Library
        </button>
      </nav>
    </div>
  );
};
