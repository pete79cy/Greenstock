import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Leaf, BarChart3, Warehouse, Settings, X, FileText, ShoppingCart, TrendingUp, Receipt, Users, Calculator, Shield, CheckCircle, Package, PieChart } from "lucide-react";
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
              <div className={cn(
                "flex items-center p-2 rounded-md cursor-pointer",
                location === "/" 
                  ? "bg-primary bg-opacity-10 text-primary" 
                  : "hover:bg-gray-100"
              )}>
                <BarChart3 className="mr-3 h-5 w-5" />
                <span>Dashboard</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/inventory">
              <div 
                className={cn(
                  "flex items-center p-2 rounded-md cursor-pointer",
                  location === "/inventory" 
                    ? "bg-primary bg-opacity-10 text-primary" 
                    : "hover:bg-gray-100"
                )}
                onClick={() => {
                  console.log("Inventory link clicked, location:", location);
                }}
              >
                <Warehouse className="mr-3 h-5 w-5" />
                <span>Inventory</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/reports">
              <div className={cn(
                "flex items-center p-2 rounded-md cursor-pointer",
                location === "/reports" 
                  ? "bg-primary bg-opacity-10 text-primary" 
                  : "hover:bg-gray-100"
              )}>
                <FileText className="mr-3 h-5 w-5" />
                <span>Reports</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/py8-purchases">
              <div className={cn(
                "flex items-center p-2 rounded-md cursor-pointer",
                location === "/py8-purchases" 
                  ? "bg-primary bg-opacity-10 text-primary" 
                  : "hover:bg-gray-100"
              )}>
                <ShoppingCart className="mr-3 h-5 w-5" />
                <span>ΠΥ8 - Αγορές</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/py8-batch-purchases">
              <div className={cn(
                "flex items-center p-2 rounded-md cursor-pointer",
                location === "/py8-batch-purchases" 
                  ? "bg-primary bg-opacity-10 text-primary" 
                  : "hover:bg-gray-100"
              )}>
                <Receipt className="mr-3 h-5 w-5" />
                <span>ΠΥ8 - Παραστατικό</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/py9-sales">
              <div className={cn(
                "flex items-center p-2 rounded-md cursor-pointer",
                location === "/py9-sales" 
                  ? "bg-primary bg-opacity-10 text-primary" 
                  : "hover:bg-gray-100"
              )}>
                <TrendingUp className="mr-3 h-5 w-5" />
                <span>ΠΥ9 - Πωλήσεις</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/employees">
              <div className={cn(
                "flex items-center p-2 rounded-md cursor-pointer",
                location === "/employees" 
                  ? "bg-primary bg-opacity-10 text-primary" 
                  : "hover:bg-gray-100"
              )}>
                <Users className="mr-3 h-5 w-5" />
                <span>Employees</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/payslips">
              <div className={cn(
                "flex items-center p-2 rounded-md cursor-pointer",
                location === "/payslips" 
                  ? "bg-primary bg-opacity-10 text-primary" 
                  : "hover:bg-gray-100"
              )}>
                <Calculator className="mr-3 h-5 w-5" />
                <span>Payslips</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/regulatory-checks">
              <div className={cn(
                "flex items-center p-2 rounded-md cursor-pointer",
                location === "/regulatory-checks" 
                  ? "bg-primary bg-opacity-10 text-primary" 
                  : "hover:bg-gray-100"
              )}>
                <CheckCircle className="mr-3 h-5 w-5" />
                <span>Regulatory Checks</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/plant-purchases">
              <div className={cn(
                "flex items-center p-2 rounded-md cursor-pointer",
                location === "/plant-purchases" 
                  ? "bg-primary bg-opacity-10 text-primary" 
                  : "hover:bg-gray-100"
              )}>
                <Package className="mr-3 h-5 w-5" />
                <span>Αγορές Φυτών</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/plant-purchase-analysis">
              <div className={cn(
                "flex items-center p-2 rounded-md cursor-pointer",
                location === "/plant-purchase-analysis" 
                  ? "bg-primary bg-opacity-10 text-primary" 
                  : "hover:bg-gray-100"
              )}>
                <PieChart className="mr-3 h-5 w-5" />
                <span>Ανάλυση Αγορών</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/backup-restore">
              <div className={cn(
                "flex items-center p-2 rounded-md cursor-pointer",
                location === "/backup-restore" 
                  ? "bg-primary bg-opacity-10 text-primary" 
                  : "hover:bg-gray-100"
              )}>
                <Shield className="mr-3 h-5 w-5" />
                <span>Backup & Restore</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/settings">
              <div className={cn(
                "flex items-center p-2 rounded-md cursor-pointer",
                location === "/settings" 
                  ? "bg-primary bg-opacity-10 text-primary" 
                  : "hover:bg-gray-100"
              )}>
                <Settings className="mr-3 h-5 w-5" />
                <span>Settings</span>
              </div>
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
