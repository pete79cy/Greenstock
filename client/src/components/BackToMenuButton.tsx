import { Link } from "wouter";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BackToMenuButton() {
  return (
    <Link href="/">
      <Button variant="outline" className="flex items-center gap-2 mb-6">
        <Home className="h-4 w-4" />
        Back to Main Menu
      </Button>
    </Link>
  );
}