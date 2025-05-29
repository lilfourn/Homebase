"use client";
import { fetchUserByClerkId } from "@/app/api/users.api.js";
import SchoolSelectionModal from "@/app/components/auth/SchoolSelectionModal";
import AddCourseForm from "@/app/components/dashboard/AddCourseForm";
import UserCourseList from "@/app/components/dashboard/UserCourseList";
import SchoolSidebarItem from "@/app/components/ui/SchoolSidebarItem";
import Sidebar, { SidebarItem } from "@/app/components/ui/sidebar";
import { CourseProvider } from "@/app/context/CourseContext";
import {
  SchoolUpdateProvider,
  useSchoolUpdate,
} from "@/app/context/SchoolUpdateContext";
import { TASetupProvider } from "@/app/context/TASetupContext";
import { useUser } from "@clerk/nextjs";
import { BookCopy, Settings, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Helper function to lighten a hex color
function lightenColor(hex, percent) {
  if (!hex) return "#cccccc"; // Default to a light gray if hex is undefined
  hex = hex.replace(/^#/, "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const newR = Math.min(255, r + (255 - r) * (percent / 100));
  const newG = Math.min(255, g + (255 - g) * (percent / 100));
  const newB = Math.min(255, b + (255 - b) * (percent / 100));

  return `#${Math.round(newR).toString(16).padStart(2, "0")}${Math.round(newG)
    .toString(16)
    .padStart(2, "0")}${Math.round(newB).toString(16).padStart(2, "0")}`;
}

// Helper function to determine text color (black or white) based on background brightness
function getTextColorForBackground(hexColor) {
  if (!hexColor) return "#000000"; // Default to black if hexColor is undefined
  const r = parseInt(hexColor.substring(1, 3), 16);
  const g = parseInt(hexColor.substring(3, 5), 16);
  const b = parseInt(hexColor.substring(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 125 ? "#000000" : "#ffffff"; // Return black for light backgrounds, white for dark
}

// New component to handle theme application
function ThemeApplicator() {
  const { user: clerkUser } = useUser();
  const [themeStyles, setThemeStyles] = useState("");
  const { updateCount } = useSchoolUpdate();

  useEffect(() => {
    if (clerkUser && clerkUser.id) {
      console.log(
        `[ThemeApplicator] Fetching theme data for user ${clerkUser.id}, updateCount: ${updateCount}`
      );
      fetchUserByClerkId(clerkUser.id)
        .then((userData) => {
          console.log(`[ThemeApplicator] Received user data:`, userData);
          if (
            userData &&
            userData.customPrimaryColor &&
            userData.customSecondaryColor
          ) {
            const primaryColor = userData.customPrimaryColor;
            const secondaryColor = userData.customSecondaryColor;

            const softenedSecondaryColor = lightenColor(secondaryColor, 40); // Soften by 40%
            const primaryTextColor = getTextColorForBackground(primaryColor);
            const hoverPrimaryColor = lightenColor(primaryColor, 15); // Lighten primary by 15% for a softer hover
            const softSecondaryTextColor = getTextColorForBackground(
              softenedSecondaryColor
            );

            const styles = `
              :root {
                --custom-primary-color: ${primaryColor};
                --custom-primary-text-color: ${primaryTextColor};
                --custom-secondary-color: ${secondaryColor};
                --custom-soft-secondary-color: ${softenedSecondaryColor};
                --custom-soft-secondary-text-color: ${softSecondaryTextColor};
                --custom-hover-primary-color: ${hoverPrimaryColor};
              }

              /* === Primary Buttons === */
              /* Targets .btn-primary, buttons/inputs with bg-blue-500, and the sidebar 'Get Unlimited Credits' button (div with bg-blue-600) */
              .btn-primary,
              button[class*="bg-blue-500"],
              button[class*="bg-blue-600"],
              input[type="submit"][class*="bg-blue-500"],
              input[type="submit"][class*="bg-blue-600"],
              div[class*="bg-blue-600"] {
                background-color: var(--custom-primary-color) !important;
                color: var(--custom-primary-text-color) !important;
                border-color: var(--custom-primary-color) !important; /* Ensure border matches if any */
                cursor: pointer;
              }

              .btn-primary:hover,
              button[class*="bg-blue-500"]:hover,
              button[class*="bg-blue-600"]:hover,
              input[type="submit"][class*="bg-blue-500"]:hover,
              input[type="submit"][class*="bg-blue-600"]:hover,
              div[class*="bg-blue-600"]:hover {
                background-color: var(--custom-hover-primary-color) !important; /* Softer hover background */
                color: var(--custom-primary-text-color) !important; /* Original text color */
                border-color: var(--custom-hover-primary-color) !important; /* Softer hover border */
              }

              /* === Unlimited Credits Button === */
              .unlimited-credits-btn {
                background-color: var(--custom-primary-color) !important;
                color: var(--custom-primary-text-color) !important;
                border-color: var(--custom-primary-color) !important;
              }
              .unlimited-credits-btn:hover {
                background-color: var(--custom-hover-primary-color) !important;
                color: var(--custom-primary-text-color) !important;
                border-color: var(--custom-hover-primary-color) !important;
              }
              
              /* === Active Sidebar Items (e.g., 'Your Profile') === */
              /* This targets the active state styling in SidebarItem */
              li > a > div[class*="bg-gradient-to-r"],
              li > div[class*="bg-gradient-to-r"] /* For non-link active items */
              {
                background-image: none !important; /* Remove Tailwind gradient */
                background-color: var(--custom-soft-secondary-color) !important;
                color: var(--custom-soft-secondary-text-color) !important;
                border-color: var(--custom-secondary-color) !important; 
              }

              /* === General Accent Colors (Examples) === */
              .accent-color {
                color: var(--custom-soft-secondary-color) !important;
              }
              .bg-accent-color {
                background-color: var(--custom-soft-secondary-color) !important;
              }

              /* === Universal Clickable Cursor === */
              a, button, [role="button"], input[type="submit"], input[type="button"], .cursor-pointer {
                cursor: pointer !important;
              }
            `;
            console.log(
              `[ThemeApplicator] Setting theme styles with colors: Primary=${primaryColor}, Secondary=${secondaryColor}`
            );
            setThemeStyles(styles);
          } else {
            console.log(
              "[ThemeApplicator] userData is missing colors or userData itself is null/undefined.",
              userData
            );
            // Clear styles if no valid colors
            setThemeStyles("");
          }
        })
        .catch((error) => {
          console.error("Failed to load user theme data from backend:", error);
        });
    }
  }, [clerkUser, updateCount]);

  return themeStyles ? (
    <style dangerouslySetInnerHTML={{ __html: themeStyles }} />
  ) : null;
}

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  // Removed: const { user: clerkUser } = useUser();
  // Removed: const [themeStyles, setThemeStyles] = useState("");
  // Removed: const { updateCount } = useSchoolUpdate();

  // Removed useEffect for theme fetching, it's now in ThemeApplicator

  // Determine active states based on current path
  const isSchoolActive = pathname === "/dashboard";
  const isClassesActive = pathname.startsWith("/dashboard/classes");
  const isProfileActive = pathname.startsWith("/dashboard/profile");
  const isSettingsActive = pathname.startsWith("/dashboard/settings");

  return (
    <SchoolUpdateProvider>
      <CourseProvider>
        <TASetupProvider>
          <ThemeApplicator />
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
        </TASetupProvider>
      </CourseProvider>
    </SchoolUpdateProvider>
  );
}
