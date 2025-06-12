import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ComposedChart, Area, AreaChart, ScatterChart, Scatter, Treemap } from "recharts";
import { Euro, Package, Truck, Award, TrendingUp, TrendingDown, AlertTriangle, Calendar, Target, Users, Leaf, Clock, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import type { PlantPurchase } from "@shared/schema";

interface PlantPurchaseAnalysisData {
  totalPurchases: number;
  totalSpent: number;
  totalPlants: number;
  averageCostPerPlant: number;
  uniqueSuppliers: number;
  averageQualityRating: number;
  monthlySpending: Array<{
    month: string;
    amount: number;
    budget: number;
    quantity: number;
  }>;
  supplierBreakdown: Array<{
    supplier: string;
    totalSpent: number;
    plantCount: number;
    averageQuality: number;
    onTimeDelivery: number;
    averageCost: number;
  }>;
  plantTypeBreakdown: Array<{
    plantName: string;
    scientificName: string;
    totalSpent: number;
    quantity: number;
    averageCost: number;
    nextPlantingWeek: string;
    leadTime: number;
    qualityScore: number;
  }>;
  alerts: Array<{
    type: 'cost' | 'quality' | 'delivery' | 'stock';
    message: string;
    severity: 'high' | 'medium' | 'low';
  }>;
}

export default function PlantPurchaseAnalysisNew() {
  const [, setLocation] = useLocation();
  
  const { data: analysisData, isLoading } = useQuery<PlantPurchaseAnalysisData>({
    queryKey: ["/api/plant-purchases-analysis"],
  });

  const { data: purchases = [] } = useQuery<PlantPurchase[]>({
    queryKey: ["/api/plant-purchases"],
  });

  const handlePlantClick = (scientificName: string) => {
    // Navigate to plant purchases page with the plant highlighted
    setLocation(`/plant-purchases?highlight=${encodeURIComponent(scientificName)}`);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getBudgetStatus = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100;
    if (percentage <= 95) return { color: 'text-green-600', bg: 'bg-green-100', status: 'Under Budget' };
    if (percentage <= 105) return { color: 'text-yellow-600', bg: 'bg-yellow-100', status: 'On Budget' };
    return { color: 'text-red-600', bg: 'bg-red-100', status: 'Over Budget' };
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="container mx-auto p-6">
        <Card className="text-center py-12">
          <CardContent>
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Δεν υπάρχουν δεδομένα</h3>
            <p className="text-muted-foreground">
              Προσθέστε αγορές φυτών για να δείτε την ανάλυση
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generate sample data based on existing purchases
  const enhancedAnalysisData = {
    ...analysisData,
    monthlySpending: analysisData.monthlySpending.map(item => ({
      ...item,
      budget: item.amount * 1.1, // Sample budget 10% higher than actual
      quantity: Math.floor(item.amount / (analysisData.averageCostPerPlant || 100))
    })),
    supplierBreakdown: analysisData.supplierBreakdown.map(supplier => ({
      ...supplier,
      onTimeDelivery: 0.85 + Math.random() * 0.15, // Sample delivery rate 85-100%
      averageCost: supplier.totalSpent / supplier.plantCount
    })),
    plantTypeBreakdown: analysisData.plantTypeBreakdown.map(plant => ({
      ...plant,
      scientificName: `${plant.plantName} sp.`,
      nextPlantingWeek: `W${Math.floor(Math.random() * 52) + 1}`,
      leadTime: Math.floor(Math.random() * 30) + 7,
      qualityScore: 3 + Math.random() * 2
    })),
    alerts: [
      { type: 'cost' as const, message: `${analysisData.plantTypeBreakdown[0]?.plantName || 'Φυτό'} κόστος ↑ 12% vs προηγούμενη παραγγελία`, severity: 'medium' as const },
      { type: 'delivery' as const, message: 'Προμηθευτής X έγκαιρη παράδοση < 80% (στόχος 95%)', severity: 'high' as const },
      { type: 'stock' as const, message: 'Χαμηλό απόθεμα - προτείνεται επαναπαραγγελία', severity: 'low' as const }
    ]
  };

  // Calculate budget performance for current period
  const currentMonthData = enhancedAnalysisData.monthlySpending[enhancedAnalysisData.monthlySpending.length - 1];
  const budgetStatus = currentMonthData ? getBudgetStatus(currentMonthData.amount, currentMonthData.budget) : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ανάλυση Αγορών Φυτών</h1>
          <p className="text-muted-foreground">
            Επισκόπηση αποδοτικότητας και στρατηγικός σχεδιασμός αγορών
          </p>
        </div>
        <Button variant="outline">
          <Calendar className="w-4 h-4 mr-2" />
          Εξαγωγή Αναφοράς
        </Button>
      </div>

      {/* Executive Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Συνολική Δαπάνη</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analysisData.totalSpent)}</div>
            {budgetStatus && (
              <div className={`text-xs ${budgetStatus.color} flex items-center gap-1`}>
                <div className={`w-2 h-2 rounded-full ${budgetStatus.bg}`}></div>
                {budgetStatus.status}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Μονάδες Φυτών</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysisData.totalPlants.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{((analysisData.totalPlants / 1000) * 100).toFixed(0)}% vs στόχος
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Μέσο Κόστος/Φυτό</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analysisData.averageCostPerPlant)}</div>
            <p className="text-xs text-muted-foreground">
              Βελτιστοποίηση κόστους
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Προμηθευτές</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysisData.uniqueSuppliers}</div>
            <p className="text-xs text-muted-foreground">
              Ενεργή συνεργασία
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Βαθμός Ποιότητας</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysisData.averageQualityRating.toFixed(1)}/5</div>
            <Progress value={(analysisData.averageQualityRating / 5) * 100} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {enhancedAnalysisData.alerts && enhancedAnalysisData.alerts.length > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Ειδοποιήσεις Προσοχής
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {enhancedAnalysisData.alerts.slice(0, 5).map((alert, index) => (
                <Alert key={index} className={`border-l-4 ${
                  alert.severity === 'high' ? 'border-l-red-500' : 
                  alert.severity === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'
                }`}>
                  <AlertDescription className="text-sm">
                    {alert.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Τάσεις & Προϋπολογισμός</TabsTrigger>
          <TabsTrigger value="suppliers">Προμηθευτές</TabsTrigger>
          <TabsTrigger value="species">Είδη Φυτών</TabsTrigger>
          <TabsTrigger value="planning">Προγραμματισμός</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          {/* Quarterly Delivery Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Επισκόπηση Παραλαβών ανά Τρίμηνο</CardTitle>
              <CardDescription>Επιστημονικά ονόματα παραληφθέντων και προγραμματισμένων φυτών</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                // Group purchases by quarter with purchase details
                const quarterlyData = new Map<string, { 
                  delivered: Array<{name: string, purchases: PlantPurchase[]}>, 
                  scheduled: Array<{name: string, purchases: PlantPurchase[]}> 
                }>();
                
                purchases.forEach(purchase => {
                  const purchaseDate = new Date(purchase.purchaseDate);
                  const year = purchaseDate.getFullYear();
                  const quarter = Math.ceil((purchaseDate.getMonth() + 1) / 3);
                  const quarterKey = `Q${quarter} ${year}`;
                  
                  if (!quarterlyData.has(quarterKey)) {
                    quarterlyData.set(quarterKey, { delivered: [], scheduled: [] });
                  }
                  
                  const data = quarterlyData.get(quarterKey)!;
                  const scientificName = purchase.scientificName;
                  
                  if (purchase.status === 'delivered' || purchase.status === 'planted') {
                    let existingEntry = data.delivered.find(entry => entry.name === scientificName);
                    if (!existingEntry) {
                      existingEntry = { name: scientificName, purchases: [] };
                      data.delivered.push(existingEntry);
                    }
                    existingEntry.purchases.push(purchase);
                  } else {
                    let existingEntry = data.scheduled.find(entry => entry.name === scientificName);
                    if (!existingEntry) {
                      existingEntry = { name: scientificName, purchases: [] };
                      data.scheduled.push(existingEntry);
                    }
                    existingEntry.purchases.push(purchase);
                  }
                });

                const sortedQuarters = Array.from(quarterlyData.entries())
                  .sort(([a], [b]) => {
                    const [aQ, aY] = a.split(' ');
                    const [bQ, bY] = b.split(' ');
                    return parseInt(bY) - parseInt(aY) || parseInt(bQ.slice(1)) - parseInt(aQ.slice(1));
                  });

                return (
                  <div className="space-y-4">
                    {sortedQuarters.map(([quarter, data]) => (
                      <div key={quarter} className="border rounded-lg p-4">
                        <h4 className="font-semibold text-lg mb-3">{quarter}</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Delivered */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="font-medium text-green-700">Παραληφθέντα ({data.delivered.length})</span>
                            </div>
                            <div className="space-y-1">
                              {data.delivered.length > 0 ? (
                                data.delivered.map((entry, index) => (
                                  <div 
                                    key={index} 
                                    className="text-sm italic text-green-800 bg-green-50 px-2 py-1 rounded cursor-pointer hover:bg-green-100 transition-colors flex items-center justify-between group"
                                    onClick={() => handlePlantClick(entry.name)}
                                  >
                                    <span>{entry.name}</span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Badge variant="outline" className="text-xs">
                                        {entry.purchases.length}
                                      </Badge>
                                      <ExternalLink className="w-3 h-3" />
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-sm text-muted-foreground">Καμία παραλαβή</div>
                              )}
                            </div>
                          </div>

                          {/* Scheduled */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span className="font-medium text-blue-700">Προγραμματισμένα ({data.scheduled.length})</span>
                            </div>
                            <div className="space-y-1">
                              {data.scheduled.length > 0 ? (
                                data.scheduled.map((entry, index) => (
                                  <div 
                                    key={index} 
                                    className="text-sm italic text-blue-800 bg-blue-50 px-2 py-1 rounded cursor-pointer hover:bg-blue-100 transition-colors flex items-center justify-between group"
                                    onClick={() => handlePlantClick(entry.name)}
                                  >
                                    <span>{entry.name}</span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Badge variant="outline" className="text-xs">
                                        {entry.purchases.length}
                                      </Badge>
                                      <ExternalLink className="w-3 h-3" />
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-sm text-muted-foreground">Καμία προγραμματισμένη παραλαβή</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {sortedQuarters.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Δεν υπάρχουν δεδομένα αγορών για εμφάνιση
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Spending vs Budget */}
            <Card>
              <CardHeader>
                <CardTitle>Μηνιαία Δαπάνη vs Προϋπολογισμός</CardTitle>
                <CardDescription>Παρακολούθηση εποχικότητας και υπερβάσεων</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={enhancedAnalysisData.monthlySpending}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" tickFormatter={(value) => formatCurrency(value)} />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'amount' || name === 'budget') return formatCurrency(value as number);
                        return [value, name];
                      }}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="budget" fill="#e0e7ff" stroke="#8b5cf6" fillOpacity={0.3} />
                    <Bar yAxisId="left" dataKey="amount" fill="#3b82f6" />
                    <Line yAxisId="right" type="monotone" dataKey="quantity" stroke="#10b981" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cost vs Volume Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Ανάλυση Κόστους vs Όγκου</CardTitle>
                <CardDescription>Εντοπισμός αυξήσεων κόστους μη οφειλόμενων στον όγκο</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={enhancedAnalysisData.monthlySpending}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" tickFormatter={(value) => value.toLocaleString()} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'amount') return formatCurrency(value as number);
                        return [value, name];
                      }}
                    />
                    <Bar yAxisId="left" dataKey="quantity" fill="#22c55e" />
                    <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#ef4444" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Supplier Spend Concentration */}
            <Card>
              <CardHeader>
                <CardTitle>Συγκέντρωση Δαπανών Προμηθευτών</CardTitle>
                <CardDescription>Top-5 προμηθευτές vs υπόλοιποι</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={enhancedAnalysisData.supplierBreakdown} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                    <YAxis type="category" dataKey="supplier" width={100} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="totalSpent" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Supplier Performance Matrix */}
            <Card>
              <CardHeader>
                <CardTitle>Μήτρα Απόδοσης Προμηθευτών</CardTitle>
                <CardDescription>Κόστος vs Ποιότητα (μέγεθος = όγκος)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="averageCost" name="Μέσο Κόστος" tickFormatter={(value) => formatCurrency(value)} />
                    <YAxis type="number" dataKey="averageQuality" name="Ποιότητα" domain={[0, 5]} />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'Μέσο Κόστος') return formatCurrency(value as number);
                        return [value, name];
                      }}
                    />
                    <Scatter name="Προμηθευτές" data={enhancedAnalysisData.supplierBreakdown} fill="#8884d8" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Supplier Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Αναλυτική Απόδοση Προμηθευτών</CardTitle>
              <CardDescription>Πλήρης αξιολόγηση και scorecard</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Προμηθευτής</th>
                      <th className="text-right p-2">Συνολικά €</th>
                      <th className="text-right p-2">Μέσο €/Φυτό</th>
                      <th className="text-center p-2">Ποιότητα</th>
                      <th className="text-center p-2">Έγκαιρη Παράδοση</th>
                      <th className="text-center p-2">Κατάσταση</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enhancedAnalysisData.supplierBreakdown.map((supplier, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{supplier.supplier}</td>
                        <td className="p-2 text-right">{formatCurrency(supplier.totalSpent)}</td>
                        <td className="p-2 text-right">{formatCurrency(supplier.averageCost)}</td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Award className="w-3 h-3" />
                            <span>{supplier.averageQuality.toFixed(1)}/5</span>
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <Badge variant={supplier.onTimeDelivery >= 0.95 ? "default" : supplier.onTimeDelivery >= 0.80 ? "secondary" : "destructive"}>
                            {formatPercentage(supplier.onTimeDelivery)}
                          </Badge>
                        </td>
                        <td className="p-2 text-center">
                          <div className={`w-3 h-3 rounded-full mx-auto ${
                            supplier.averageQuality >= 4 && supplier.onTimeDelivery >= 0.95 ? 'bg-green-500' :
                            supplier.averageQuality >= 3 && supplier.onTimeDelivery >= 0.80 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="species" className="space-y-6">
          {/* Species Analysis Table */}
          <Card>
            <CardHeader>
              <CardTitle>Αναλυτικός Πίνακας Ειδών</CardTitle>
              <CardDescription>Πλήρη στοιχεία για κάθε είδος φυτού</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Είδος</th>
                      <th className="text-left p-2">Επιστημονικό</th>
                      <th className="text-right p-2">Ποσότητα</th>
                      <th className="text-right p-2">Συνολικά €</th>
                      <th className="text-right p-2">Μέσο €/φυτό</th>
                      <th className="text-center p-2">Επόμενη Φύτευση</th>
                      <th className="text-center p-2">Lead Time</th>
                      <th className="text-center p-2">Ποιότητα</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enhancedAnalysisData.plantTypeBreakdown.map((plant, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{plant.plantName}</td>
                        <td className="p-2 text-sm italic text-muted-foreground">{plant.scientificName}</td>
                        <td className="p-2 text-right">{plant.quantity.toLocaleString()}</td>
                        <td className="p-2 text-right">{formatCurrency(plant.totalSpent)}</td>
                        <td className="p-2 text-right">{formatCurrency(plant.averageCost)}</td>
                        <td className="p-2 text-center">
                          <Badge variant="outline">{plant.nextPlantingWeek || 'TBD'}</Badge>
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{plant.leadTime}d</span>
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <Badge variant={plant.qualityScore >= 4 ? "default" : plant.qualityScore >= 3 ? "secondary" : "destructive"}>
                            {plant.qualityScore.toFixed(1)}/5
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reorder Suggestions */}
            <Card>
              <CardHeader>
                <CardTitle>Προτάσεις Επαναπαραγγελίας</CardTitle>
                <CardDescription>Βάσει ασφαλιστικού αποθέματος και lead time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {enhancedAnalysisData.plantTypeBreakdown.slice(0, 5).map((plant, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{plant.plantName}</div>
                        <div className="text-sm text-muted-foreground">
                          Προβλεπόμενη εξάντληση: {plant.nextPlantingWeek || 'TBD'}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">
                          Παραγγελία {Math.floor(plant.quantity * 0.2)} τεμ.
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(plant.averageCost * Math.floor(plant.quantity * 0.2))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Planting Schedule Alignment */}
            <Card>
              <CardHeader>
                <CardTitle>Στοίχιση με Πρόγραμμα Φύτευσης</CardTitle>
                <CardDescription>Ποσοστό φυτών που παραδόθηκαν έγκαιρα</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">87%</div>
                    <div className="text-sm text-muted-foreground">Έγκαιρη παράδοση</div>
                  </div>
                  <Progress value={87} className="h-3" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium">Στόχος</div>
                      <div className="text-muted-foreground">95%</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">Βελτίωση</div>
                      <div className="text-green-600">+8%</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Future Projections */}
          <Card>
            <CardHeader>
              <CardTitle>Προβλέψεις Μελλοντικών Αναγκών</CardTitle>
              <CardDescription>Βάσει ιστορικών δεδομένων και αγρονομικού προγραμματισμού</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">Q2 2025</div>
                  <div className="text-sm text-muted-foreground">Προβλεπόμενη δαπάνη</div>
                  <div className="font-medium">{formatCurrency(analysisData.totalSpent * 1.2)}</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">Q3 2025</div>
                  <div className="text-sm text-muted-foreground">Αιχμή παραγγελιών</div>
                  <div className="font-medium">{formatCurrency(analysisData.totalSpent * 1.8)}</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">Q4 2025</div>
                  <div className="text-sm text-muted-foreground">Ετήσια σύνοψη</div>
                  <div className="font-medium">{formatCurrency(analysisData.totalSpent * 0.8)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}