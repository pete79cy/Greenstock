import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { 
  Package, 
  BarChart3, 
  ShoppingCart, 
  PackageX, 
  TrendingUp, 
  Users, 
  FileText, 
  Shield, 
  Database,
  Settings
} from "lucide-react";

interface CommandItem {
  id: string;
  title: string;
  href: string;
  icon: React.ReactNode;
  shortcut: string;
}

const commands: CommandItem[] = [
  {
    id: "inventory",
    title: "Plant Inventory",
    href: "/inventory",
    icon: <Package className="h-4 w-4" />,
    shortcut: "i"
  },
  {
    id: "reports",
    title: "Reports & Analytics", 
    href: "/reports",
    icon: <BarChart3 className="h-4 w-4" />,
    shortcut: "r"
  },
  {
    id: "py8-purchases",
    title: "PY8 Purchases",
    href: "/py8-purchases", 
    icon: <ShoppingCart className="h-4 w-4" />,
    shortcut: "p"
  },
  {
    id: "batch-purchases",
    title: "Batch Purchases",
    href: "/py8-batch-purchases",
    icon: <PackageX className="h-4 w-4" />,
    shortcut: "b"
  },
  {
    id: "py9-sales",
    title: "PY9 Sales",
    href: "/py9-sales",
    icon: <TrendingUp className="h-4 w-4" />,
    shortcut: "s"
  },
  {
    id: "employees", 
    title: "Employee Management",
    href: "/employees",
    icon: <Users className="h-4 w-4" />,
    shortcut: "e"
  },
  {
    id: "payslips",
    title: "Payroll & Payslips",
    href: "/payslips",
    icon: <FileText className="h-4 w-4" />,
    shortcut: "l"
  },
  {
    id: "regulatory",
    title: "Regulatory Compliance",
    href: "/regulatory-checks", 
    icon: <Shield className="h-4 w-4" />,
    shortcut: "c"
  },
  {
    id: "backup",
    title: "Backup & Restore",
    href: "/backup-restore",
    icon: <Database className="h-4 w-4" />,
    shortcut: "d"
  },
  {
    id: "settings",
    title: "System Settings",
    href: "/settings",
    icon: <Settings className="h-4 w-4" />,
    shortcut: "g"
  }
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  // Handle Ctrl+K to open command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Handle individual shortcuts when command palette is closed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      console.log('Keydown event:', {
        key: e.key,
        code: e.code,
        open: open,
        activeElement: document.activeElement?.tagName,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey
      });

      if (open) {
        console.log('Command palette is open, ignoring hotkey');
        return;
      }
      
      // Only handle shortcuts if no input is focused and no modifiers are pressed
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === "INPUT" || 
                           activeElement?.tagName === "TEXTAREA" ||
                           activeElement?.getAttribute("contenteditable") === "true";
      
      if (isInputFocused) {
        console.log('Input is focused, ignoring hotkey');
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
        console.log('Modifier key pressed, ignoring hotkey');
        return;
      }

      const command = commands.find(cmd => cmd.shortcut === e.key.toLowerCase());
      console.log('Looking for command with shortcut:', e.key.toLowerCase(), 'found:', command?.title);
      
      if (command) {
        e.preventDefault();
        console.log(`Navigating to ${command.title} via hotkey: ${e.key}`);
        setLocation(command.href);
      }
    };

    console.log('Adding keydown event listener for hotkeys');
    document.addEventListener("keydown", down);
    return () => {
      console.log('Removing keydown event listener for hotkeys');
      document.removeEventListener("keydown", down);
    };
  }, [open, setLocation]);

  const runCommand = (href: string) => {
    setOpen(false);
    setLocation(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {commands.map((command) => (
            <CommandItem
              key={command.id}
              onSelect={() => runCommand(command.href)}
              className="flex items-center gap-2"
            >
              {command.icon}
              <span>{command.title}</span>
              <div className="ml-auto flex items-center gap-1">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  {command.shortcut}
                </kbd>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}