import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Leaf, BarChart3, Warehouse, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();

  return (
    <aside 
      className={cn(
        "w-64 bg-white shadow-md transition-all duration-300 z-20 fixed inset-y-0 left-0 md:relative",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <div className="p-4 border-b flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Leaf className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold text-primary">Plant Inventory</h1>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden" 
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      <nav className="p-4">
        <ul className="space-y-2">
          <li>
            <Link href="/">
              <a className={cn(
                "flex items-center p-2 rounded-md",
                location === "/" 
                  ? "bg-primary bg-opacity-10 text-primary" 
                  : "hover:bg-gray-100"
              )}>
                <BarChart3 className="mr-3 h-5 w-5" />
                <span>Dashboard</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/inventory">
              <a className={cn(
                "flex items-center p-2 rounded-md",
                location === "/inventory" 
                  ? "bg-primary bg-opacity-10 text-primary" 
                  : "hover:bg-gray-100"
              )}>
                <Warehouse className="mr-3 h-5 w-5" />
                <span>Inventory</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/reports">
              <a className={cn(
                "flex items-center p-2 rounded-md",
                location === "/reports" 
                  ? "bg-primary bg-opacity-10 text-primary" 
                  : "hover:bg-gray-100"
              )}>
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-5 w-5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
                <span>Reports</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/settings">
              <a className={cn(
                "flex items-center p-2 rounded-md",
                location === "/settings" 
                  ? "bg-primary bg-opacity-10 text-primary" 
                  : "hover:bg-gray-100"
              )}>
                <Settings className="mr-3 h-5 w-5" />
                <span>Settings</span>
              </a>
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
