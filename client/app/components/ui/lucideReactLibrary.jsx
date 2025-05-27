import * as LucideIcons from "lucide-react";
import React, { useMemo, useState } from "react";

const ICONS = [
  // Productivity
  "Calendar",
  "Clock",
  "CheckCircle",
  "ClipboardList",
  "ListChecks",
  "Notebook",
  "BookOpen",
  "FileText",
  "Folder",
  "Pen",
  "Edit",
  "AlarmClock",
  "Timer",
  "Target",
  "Trophy",
  // School
  "GraduationCap",
  "School",
  "Book",
  "Library",
  "Pencil",
  "Ruler",
  "Globe",
  "Users",
  // Work
  "Briefcase",
  "Laptop",
  "Monitor",
  "Presentation",
  "PieChart",
  "BarChart",
  "Mail",
  "User",
  "UserCheck",
  "UserCircle",
  "Building2",
  // STEM (Science, Technology, Engineering, Math)
  "Atom",
  "FlaskConical",
  "Microscope",
  "TestTube",
  "Calculator",
  "Code",
  "Cpu",
  "CircuitBoard",
  "FunctionSquare",
  "Sigma",
  "Compass",
  "Wrench",
  "Hammer",
  "Lightbulb",
  "Rocket",
  // Social Studies / Humanities
  "Landmark",
  "Gavel",
  "Scale",
  "ScrollText",
  "Flag",
  "Map",
  "Handshake",
  "HeartHandshake",
  "Speech",
  "Newspaper",
  // General
  "Star",
  "Search",
  "Settings",
  "PlusCircle",
  "FolderOpen",
  "Archive",
  "BookMarked",
  "File",
  "FilePlus",
  "FileCheck",
  "FileEdit",
  "FileSearch",
  "Clipboard",
  "ClipboardCheck",
  "ClipboardEdit",
  "ClipboardCopy",
];

function getIconComponent(name) {
  return LucideIcons[name] || LucideIcons["Circle"];
}

export default function LucideReactLibrary({
  value,
  onChange,
  className = "",
}) {
  const [search, setSearch] = useState("");

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return ICONS;
    return ICONS.filter((icon) =>
      icon.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  return (
    <div className={`w-full ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Icon
      </label>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search icons..."
        className="mb-3 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
        aria-label="Search icons"
      />
      <div className="grid grid-cols-7 gap-2 max-h-48 overflow-y-auto bg-gray-50 p-2 rounded-md border border-gray-200">
        {filteredIcons.map((icon) => {
          const Icon = getIconComponent(icon);
          const selected = value === icon;
          return (
            <button
              key={icon}
              type="button"
              onClick={() => onChange(icon)}
              className={`flex flex-col items-center justify-center p-2 rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-gray-700 hover:bg-blue-100 hover:text-blue-700 ${
                selected
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white border-gray-200"
              }`}
              aria-label={icon}
            >
              <Icon className="w-6 h-6" />
            </button>
          );
        })}
        {filteredIcons.length === 0 && (
          <span className="col-span-7 text-xs text-gray-400 text-center">
            No icons found
          </span>
        )}
      </div>
    </div>
  );
}
