import { Card, CardContent } from "@/components/ui/card";
import { Leaf, AlertTriangle, PlusCircle, Tag } from "lucide-react";

interface MetricsProps {
  metrics: {
    totalPlants: number;
    lowStockItems: number;
    newAdditions: number;
    plantCategories: number;
  };
}

export default function MetricsCards({ metrics }: MetricsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Plants Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Plants</p>
              <p className="text-2xl font-semibold">{metrics.totalPlants.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Leaf className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="mt-2 text-xs text-green-600 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-up w-3 h-3 mr-1"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            <span className="ml-1">12% from last month</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Low Stock Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Low Stock Items</p>
              <p className="text-2xl font-semibold">{metrics.lowStockItems}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
          </div>
          <div className="mt-2 text-xs text-red-600 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-up w-3 h-3 mr-1"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            <span className="ml-1">5% from last week</span>
          </div>
        </CardContent>
      </Card>
      
      {/* New Additions Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">New Additions</p>
              <p className="text-2xl font-semibold">{metrics.newAdditions}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <PlusCircle className="h-5 w-5 text-green-500" />
            </div>
          </div>
          <div className="mt-2 text-xs text-green-600 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-up w-3 h-3 mr-1"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            <span className="ml-1">24% from last month</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Plant Categories Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Plant Categories</p>
              <p className="text-2xl font-semibold">{metrics.plantCategories}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Tag className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-minus w-3 h-3 mr-1"><path d="M5 12h14"/></svg>
            <span className="ml-1">Same as last month</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
