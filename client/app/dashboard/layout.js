"use client";
import SchoolSelectionModal from "@/app/components/auth/SchoolSelectionModal";
import AddCourseForm from "@/app/components/dashboard/AddCourseForm";
import UserCourseList from "@/app/components/dashboard/UserCourseList";
import SchoolSidebarItem from "@/app/components/ui/SchoolSidebarItem";
import Sidebar, { SidebarItem } from "@/app/components/ui/sidebar";
import { CourseProvider } from "@/app/context/CourseContext";
import { SchoolUpdateProvider } from "@/app/context/SchoolUpdateContext";
import { BookCopy, Settings, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  // Determine active states based on current path
  const isSchoolActive = pathname === "/dashboard";
  const isClassesActive = pathname.startsWith("/dashboard/classes");
  const isProfileActive = pathname.startsWith("/dashboard/profile");
  const isSettingsActive = pathname.startsWith("/dashboard/settings");

  return (
    <SchoolUpdateProvider>
      <CourseProvider>
        <SchoolSelectionModal />
        <div className="flex h-screen">
          <Sidebar>
            <SchoolSidebarItem active={isSchoolActive} href="/dashboard" />
            <SidebarItem
              icon={<BookCopy size={25} />}
              text="Your Classes"
              active={isClassesActive}
              isDropdown={true}
              defaultOpen={true}
              items={[]}
              customContent={
                <div className="py-2 space-y-3 w-full px-3">
                  <UserCourseList />
                  <AddCourseForm />
                </div>
              }
            />
            <SidebarItem
              icon={<User size={25} />}
              text="Your Profile"
              active={isProfileActive}
              href="/dashboard/profile"
            />
            <hr className="my-1 p-1.5" />
            <SidebarItem
              icon={<Settings size={25} />}
              text="Settings"
              active={isSettingsActive}
              href="/dashboard/settings"
            />
          </Sidebar>
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </CourseProvider>
    </SchoolUpdateProvider>
  );
}
