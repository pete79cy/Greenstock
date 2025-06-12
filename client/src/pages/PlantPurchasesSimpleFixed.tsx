import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { PlantPurchase } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, Euro, CheckCircle, Truck, Sprout, Edit, Calendar, MapPin, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function PlantPurchasesSimpleFixed() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PlantPurchase | null>(null);
  const [formData, setFormData] = useState({
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
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: purchases = [], isLoading } = useQuery<PlantPurchase[]>({
    queryKey: ["/api/plant-purchases"],
  });

  const resetForm = () => {
    setIsDialogOpen(false);
    setEditingPurchase(null);
    setFormData({
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
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      console.log("Submitting plant purchase:", data);
      return apiRequest("/api/plant-purchases", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plant-purchases"] });
      resetForm();
      toast({
        title: "Επιτυχία",
        description: "Η αγορά φυτού καταχωρήθηκε επιτυχώς",
      });
    },
    onError: (error: any) => {
      console.error("Error creating plant purchase:", error);
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία καταχώρησης αγοράς",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => {
      console.log("Updating plant purchase:", id, data);
      return apiRequest(`/api/plant-purchases/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plant-purchases"] });
      resetForm();
      toast({
        title: "Επιτυχία",
        description: "Η αγορά ενημερώθηκε επιτυχώς",
      });
    },
    onError: (error: any) => {
      console.error("Error updating plant purchase:", error);
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία ενημέρωσης αγοράς",
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
  });

  const handleEdit = (purchase: PlantPurchase) => {
    setEditingPurchase(purchase);
    setFormData({
      supplierName: purchase.supplierName,
      supplierCountry: purchase.supplierCountry,
      plantName: purchase.plantName,
      scientificName: purchase.scientificName,
      variety: purchase.variety || "",
      quantity: purchase.quantity,
      unitPrice: purchase.unitPrice,
      totalCost: purchase.totalCost,
      currency: purchase.currency,
      purchaseDate: purchase.purchaseDate,
      expectedDelivery: purchase.expectedDelivery || "",
      orderNumber: purchase.orderNumber || "",
      invoiceNumber: purchase.invoiceNumber || "",
      shippingCost: purchase.shippingCost || 0,
      customsDuty: purchase.customsDuty || 0,
      otherFees: purchase.otherFees || 0,
      totalLandedCost: purchase.totalLandedCost,
      status: purchase.status,
      notes: purchase.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleQuickStatusUpdate = (purchase: PlantPurchase, newStatus: string) => {
    const updateData = {
      ...purchase,
      status: newStatus,
      ...(newStatus === "delivered" && !purchase.actualDelivery ? { actualDelivery: new Date().toISOString().split('T')[0] } : {})
    };
    
    updateMutation.mutate({ id: purchase.id, data: updateData });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate total landed cost
    const totalLandedCost = formData.totalCost + formData.shippingCost + formData.customsDuty + formData.otherFees;
    
    const submitData = {
      ...formData,
      totalLandedCost,
    };
    
    console.log("Form data before submission:", submitData);
    
    if (editingPurchase) {
      updateMutation.mutate({ id: editingPurchase.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      
      // Auto-calculate total cost when unit price or quantity changes
      if (field === 'unitPrice' || field === 'quantity') {
        const unitPrice = field === 'unitPrice' ? value : prev.unitPrice;
        const quantity = field === 'quantity' ? value : prev.quantity;
        newData.totalCost = unitPrice * quantity;
        
        // Also update total landed cost
        newData.totalLandedCost = newData.totalCost + prev.shippingCost + prev.customsDuty + prev.otherFees;
      }
      
      // Auto-calculate total landed cost when fees change
      if (field === 'shippingCost' || field === 'customsDuty' || field === 'otherFees' || field === 'totalCost') {
        const totalCost = field === 'totalCost' ? value : newData.totalCost;
        const shippingCost = field === 'shippingCost' ? value : prev.shippingCost;
        const customsDuty = field === 'customsDuty' ? value : prev.customsDuty;
        const otherFees = field === 'otherFees' ? value : prev.otherFees;
        newData.totalLandedCost = totalCost + shippingCost + customsDuty + otherFees;
      }
      
      return newData;
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

  const getStatusActions = (purchase: PlantPurchase) => {
    const currentStatus = purchase.status;
    const actions = [];

    if (currentStatus === "ordered") {
      actions.push(
        <Button 
          key="ship" 
          size="sm" 
          variant="outline" 
          onClick={() => handleQuickStatusUpdate(purchase, "shipped")}
          className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
        >
          <Truck className="w-3 h-3 mr-1" />
          Αποστολή
        </Button>
      );
    }

    if (currentStatus === "shipped" || currentStatus === "ordered") {
      actions.push(
        <Button 
          key="deliver" 
          size="sm" 
          variant="outline" 
          onClick={() => handleQuickStatusUpdate(purchase, "delivered")}
          className="text-green-600 border-green-200 hover:bg-green-50"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          Παράδοση
        </Button>
      );
    }

    if (currentStatus === "delivered") {
      actions.push(
        <Button 
          key="plant" 
          size="sm" 
          variant="outline" 
          onClick={() => handleQuickStatusUpdate(purchase, "planted")}
          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
        >
          <Sprout className="w-3 h-3 mr-1" />
          Φύτευση
        </Button>
      );
    }

    return actions;
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
            <Button onClick={() => setEditingPurchase(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Νέα Αγορά
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPurchase ? "Επεξεργασία Αγοράς" : "Καταχώρηση Νέας Αγοράς Φυτού"}
              </DialogTitle>
              <DialogDescription>
                {editingPurchase 
                  ? "Ενημερώστε τα στοιχεία της αγοράς και την κατάσταση παράδοσης"
                  : "Συμπληρώστε τα στοιχεία της αγοράς για παρακολούθηση και κοστολόγηση"
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplierName">Προμηθευτής</Label>
                  <Input
                    id="supplierName"
                    placeholder="Όνομα προμηθευτή"
                    value={formData.supplierName}
                    onChange={(e) => handleInputChange('supplierName', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="supplierCountry">Χώρα Προμηθευτή</Label>
                  <Input
                    id="supplierCountry"
                    placeholder="π.χ. Ολλανδία"
                    value={formData.supplierCountry}
                    onChange={(e) => handleInputChange('supplierCountry', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="plantName">Όνομα Φυτού</Label>
                  <Input
                    id="plantName"
                    placeholder="Κοινό όνομα φυτού"
                    value={formData.plantName}
                    onChange={(e) => handleInputChange('plantName', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="scientificName">Επιστημονικό Όνομα</Label>
                  <Input
                    id="scientificName"
                    placeholder="π.χ. Acer saccharinum"
                    value={formData.scientificName}
                    onChange={(e) => handleInputChange('scientificName', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="variety">Ποικιλία (προαιρετικό)</Label>
                <Input
                  id="variety"
                  placeholder="Ποικιλία φυτού"
                  value={formData.variety}
                  onChange={(e) => handleInputChange('variety', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quantity">Ποσότητα</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', parseInt(e.target.value))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="unitPrice">Τιμή Μονάδας (λεπτά)</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    min="0"
                    placeholder="π.χ. 500 για €5.00"
                    value={formData.unitPrice}
                    onChange={(e) => handleInputChange('unitPrice', parseInt(e.target.value))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="totalCost">Συνολικό Κόστος (λεπτά) - Αυτόματος Υπολογισμός</Label>
                  <Input
                    id="totalCost"
                    type="number"
                    value={formData.totalCost}
                    readOnly
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(formData.totalCost)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaseDate">Ημερομηνία Αγοράς</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="expectedDelivery">Αναμενόμενη Παράδοση</Label>
                  <Input
                    id="expectedDelivery"
                    type="date"
                    value={formData.expectedDelivery}
                    onChange={(e) => handleInputChange('expectedDelivery', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orderNumber">Αριθμός Παραγγελίας</Label>
                  <Input
                    id="orderNumber"
                    placeholder="π.χ. ORD-2024-001"
                    value={formData.orderNumber}
                    onChange={(e) => handleInputChange('orderNumber', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="invoiceNumber">Αριθμός Τιμολογίου</Label>
                  <Input
                    id="invoiceNumber"
                    placeholder="π.χ. INV-2024-001"
                    value={formData.invoiceNumber}
                    onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="shippingCost">Κόστος Αποστολής (λεπτά)</Label>
                  <Input
                    id="shippingCost"
                    type="number"
                    min="0"
                    value={formData.shippingCost}
                    onChange={(e) => handleInputChange('shippingCost', parseInt(e.target.value) || 0)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="customsDuty">Τελωνειακά Τέλη (λεπτά)</Label>
                  <Input
                    id="customsDuty"
                    type="number"
                    min="0"
                    value={formData.customsDuty}
                    onChange={(e) => handleInputChange('customsDuty', parseInt(e.target.value) || 0)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="otherFees">Άλλα Τέλη (λεπτά)</Label>
                  <Input
                    id="otherFees"
                    type="number"
                    min="0"
                    value={formData.otherFees}
                    onChange={(e) => handleInputChange('otherFees', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="totalLandedCost">Συνολικό Τελικό Κόστος - Αυτόματος Υπολογισμός</Label>
                <Input
                  id="totalLandedCost"
                  type="number"
                  value={formData.totalLandedCost}
                  readOnly
                  className="bg-green-50 font-semibold"
                />
                <p className="text-sm font-medium text-green-700 mt-1">
                  {formatCurrency(formData.totalLandedCost)} (Τελικό κόστος με όλα τα τέλη)
                </p>
              </div>

              <div>
                <Label htmlFor="status">Κατάσταση</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε κατάσταση" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ordered">Παραγγελία</SelectItem>
                    <SelectItem value="shipped">Αποστολή</SelectItem>
                    <SelectItem value="delivered">Παράδοση</SelectItem>
                    <SelectItem value="planted">Φύτευση</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Σημειώσεις</Label>
                <Textarea
                  id="notes"
                  placeholder="Πρόσθετες πληροφορίες..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                >
                  Ακύρωση
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Αποθήκευση..." : editingPurchase ? "Ενημέρωση" : "Αποθήκευση"}
                </Button>
              </div>
            </form>
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
            
            <CardContent className="space-y-4">
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

              <Separator />

              {/* Status Progress Actions */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Ενέργειες Κατάστασης:</p>
                <div className="flex flex-wrap gap-2">
                  {getStatusActions(purchase)}
                </div>
              </div>

              <Separator />
              
              <div className="flex justify-between gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(purchase)}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Επεξεργασία
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate(purchase.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
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
    </div>
  );
}