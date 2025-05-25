"use client";
import { useUserSchool } from "@/hooks/useUserSchool";
import { GraduationCap } from "lucide-react";
import { SidebarItem } from "./sidebar";

export default function SchoolSidebarItem() {
  const { schoolName, isLoading, hasSchool } = useUserSchool();

  return (
    <div title={schoolName !== "Your College" ? schoolName : undefined}>
      <SidebarItem
        icon={<GraduationCap size={25} />}
        text={isLoading ? "Loading..." : schoolName}
        active={false}
        alert={!isLoading && !hasSchool}
      />
    </div>
  );
}
