import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  Euro, 
  Package, 
  MapPin, 
  Calendar,
  Award,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import type { PlantPurchaseAnalysis, PlantPurchase } from "@shared/schema";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

export default function PlantPurchaseAnalysis() {
  const { data: analysis, isLoading: analysisLoading } = useQuery<PlantPurchaseAnalysis>({
    queryKey: ["/api/plant-purchases-analysis"],
  });

  const { data: purchases = [], isLoading: purchasesLoading } = useQuery<PlantPurchase[]>({
    queryKey: ["/api/plant-purchases"],
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (analysisLoading || purchasesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="container mx-auto p-6">
        <Card className="text-center py-12">
          <CardContent>
            <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Δεν υπάρχουν δεδομένα</h3>
            <p className="text-muted-foreground">
              Προσθέστε αγορές φυτών για να δείτε αναλυτικά στοιχεία
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate additional metrics
  const statusDistribution = purchases.reduce((acc, purchase) => {
    acc[purchase.status] = (acc[purchase.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.entries(statusDistribution).map(([status, count]) => ({
    name: status === 'ordered' ? 'Παραγγελία' : 
          status === 'shipped' ? 'Αποστολή' : 
          status === 'delivered' ? 'Παράδοση' : 'Φύτευση',
    value: count,
    percentage: (count / purchases.length) * 100
  }));

  const countryDistribution = purchases.reduce((acc, purchase) => {
    acc[purchase.supplierCountry] = (acc[purchase.supplierCountry] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const countryData = Object.entries(countryDistribution)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const qualityRatings = purchases
    .filter(p => p.qualityRating)
    .reduce((acc, purchase) => {
      const rating = purchase.qualityRating!;
      acc[rating] = (acc[rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

  const avgQuality = purchases
    .filter(p => p.qualityRating)
    .reduce((sum, p) => sum + p.qualityRating!, 0) / 
    purchases.filter(p => p.qualityRating).length || 0;

  const survivalRateData = purchases
    .filter(p => p.survivalRate !== null && p.survivalRate !== undefined)
    .map(p => ({
      plantName: p.plantName,
      survivalRate: p.survivalRate!,
      quantity: p.quantity
    }))
    .sort((a, b) => b.survivalRate - a.survivalRate);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ανάλυση Αγορών Φυτών</h1>
        <p className="text-muted-foreground">
          Επισκόπηση και ανάλυση των αγορών για βελτιστοποίηση κόστους και προγραμματισμό
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Συνολικές Αγορές</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.totalPurchases}</div>
            <p className="text-xs text-muted-foreground">
              παραγγελίες φυτών
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Συνολική Δαπάνη</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analysis.totalSpent)}</div>
            <p className="text-xs text-muted-foreground">
              συμπεριλαμβανομένων όλων των τελών
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Μέση Τιμή Μονάδας</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analysis.averageUnitPrice)}</div>
            <p className="text-xs text-muted-foreground">
              κατά μέσο όρο ανά φυτό
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Μέση Αξιολόγηση</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgQuality ? avgQuality.toFixed(1) : 'Ν/Α'}
              {avgQuality && <span className="text-sm text-muted-foreground">/5</span>}
            </div>
            <p className="text-xs text-muted-foreground">
              ποιότητα παραδομένων φυτών
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Spending Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Μηνιαία Δαπάνη</CardTitle>
            <CardDescription>Εξέλιξη δαπανών τους τελευταίους 12 μήνες</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analysis.monthlySpending}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Δαπάνη']}
                  labelFormatter={(label) => `Μήνας: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalSpent" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ fill: '#8884d8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Suppliers */}
        <Card>
          <CardHeader>
            <CardTitle>Κορυφαίοι Προμηθευτές</CardTitle>
            <CardDescription>Κατανομή δαπανών ανά προμηθευτή</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analysis.topSuppliers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="supplierName" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Συνολική Δαπάνη']}
                />
                <Bar dataKey="totalSpent" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Κατάσταση Παραγγελιών</CardTitle>
            <CardDescription>Κατανομή κατάστασης αγορών</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percentage }) => `${name} (${percentage.toFixed(0)}%)`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Country Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Κορυφαίες Χώρες Προμηθευτών</CardTitle>
            <CardDescription>Αριθμός παραγγελιών ανά χώρα</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {countryData.map((country, index) => {
                const percentage = (country.count / purchases.length) * 100;
                return (
                  <div key={country.country} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {country.country}
                      </span>
                      <span className="font-medium">{country.count} παραγγελίες</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <div className="text-xs text-muted-foreground text-right">
                      {formatPercentage(percentage)}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quality Ratings */}
        <Card>
          <CardHeader>
            <CardTitle>Αξιολογήσεις Ποιότητας</CardTitle>
            <CardDescription>Κατανομή βαθμολογιών ποιότητας</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = qualityRatings[rating] || 0;
                const total = Object.values(qualityRatings).reduce((sum, c) => sum + c, 0);
                const percentage = total > 0 ? (count / total) * 100 : 0;
                
                return (
                  <div key={rating} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <span>{rating}</span>
                        <div className="flex text-yellow-400">
                          {[...Array(rating)].map((_, i) => (
                            <span key={i}>★</span>
                          ))}
                        </div>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Survival Rate Analysis */}
      {survivalRateData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ανάλυση Ποσοστού Επιβίωσης</CardTitle>
            <CardDescription>Ποσοστό επιβίωσης φυτών μετά τη φύτευση</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {survivalRateData.slice(0, 6).map((plant, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-sm">{plant.plantName}</h4>
                    <Badge 
                      variant={plant.survivalRate >= 80 ? "default" : 
                               plant.survivalRate >= 60 ? "secondary" : "destructive"}
                    >
                      {plant.survivalRate}%
                    </Badge>
                  </div>
                  <Progress value={plant.survivalRate} className="h-2 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Ποσότητα: {plant.quantity} φυτά
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supplier Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Απόδοση Προμηθευτών</CardTitle>
          <CardDescription>Λεπτομερή στοιχεία για κάθε προμηθευτή</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.topSuppliers.map((supplier, index) => (
              <div key={supplier.supplierName} className="p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">{supplier.supplierName}</h4>
                  <Badge variant="outline">#{index + 1}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Συνολικές Παραγγελίες</p>
                    <p className="font-medium">{supplier.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Συνολική Δαπάνη</p>
                    <p className="font-medium">{formatCurrency(supplier.totalSpent)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Μέσο Κόστος Παραγγελίας</p>
                    <p className="font-medium">
                      {formatCurrency(Math.round(supplier.totalSpent / supplier.totalOrders))}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}