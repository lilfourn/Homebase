"use client";
import { useUserSchool } from "@/hooks/useUserSchool";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { useContext } from "react";
import { SidebarContext } from "./sidebar";

export default function SchoolSidebarItem({ active = false, href }) {
  const { schoolName, isLoading, hasSchool } = useUserSchool();
  const { expanded } = useContext(SidebarContext);

  const ItemContent = () => (
    <div
      className={`flex items-center py-2 px-3 my-1 font-medium rounded-md cursor-pointer transition-colors
        ${
          active
            ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 border border-blue-200"
            : "hover:bg-gray-50"
        }
        ${expanded ? "" : "justify-center"}`}
    >
      {!expanded && (
        <span className="flex items-center justify-center mx-auto">
          <GraduationCap size={25} />
        </span>
      )}
      {expanded && (
        <span className="overflow-hidden transition-all duration-300 ease-in-out w-52 ml-3 opacity-100 text-center break-words leading-tight">
          {isLoading ? "Loading..." : schoolName}
        </span>
      )}
      {!expanded && !isLoading && !hasSchool && (
        <div className="absolute right-1 top-1 w-2 h-2 rounded bg-blue-600" />
      )}
      {expanded && !isLoading && !hasSchool && (
        <div className="absolute right-2 w-2 h-2 rounded bg-blue-600" />
      )}
    </div>
  );

  return (
    <li
      className="relative flex flex-col"
      title={schoolName !== "Your College" ? schoolName : undefined}
    >
      {href ? (
        <Link href={href}>
          <ItemContent />
        </Link>
      ) : (
        <ItemContent />
      )}
    </li>
  );
}
