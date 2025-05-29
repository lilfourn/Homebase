import { TabNavigationProps } from "@/app/types/course.types";
import { CheckSquare, Library, ListChecks } from "lucide-react";

export const TabNavigation = ({
  activeTab,
  setActiveTab,
}: TabNavigationProps) => {
  return (
    <div className="border-b border-gray-200">
      <nav
        className="-mb-px flex space-x-1 px-4 sm:px-6 lg:px-8"
        aria-label="Tabs"
      >
        <button
          onClick={() => setActiveTab("overview")}
          className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm cursor-pointer ${
            activeTab === "overview"
              ? "border-[var(--custom-primary-color)] text-[var(--custom-primary-color)]"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <ListChecks className="inline-block h-5 w-5 mr-2" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm cursor-pointer ${
            activeTab === "tasks"
              ? "border-[var(--custom-primary-color)] text-[var(--custom-primary-color)]"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <CheckSquare className="inline-block h-5 w-5 mr-2" />
          Tasks
        </button>
        <button
          onClick={() => setActiveTab("library")}
          className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm cursor-pointer ${
            activeTab === "library"
              ? "border-[var(--custom-primary-color)] text-[var(--custom-primary-color)]"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Library className="inline-block h-5 w-5 mr-2" />
          Library
        </button>
      </nav>
    </div>
  );
};
