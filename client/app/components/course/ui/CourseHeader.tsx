import { CourseHeaderProps } from "@/app/types/course.types";
import * as LucideIcons from "lucide-react";
import { Folder, LucideIcon } from "lucide-react";

export const CourseHeader = ({ course }: CourseHeaderProps) => {
  const getIcon = (): LucideIcon => {
    if (course.icon && course.icon in LucideIcons) {
      const IconComponent = LucideIcons[
        course.icon as keyof typeof LucideIcons
      ] as LucideIcon;
      return IconComponent;
    }
    return Folder;
  };

  const Icon = getIcon();

  return (
    <div className="p-8 border-b border-gray-100">
      <div className="flex items-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--custom-primary-color)] flex items-center justify-center mr-6">
          <Icon
            className="w-8 h-8 text-white"
            aria-label={`${course.name} icon`}
          />
        </div>
        <div>
          <h1 className="text-3xl font-light text-gray-900">
            {course.name}
          </h1>
          <p className="text-lg text-gray-500 font-medium mt-1">
            {course.code}
          </p>
        </div>
      </div>
    </div>
  );
};
