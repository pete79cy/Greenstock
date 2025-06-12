import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Euro, Calculator, Calendar, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type PurchaseView, type PurchasedPlant, type UpdatePurchasedPlantCosts } from "@shared/schema";

// Form schema for updating plant costs
const updateCostsSchema = z.object({
  potCost: z.number().min(0, "Pot cost must be positive").optional(),
  soilCost: z.number().min(0, "Soil cost must be positive").optional(),
  nurseryMonthlyCost: z.number().min(0, "Nursery monthly cost must be positive").optional(),
});

type UpdateCostsForm = z.infer<typeof updateCostsSchema>;

// Helper function for cost calculation (converting cents to euros for display)
const calculateTotalCurrentCost = (plant: PurchasedPlant): number => {
  const initialCost = (plant.costPerUnit || 0) / 100;
  const potCost = (plant.potCost || 0) / 100;
  const soilCost = (plant.soilCost || 0) / 100;

  let nurseryCost = 0;
  if (plant.pottedDate && plant.nurseryMonthlyCost) {
    const pottedDate = new Date(plant.pottedDate);
    const today = new Date();
    
    // Calculate full months elapsed
    const monthsElapsed = (today.getFullYear() - pottedDate.getFullYear()) * 12 + (today.getMonth() - pottedDate.getMonth());
    
    nurseryCost = monthsElapsed > 0 ? monthsElapsed * ((plant.nurseryMonthlyCost || 0) / 100) : 0;
  }

  return initialCost + potCost + soilCost + nurseryCost;
};

export default function PurchaseCostManager() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlant, setSelectedPlant] = useState<PurchasedPlant | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch purchase data
  const { data: purchase, isLoading, error } = useQuery<PurchaseView>({
    queryKey: ["/api/purchase-orders", id],
    enabled: !!id,
  });

  // Form setup for cost updates
  const form = useForm<UpdateCostsForm>({
    resolver: zodResolver(updateCostsSchema),
    defaultValues: {
      potCost: 0,
      soilCost: 0,
      nurseryMonthlyCost: 0,
    },
  });

  // Mutation for updating plant costs
  const updateCostsMutation = useMutation({
    mutationFn: (data: { plantId: number; costs: UpdateCostsForm }) =>
      apiRequest(`/api/purchased-plants/${data.plantId}/update-costs`, "PUT", data.costs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders", id] });
      setIsModalOpen(false);
      setSelectedPlant(null);
      toast({
        title: "Success",
        description: "Plant costs updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update plant costs",
        variant: "destructive",
      });
    },
  });

  // Handle opening the modal and setting initial form values
  const handleOpenModal = (plant: PurchasedPlant) => {
    setSelectedPlant(plant);
    form.reset({
      potCost: (plant.potCost || 0) / 100, // Convert cents to euros
      soilCost: (plant.soilCost || 0) / 100,
      nurseryMonthlyCost: (plant.nurseryMonthlyCost || 0) / 100,
    });
    setIsModalOpen(true);
  };

  // Handle form submission
  const onSubmit = (data: UpdateCostsForm) => {
    if (!selectedPlant) return;
    updateCostsMutation.mutate({
      plantId: selectedPlant.id,
      costs: data,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading purchase details...</div>
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Failed to load purchase data</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Cost Manager</h1>
          <p className="text-muted-foreground">
            Manage and track costs for Purchase Order #{purchase.id}
          </p>
        </div>
      </div>

      {/* Purchase Order Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Purchase Order Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Supplier</p>
              <p className="text-lg font-semibold">{purchase.supplier}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Purchase Date</p>
              <p className="text-lg font-semibold">
                {new Date(purchase.purchaseDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Plants</p>
              <p className="text-lg font-semibold">{purchase.plants?.length || 0} species</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Plant Cost Management</CardTitle>
          <CardDescription>
            Update additional costs for each plant to track total investment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Plant Name</th>
                  <th className="text-left p-4 font-medium">Quantity</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-right p-4 font-medium">Initial Cost</th>
                  <th className="text-right p-4 font-medium text-blue-600">Total Current Cost</th>
                  <th className="text-center p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(purchase.plants || []).map((plant) => (
                  <tr key={plant.id} className="border-b hover:bg-muted/50">
                    <td className="p-4 font-medium">{plant.plantName}</td>
                    <td className="p-4">{plant.quantity}</td>
                    <td className="p-4">
                      <Badge 
                        variant={
                          plant.status === "Excellent" ? "default" :
                          plant.status === "Good" ? "secondary" : "outline"
                        }
                      >
                        {plant.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      €{((plant.costPerUnit || 0) / 100).toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-bold text-blue-600">
                      €{calculateTotalCurrentCost(plant).toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <Button
                        onClick={() => handleOpenModal(plant)}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Calculator className="h-4 w-4" />
                        Update Costs
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Update Costs Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Update Costs for {selectedPlant?.plantName}
            </DialogTitle>
            <DialogDescription>
              Add additional costs to track the total investment in this plant.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="potCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pot Cost (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="soilCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Soil Cost (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nurseryMonthlyCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nursery Monthly Cost (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateCostsMutation.isPending}
                >
                  {updateCostsMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}