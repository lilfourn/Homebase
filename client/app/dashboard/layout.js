import {Sidebar} from "@/app/components/ui/sidebar";

export const metadata = {
    title: "Homebase",
    description: "The only place you need to go to for creating high quality study guides and problem sets for all of your hard classes.",
  };
  
  export default function DashboardLayout({ children }) {
    return (
      <>
        {children}
      </>
    );
  }