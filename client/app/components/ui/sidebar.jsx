"use client";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";
import { ChevronFirst, ChevronLast, ChevronUp } from "lucide-react";
import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";

/**
 * @typedef {Object} SidebarChild
 * @property {string} label - The text label for the child item
 * @property {string} href - The link destination for the child item
 * @property {React.ReactNode} [icon] - Optional icon for the child item
 */

/**
 * @typedef {Object} SidebarItemProps
 * @property {React.ReactNode} [icon] - Icon element to display
 * @property {string} text - Text label for the sidebar item
 * @property {boolean} [active] - Whether the item is currently active
 * @property {boolean} [alert] - Whether to show an alert indicator
 * @property {boolean} [allowWrap=false] - Whether to allow text wrapping
 * @property {boolean} [isDropdown=false] - Whether this item has a dropdown
 * @property {boolean} [defaultOpen=false] - Whether the dropdown is open by default
 * @property {SidebarChild[]} [items=[]] - Child items for dropdown
 * @property {React.ReactNode} [customContent] - Custom content to render in the dropdown
 * @property {string} [fetchKey] - Reserved for future DB hook
 * @property {string} [href] - Optional navigation link for the sidebar item
 */

// Create a context for the expanded state
export const SidebarContext = createContext();

export default function Sidebar({ children }) {
  const expanded = true; // Always expanded
  return (
    <aside className="h-screen w-72 relative">
      <nav className="h-full flex flex-col bg-white border-r border-gray-100 rounded-r-sm"
        style={{
          boxShadow: `0 0 50px -12px var(--custom-primary-color, #3B82F6)`,
          overflow: 'hidden'
        }}
      >
        <SidebarContext.Provider value={{ expanded }}>
          <ul className="flex-1 px-4 py-4 overflow-y-auto">{children}</ul>
        </SidebarContext.Provider>

        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center space-x-3">
            <UserButton />
            <Link
              href="/payment"
              className="unlimited-credits-btn flex-1 p-3 flex justify-center items-center bg-[var(--custom-primary-color,#3B82F6)] text-white rounded-xl hover:shadow-lg cursor-pointer transition-all duration-300"
            >
              <span className="font-semibold text-sm">
                Get Unlimited Credits
              </span>
            </Link>
          </div>
        </div>
      </nav>
    </aside>
  );
}

/**
 * Sidebar item component that can be a regular item or a dropdown
 * @param {SidebarItemProps} props - The component props
 */
export function SidebarItem({
  icon,
  text,
  active,
  alert,
  allowWrap = false,
  isDropdown = false,
  defaultOpen = false,
  items = [],
  customContent,
  fetchKey,
  href,
}) {
  const [open, setOpen] = useState(defaultOpen);

  const handleClick = () => {
    if (isDropdown) {
      setOpen((o) => !o);
    }
  };

  const ItemContent = () => (
    <div
      onClick={handleClick}
      className={`flex ${
        allowWrap ? "items-start" : "items-center"
      } py-3 px-4 my-1 font-medium rounded-xl cursor-pointer transition-all duration-200
          ${
            active
              ? "bg-[var(--custom-primary-color,#3B82F6)] text-white"
              : "hover:bg-gray-50 text-gray-600 hover:text-gray-900"
          }`}
    >
      <span
        className={`flex items-center justify-center ${
          allowWrap ? "mt-0.5" : ""
        }`}
      >
        {icon}
      </span>
      <span
        className={`flex-1 ml-3 overflow-hidden ${
          allowWrap
            ? "break-words leading-relaxed"
            : "whitespace-nowrap"
        }`}
      >
        {text}
      </span>
      {isDropdown && (
        <ChevronUp
          size={16}
          className={`ml-auto transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      )}
      {!isDropdown && alert && (
        <div
          className="absolute right-3 w-2 h-2 rounded-full bg-white"
        />
      )}
    </div>
  );

  return (
    <li className="relative flex flex-col">
      {href && !isDropdown ? (
        <Link href={href}>
          <ItemContent />
        </Link>
      ) : (
        <ItemContent />
      )}
      {isDropdown && (
        <ul
          className={cn(
            "overflow-hidden transition-[max-height] duration-300",
            open ? "max-h-96" : "max-h-0"
          )}
        >
          {items.map((item, idx) => (
            <li key={idx} className="pl-10">
              <Link
                href={item.href}
                className="flex items-center py-2.5 px-4 my-0.5 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                {item.icon && (
                  <span className="flex items-center justify-center">
                    {item.icon}
                  </span>
                )}
                <span className="overflow-hidden whitespace-nowrap ml-3">
                  {item.label}
                </span>
              </Link>
            </li>
          ))}
          {customContent && (
            <div className="transition-all duration-300 opacity-100 pl-0">
              {customContent}
            </div>
          )}
        </ul>
      )}
    </li>
  );
}
