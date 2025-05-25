"use client";
import { useUserSchool } from "@/hooks/useUserSchool";
import { GraduationCap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useContext } from "react";
import SchoolBanner from "../dashboard/SchoolBanner";
import { SidebarContext } from "./sidebar";

export default function SchoolSidebarItem({ active = false, href }) {
  const {
    schoolName,
    isLoading,
    hasSchool,
    schoolLogo,
    schoolColors,
    customPrimaryColor,
    customSecondaryColor,
  } = useUserSchool();
  const { expanded } = useContext(SidebarContext);

  const primaryColor = customPrimaryColor || schoolColors?.primary;
  const secondaryColor = customSecondaryColor || schoolColors?.secondary;

  const ItemContent = () => {
    if (isLoading) {
      return (
        <div
          className={`flex items-center py-2 px-3 my-1 font-medium rounded-md cursor-pointer transition-colors
            ${expanded ? "" : "justify-center"}`}
        >
          {expanded ? (
            <span className="overflow-hidden transition-all duration-300 ease-in-out w-52 ml-3 opacity-100 text-center break-words leading-tight">
              Loading...
            </span>
          ) : (
            <span className="flex items-center justify-center mx-auto w-10 h-10">
              <GraduationCap size={25} />
            </span>
          )}
        </div>
      );
    }

    if (expanded && hasSchool) {
      return (
        <SchoolBanner
          schoolName={schoolName}
          schoolLogo={schoolLogo}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      );
    }

    // Fallback for collapsed sidebar or no school selected / or expanded sidebar with no school
    return (
      <div
        className={`flex items-center py-2 px-3 my-1 font-medium rounded-md cursor-pointer transition-colors
          ${
            active && !expanded // Active state only if not expanded and showing banner
              ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 border border-blue-200"
              : "hover:bg-gray-50"
          }
          ${expanded ? "" : "justify-center"}`}
      >
        {!expanded && (
          <span className="flex items-center justify-center mx-auto w-10 h-10">
            {" "}
            {/* Parent span for clickable area */}
            {hasSchool && schoolLogo ? (
              <div className="w-[50px] h-[50px] rounded-md overflow-hidden flex items-center justify-center">
                {" "}
                {/* Container for logo */}
                <Image
                  src={schoolLogo}
                  alt={`${schoolName} Logo`}
                  width={35}
                  height={35}
                  className="object-contain"
                />
              </div>
            ) : hasSchool ? (
              <div className="w-[25px] h-[25px] bg-gray-200 rounded-md flex items-center justify-center text-xs font-semibold">
                {" "}
                {/* Container for initial */}
                {schoolName.charAt(0).toUpperCase()}
              </div>
            ) : (
              <div className="w-[25px] h-[25px] bg-gray-200 rounded-md flex items-center justify-center text-xs font-semibold">
                {"Y"}
              </div>
            )}
          </span>
        )}
        {expanded && ( // This part for "Your College" or when hasSchool is false but expanded
          <span className="overflow-hidden transition-all duration-300 ease-in-out w-52 ml-3 opacity-100 text-center break-words leading-tight">
            {schoolName} {/* Will show 'Your College' if no school is set */}
          </span>
        )}
        {/* Alert dot for no school selected, only if not showing the banner */}
        {!hasSchool && !expanded && (
          <div
            className={`absolute w-2 h-2 rounded bg-blue-600 right-1 top-1`}
          />
        )}
        {expanded && !isLoading && !hasSchool && (
          <div className="absolute right-2 w-2 h-2 rounded bg-blue-600" />
        )}
      </div>
    );
  };

  return (
    <li
      className={`relative flex flex-col my-1 ${
        expanded && hasSchool ? "" : "px-1"
      }`}
      title={
        !expanded && schoolName !== "Your College" ? schoolName : undefined
      }
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
