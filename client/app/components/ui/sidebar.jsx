"use client"
import { ChevronFirst, ChevronLast, ChevronUp } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import {useState, createContext, useContext, useEffect}  from "react";
import { cn } from "@/lib/utils";

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
 * @property {boolean} [isDropdown=false] - Whether this item has a dropdown
 * @property {boolean} [defaultOpen=false] - Whether the dropdown is open by default
 * // TODO: replace mock items with SWR fetch '/api/sidebar/'+fetchKey once DB ready
 * @property {SidebarChild[]} [items=[]] - Child items for dropdown
 * @property {React.ReactNode} [customContent] - Custom content to render in the dropdown
 * @property {string} [fetchKey] - Reserved for future DB hook
 */

// Create a context for the expanded state
export const SidebarContext = createContext();

export default function Sidebar({children}) {
  const [expanded, setExpanded] = useState(true)
  return (
    <aside className = {`h-screen ${expanded ? "w-64" : "w-20"} transition-all duration-300`}>
      <nav className = "h-full flex flex-col bg-[#FFFBFC] border-r rounded-sm shadow-md">
        <div className = "p-4 pb-2 flex justify-between items-center">
          <img src = "/brand/homebase2.png" alt = "Homebase Logo" className = {`overflow-hidden transition-all ${expanded ? "w-26" : "w-0"}`} />
          <button onClick={() => setExpanded(curr =>! curr)} className = {`cursor-pointer overflow-hidden p-1.5 rounded-md hover:bg-gray-100 transition-all ${expanded ? "" : "w-10 h-10 flex items-center justify-center mx-auto"}`}>
            {expanded ? <ChevronFirst/> : <ChevronLast/>}
          </button>
        </div>

        <SidebarContext.Provider value={{ expanded }}>
          <ul className = "flex-1 px-3 overflow-y-auto">{children}</ul>
        </SidebarContext.Provider>

        <div className = {`border-t flex p-3 ${expanded ? "" : "justify-center"}`}>
          <span className = {`flex items-center ${expanded ? "" : "mx-auto"}`}><UserButton/></span>
          <Link href="/payment">
          <div className = {`overflow-hidden transition-all duration-300 ease-in-out cursor-pointer flex justify-center items-center bg-blue-600 text-white rounded-md ${expanded ? "w-48 ml-3 p-3" : "w-0 ml-0 opacity-0"}`} >
            <button className = {`w-full cursor-pointer overflow-hidden whitespace-nowrap text-center font-bold text-sm ${expanded ? "opacity-100" : "opacity-0"}`}>
              Get Unlimited Credits
            </button>
          </div>
          </Link>
        </div>
      </nav>
    </aside>
  )
}

/**
 * Sidebar item component that can be a regular item or a dropdown
 * @param {SidebarItemProps} props - The component props
 */
export function SidebarItem({icon, text, active, alert, isDropdown = false, defaultOpen = false, items = [], customContent, fetchKey}) {
  const { expanded } = useContext(SidebarContext);
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (!expanded) {
      setOpen(false);
    }
  }, [expanded]);

  return (
    <li className="relative flex flex-col">
      <div
        onClick={() => isDropdown && setOpen(o => !o)}
        className={`flex items-center py-2 px-3 my-1 font-medium rounded-md cursor-pointer transition-colors
          ${active ? "bg-gray-100 text-blue-500" : "hover:bg-gray-50"}
          ${expanded ? "" : "justify-center"}`}
      >
        <span className={`flex items-center justify-center ${expanded ? "" : "mx-auto"}`}>
          {icon}
        </span>
        <span className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${expanded ? "w-52 ml-3 opacity-100" : "w-0 opacity-0"}`}>
          {text}
        </span>
        {isDropdown && (
          <ChevronUp className={`ml-auto transition-transform ${expanded ? "" : "opacity-0"} ${open ? "rotate-180" : ""}`} />
        )}
        {!isDropdown && alert && (
          <div className={`absolute ${expanded ? "right-2" : "right-1 top-1"} w-2 h-2 rounded bg-blue-600`} />
        )}
      </div>
      {isDropdown && (
        <ul className={cn(
          "overflow-hidden transition-[max-height] duration-300", 
          open ? "max-h-96" : "max-h-0"
        )}>
          {items.map((item, idx) => (
            <li key={idx} className="pl-8">
              <Link href={item.href}>
                <div className="flex items-center py-2 px-3 my-1 font-medium rounded-md cursor-pointer transition-colors hover:bg-gray-50">
                  {item.icon && (
                    <span className="flex items-center justify-center">
                      {item.icon}
                    </span>
                  )}
                  <span className="overflow-hidden whitespace-nowrap ml-3">
                    {item.label}
                  </span>
                </div>
              </Link>
            </li>
          ))}
          {customContent && (
            <div className={cn(
              "transition-all duration-300",
              expanded ? "opacity-100 pl-0" : "opacity-0 flex justify-center"
            )}>
              {customContent}
            </div>
          )}
        </ul>
      )}
    </li>
  );
}