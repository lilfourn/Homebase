"use client"
import { ChevronFirst, ChevronLast } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import {useState, createContext, useContext}  from "react";

// Create a context for the expanded state
const SidebarContext = createContext();

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
          <ul className = "flex-1 px-3">{children}</ul>
        </SidebarContext.Provider>

        <div className = {`border-t flex p-3 ${expanded ? "" : "justify-center"}`}>
          <span className = {`flex items-center ${expanded ? "" : "mx-auto"}`}><UserButton/></span>
          <Link href="/payment">
          <div className = {`overflow-hidden transition-all duration-300 ease-in-out cursor-pointer flex justify-between items-center bg-blue-600 text-white rounded-md ${expanded ? "w-48 ml-3 p-3" : "w-0 ml-0 opacity-0"}`} >
            <button className = {`cursor-pointer overflow-hidden whitespace-nowrap text-center font-bold text-sm ${expanded ? "opacity-100" : "opacity-0"}`}>
              Get Unlimited Credits
            </button>
          </div>
          </Link>
        </div>
      </nav>
    </aside>
  )
}

export function SidebarItem({icon, text, active, alert}) {
  // Use the expanded state from the context instead of creating a new state
  const { expanded } = useContext(SidebarContext);
  
  return (
    <li className = {`relative flex items-center py-2 px-3 my-1 font-medium 
    rounded-md cursor-pointer transition-colors
    ${
      active ? "bg-gray-100 text-blue-500" : "hover:bg-gray-50"
    }
    ${expanded ? "" : "justify-center"}
    `}>
      <span className={`flex items-center justify-center ${expanded ? "" : "mx-auto"}`}>
        {icon}
      </span>
      <span className = {`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${expanded ? "w-52 ml-3 opacity-100" : "w-0 opacity-0"}`}>{text}</span>
      {alert && (<div className = {`absolute ${expanded ? "right-2" : "right-1 top-1"} w-2 h-2 rounded bg-blue-600`}/>)}
    </li>
  )
}