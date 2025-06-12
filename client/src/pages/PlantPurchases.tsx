import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPlantPurchaseSchema, type PlantPurchase, type InsertPlantPurchase } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, TrendingUp, Calendar, Euro, AlertTriangle, CheckCircle, Truck, Sprout } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function PlantPurchases() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PlantPurchase | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: purchases = [], isLoading } = useQuery<PlantPurchase[]>({
    queryKey: ["/api/plant-purchases"],
  });

  const form = useForm({
    resolver: zodResolver(insertPlantPurchaseSchema),
    defaultValues: {
      supplierName: "",
      supplierCountry: "",
      plantName: "",
      scientificName: "",
      variety: "",
      quantity: 1,
      unitPrice: 100,
      totalCost: 100,
      currency: "EUR",
      purchaseDate: new Date().toISOString().split('T')[0],
      expectedDelivery: "",
      orderNumber: "",
      invoiceNumber: "",
      shippingCost: 0,
      customsDuty: 0,
      otherFees: 0,
      totalLandedCost: 100,
      status: "ordered",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertPlantPurchase) => apiRequest("/api/plant-purchases", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plant-purchases"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Επιτυχία",
        description: "Η αγορά φυτού καταχωρήθηκε επιτυχώς",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία καταχώρησης αγοράς",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/plant-purchases/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plant-purchases"] });
      toast({
        title: "Επιτυχία",
        description: "Η αγορά διαγράφηκε επιτυχώς",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία διαγραφής αγοράς",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertPlantPurchase) => {
    // Calculate total landed cost
    const shippingCost = data.shippingCost || 0;
    const customsDuty = data.customsDuty || 0;
    const otherFees = data.otherFees || 0;
    const totalLandedCost = data.totalCost + shippingCost + customsDuty + otherFees;

    createMutation.mutate({
      ...data,
      totalLandedCost,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ordered: { color: "bg-blue-100 text-blue-800", icon: Package, label: "Παραγγελία" },
      shipped: { color: "bg-yellow-100 text-yellow-800", icon: Truck, label: "Αποστολή" },
      delivered: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Παράδοση" },
      planted: { color: "bg-emerald-100 text-emerald-800", icon: Sprout, label: "Φύτευση" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ordered;
    const Icon = config.icon;
    
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Μη καθορισμένο";
    return format(new Date(dateString), "dd/MM/yyyy");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Αγορές Φυτών από Εξωτερικό</h1>
          <p className="text-muted-foreground">
            Διαχείριση και παρακολούθηση αγορών φυτών για προγραμματισμό και κοστολόγηση
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Νέα Αγορά
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Καταχώρηση Νέας Αγοράς Φυτού</DialogTitle>
              <DialogDescription>
                Συμπληρώστε τα στοιχεία της αγοράς για παρακολούθηση και κοστολόγηση
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="supplierName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Προμηθευτής</FormLabel>
                        <FormControl>
                          <Input placeholder="Όνομα προμηθευτή" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="supplierCountry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Χώρα Προμηθευτή</FormLabel>
                        <FormControl>
                          <Input placeholder="π.χ. Ολλανδία" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="plantName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Όνομα Φυτού</FormLabel>
                        <FormControl>
                          <Input placeholder="Κοινό όνομα φυτού" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="scientificName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Επιστημονικό Όνομα</FormLabel>
                        <FormControl>
                          <Input placeholder="π.χ. Acer saccharinum" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="variety"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ποικιλία (προαιρετικό)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ποικιλία φυτού" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ποσότητα</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="unitPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Τιμή Μονάδας (λεπτά)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="π.χ. 500 για €5.00"
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="totalCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Συνολικό Κόστος (λεπτά)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="purchaseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ημερομηνία Αγοράς</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="expectedDelivery"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Αναμενόμενη Παράδοση</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="orderNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Αριθμός Παραγγελίας</FormLabel>
                        <FormControl>
                          <Input placeholder="π.χ. ORD-2024-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Αριθμός Τιμολογίου</FormLabel>
                        <FormControl>
                          <Input placeholder="π.χ. INV-2024-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="shippingCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Κόστος Αποστολής (λεπτά)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="customsDuty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Τελωνειακά Τέλη (λεπτά)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="otherFees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Άλλα Τέλη (λεπτά)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Κατάσταση</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Επιλέξτε κατάσταση" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ordered">Παραγγελία</SelectItem>
                          <SelectItem value="shipped">Αποστολή</SelectItem>
                          <SelectItem value="delivered">Παράδοση</SelectItem>
                          <SelectItem value="planted">Φύτευση</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Σημειώσεις</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Πρόσθετες πληροφορίες..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Ακύρωση
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Αποθήκευση..." : "Αποθήκευση"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {purchases.map((purchase) => (
          <Card key={purchase.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{purchase.plantName}</CardTitle>
                  <CardDescription className="italic text-sm">
                    {purchase.scientificName}
                  </CardDescription>
                </div>
                {getStatusBadge(purchase.status)}
              </div>
              {purchase.variety && (
                <Badge variant="outline" className="w-fit">
                  {purchase.variety}
                </Badge>
              )}
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span>Ποσότητα: {purchase.quantity}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Euro className="w-4 h-4 text-muted-foreground" />
                  <span>{formatCurrency(purchase.totalLandedCost)}</span>
                </div>
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Προμηθευτής:</span>
                  <span className="font-medium">{purchase.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Χώρα:</span>
                  <span>{purchase.supplierCountry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ημ. Αγοράς:</span>
                  <span>{formatDate(purchase.purchaseDate)}</span>
                </div>
                {purchase.expectedDelivery && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Αναμ. Παράδοση:</span>
                    <span>{formatDate(purchase.expectedDelivery)}</span>
                  </div>
                )}
              </div>
              
              {purchase.qualityRating && (
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-muted-foreground">Αξιολόγηση:</span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <span 
                        key={i} 
                        className={i < purchase.qualityRating! ? "text-yellow-400" : "text-gray-300"}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPurchase(purchase)}
                >
                  Προβολή
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate(purchase.id)}
                  disabled={deleteMutation.isPending}
                >
                  Διαγραφή
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {purchases.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Δεν υπάρχουν αγορές</h3>
            <p className="text-muted-foreground mb-4">
              Ξεκινήστε να καταχωρείτε τις αγορές φυτών από το εξωτερικό
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Πρώτη Αγορά
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Purchase Details Dialog */}
      {selectedPurchase && (
        <Dialog open={!!selectedPurchase} onOpenChange={() => setSelectedPurchase(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedPurchase.plantName}</DialogTitle>
              <DialogDescription className="italic">
                {selectedPurchase.scientificName}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Στοιχεία Προμηθευτή</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Όνομα:</strong> {selectedPurchase.supplierName}</div>
                    <div><strong>Χώρα:</strong> {selectedPurchase.supplierCountry}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Οικονομικά Στοιχεία</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Τιμή Μονάδας:</strong> {formatCurrency(selectedPurchase.unitPrice)}</div>
                    <div><strong>Συνολικό Κόστος:</strong> {formatCurrency(selectedPurchase.totalCost)}</div>
                    <div><strong>Κόστος Αποστολής:</strong> {formatCurrency(selectedPurchase.shippingCost || 0)}</div>
                    <div><strong>Τελωνειακά:</strong> {formatCurrency(selectedPurchase.customsDuty || 0)}</div>
                    <div className="font-semibold border-t pt-1">
                      <strong>Συνολικό Κόστος:</strong> {formatCurrency(selectedPurchase.totalLandedCost)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Χρονοδιάγραμμα</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <strong>Αγορά:</strong><br />
                    {formatDate(selectedPurchase.purchaseDate)}
                  </div>
                  {selectedPurchase.expectedDelivery && (
                    <div>
                      <strong>Αναμενόμενη Παράδοση:</strong><br />
                      {formatDate(selectedPurchase.expectedDelivery)}
                    </div>
                  )}
                  {selectedPurchase.actualDelivery && (
                    <div>
                      <strong>Πραγματική Παράδοση:</strong><br />
                      {formatDate(selectedPurchase.actualDelivery)}
                    </div>
                  )}
                </div>
              </div>
              
              {selectedPurchase.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Σημειώσεις</h4>
                  <p className="text-sm text-muted-foreground">{selectedPurchase.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}