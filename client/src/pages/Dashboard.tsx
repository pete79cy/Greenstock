import { Helmet } from "react-helmet";
import { Link } from "wouter";
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
  Settings,
  Building2
} from "lucide-react";

interface NavigationButton {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

export default function Dashboard() {
  const navigationButtons: NavigationButton[] = [
    {
      title: "Plant Inventory",
      description: "Manage your plant collection and stock levels",
      icon: <Package className="h-8 w-8" />,
      href: "/inventory",
      color: "bg-emerald-500 hover:bg-emerald-600"
    },
    {
      title: "Reports & Analytics",
      description: "View detailed reports and business insights",
      icon: <BarChart3 className="h-8 w-8" />,
      href: "/reports",
      color: "bg-blue-500 hover:bg-blue-600"
    },
    {
      title: "PY8 Purchases",
      description: "Track and manage purchase orders",
      icon: <ShoppingCart className="h-8 w-8" />,
      href: "/py8-purchases",
      color: "bg-orange-500 hover:bg-orange-600"
    },
    {
      title: "Batch Purchases",
      description: "Process multiple purchase orders at once",
      icon: <PackageX className="h-8 w-8" />,
      href: "/py8-batch-purchases",
      color: "bg-purple-500 hover:bg-purple-600"
    },
    {
      title: "PY9 Sales",
      description: "Monitor sales performance and transactions",
      icon: <TrendingUp className="h-8 w-8" />,
      href: "/py9-sales",
      color: "bg-green-500 hover:bg-green-600"
    },
    {
      title: "Employee Management",
      description: "Manage staff information and records",
      icon: <Users className="h-8 w-8" />,
      href: "/employees",
      color: "bg-indigo-500 hover:bg-indigo-600"
    },
    {
      title: "Payroll & Payslips",
      description: "Handle payroll processing and payslips",
      icon: <FileText className="h-8 w-8" />,
      href: "/payslips",
      color: "bg-teal-500 hover:bg-teal-600"
    },
    {
      title: "Regulatory Compliance",
      description: "Ensure compliance with regulations",
      icon: <Shield className="h-8 w-8" />,
      href: "/regulatory-checks",
      color: "bg-red-500 hover:bg-red-600"
    },
    {
      title: "Backup & Restore",
      description: "Manage data backups and system recovery",
      icon: <Database className="h-8 w-8" />,
      href: "/backup-restore",
      color: "bg-gray-500 hover:bg-gray-600"
    },
    {
      title: "System Settings",
      description: "Configure application preferences",
      icon: <Settings className="h-8 w-8" />,
      href: "/settings",
      color: "bg-slate-500 hover:bg-slate-600"
    }
  ];

  return (
    <>
      <Helmet>
        <title>Dashboard | Business Management Hub</title>
        <meta name="description" content="Navigate to all business management modules from this central hub" />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Building2 className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Business Management Hub</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose a module below to access your business management tools
          </p>
        </div>

        {/* Navigation Grid */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {navigationButtons.map((button, index) => (
              <Link key={index} href={button.href}>
                <div className={`
                  ${button.color} text-white rounded-xl p-6 shadow-lg 
                  transform transition-all duration-200 hover:scale-105 hover:shadow-xl
                  cursor-pointer group h-48 flex flex-col justify-center
                `}>
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="p-3 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors">
                      {button.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{button.title}</h3>
                      <p className="text-sm opacity-90 leading-relaxed">
                        {button.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500">
          <p className="text-sm">
            Click any module above to get started with your business management tasks
          </p>
        </div>
      </div>
    </>
  );
}