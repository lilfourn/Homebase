import Sidebar from "@/app/components/ui/sidebar"
import Link from "next/link";
import { Settings, User, GraduationCap, BookCopy } from "lucide-react";
import { SidebarItem } from "@/app/components/ui/sidebar";

export default function DashboardLayout({ children }) {
  return (
        <div className="flex h-screen">
          <Sidebar>
            <SidebarItem icon = {<GraduationCap size={25}/>} text = "Your College" active = {false} alert = {true}/>
            <SidebarItem icon = {<BookCopy size={25}/>} text = "Your Classes" active = {false} isDropdown = {true} defaultOpen = {true} items = {[{label: "Class 1", href: "/class/1"}, {label: "Class 2", href: "/class/2"}]} />
            <SidebarItem icon = {<User size={25}/>} text = "Your Profile" active = {false}/>
            <hr className = "my-1 p-1.5"/>
            <SidebarItem icon = {<Settings size={25}/>} text = "Settings" active = {true}/>
          </Sidebar>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
  )
}