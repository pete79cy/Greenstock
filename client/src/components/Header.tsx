import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden mr-2" 
            onClick={onToggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-primary md:hidden">Plant Inventory</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="hidden md:block text-sm">John Gardener</span>
            <Avatar className="bg-primary text-primary-foreground">
              <AvatarFallback>JG</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
