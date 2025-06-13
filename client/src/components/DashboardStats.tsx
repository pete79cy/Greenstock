import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  TrendingUp, 
  Package, 
  Users, 
  Sprout, 
  DollarSign,
  ShoppingCart,
  BarChart3
} from "lucide-react";

interface DashboardStats {
  expiringLicences: number;
  salesToday: number;
  pendingPOs: number;
  activeEmployees: number;
  totalPlants: number;
  monthlyRevenue: number;
  plantPurchases: number;
  purchaseAnalysis: number;
}

export function DashboardStats() {
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-24">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-6 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="h-24 border border-red-200 bg-red-50 p-4 flex items-center justify-center text-red-600 rounded-lg">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <span className="text-sm">Stats unavailable</span>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Expiring Licences",
      value: stats.expiringLicences,
      icon: AlertTriangle,
      color: stats.expiringLicences > 0 ? "text-red-600" : "text-green-600",
      bgColor: stats.expiringLicences > 0 ? "bg-red-50" : "bg-green-50",
      borderColor: stats.expiringLicences > 0 ? "border-red-200" : "border-green-200",
    },
    {
      title: "Pending Orders",
      value: stats.pendingPOs,
      icon: Package,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    },
    {
      title: "Active Staff",
      value: stats.activeEmployees,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
    },
    {
      title: "Total Plants",
      value: stats.totalPlants,
      icon: Sprout,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      title: "Αγορές Φυτών",
      value: stats.plantPurchases,
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      title: "Ανάλυση Αγορών",
      value: stats.purchaseAnalysis,
      icon: BarChart3,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card 
            key={index} 
            className={`h-24 ${stat.bgColor} ${stat.borderColor} transition-all duration-200 hover:shadow-md`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    {stat.title}
                  </p>
                  <p className={`text-lg font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}