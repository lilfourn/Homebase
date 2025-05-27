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
    <div className="p-6 sm:p-8 border-b border-gray-200">
      <div className="flex items-center">
        <Icon
          className="w-12 h-12 sm:w-16 sm:h-16 mr-4 sm:mr-6 text-[var(--custom-primary-color)]"
          aria-label={`${course.name} icon`}
        />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            {course.name}
          </h1>
          <p className="text-lg sm:text-xl text-[var(--custom-primary-color)] font-semibold">
            {course.code}
          </p>
        </div>
      </div>
    </div>
  );
};
