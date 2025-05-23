import SchoolSelectionModal from "@/app/components/auth/SchoolSelectionModal";
import AddCourseForm from "@/app/components/dashboard/AddCourseForm";
import UserCourseList from "@/app/components/dashboard/UserCourseList";
import Sidebar, { SidebarItem } from "@/app/components/ui/sidebar";
import { CourseProvider } from "@/app/context/CourseContext";
import { BookCopy, GraduationCap, Settings, User } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({ children }) {
  return (
    <CourseProvider>
      <SchoolSelectionModal />
      <div className="flex h-screen">
        <Sidebar>
          <SidebarItem
            icon={<GraduationCap size={25} />}
            text="Your College"
            active={false}
            alert={true}
          />
          <SidebarItem
            icon={<BookCopy size={25} />}
            text="Your Classes"
            active={false}
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
            active={false}
          />
          <hr className="my-1 p-1.5" />
          <SidebarItem
            icon={<Settings size={25} />}
            text="Settings"
            active={true}
          />
        </Sidebar>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </CourseProvider>
  );
}
