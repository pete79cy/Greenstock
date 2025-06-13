import { Helmet } from "react-helmet";
import { Building2, Command } from "lucide-react";
import { DashboardStats } from "@/components/DashboardStats";
import { ReorderableModuleGrid } from "@/components/ReorderableModuleGrid";
import { CommandPalette } from "@/components/CommandPalette";
import { Card, CardContent } from "@/components/ui/card";

export default function Dashboard() {
  return (
    <>
      <Helmet>
        <title>Admin Dashboard | Business Management Hub</title>
        <meta name="description" content="Unified admin dashboard with quick stats and reorderable modules for efficient business management" />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        {/* Command Palette */}
        <CommandPalette />
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Building2 className="h-10 w-10 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <Command className="h-4 w-4" />
            <p className="text-sm">
              Press <kbd className="px-2 py-1 text-xs bg-gray-200 rounded">Ctrl+K</kbd> for quick navigation or use hotkeys
            </p>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <DashboardStats />

        {/* Reorderable Module Grid */}
        <ReorderableModuleGrid />

        {/* Help Card */}
        <Card className="mt-8 max-w-2xl mx-auto bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Quick Navigation</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-blue-800">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-blue-200 rounded text-xs">i</kbd>
                <span>Inventory</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-blue-200 rounded text-xs">r</kbd>
                <span>Reports</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-blue-200 rounded text-xs">p</kbd>
                <span>Purchases</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-blue-200 rounded text-xs">s</kbd>
                <span>Sales</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-blue-200 rounded text-xs">e</kbd>
                <span>Employees</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-blue-200 rounded text-xs">c</kbd>
                <span>Compliance</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}