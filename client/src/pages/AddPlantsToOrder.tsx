import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Package, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type PurchaseOrder, type InsertPurchasedPlant } from "@shared/schema";

// Schema for adding multiple plants
const plantSchema = z.object({
  plantName: z.string().min(1, "Plant name is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
  costPerUnit: z.number().positive("Cost per unit must be positive"),
  status: z.enum(["Excellent", "Good", "Fair"]),
});

const addPlantsSchema = z.object({
  plants: z.array(plantSchema).min(1, "At least one plant is required"),
});

type AddPlantsForm = z.infer<typeof addPlantsSchema>;

export default function AddPlantsToOrder() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch purchase order details
  const { data: purchaseOrder, isLoading } = useQuery<PurchaseOrder>({
    queryKey: ["/api/purchase-orders", id],
    enabled: !!id,
  });

  // Form setup
  const form = useForm<AddPlantsForm>({
    resolver: zodResolver(addPlantsSchema),
    defaultValues: {
      plants: [
        {
          plantName: "",
          quantity: 1,
          costPerUnit: 0,
          status: "Excellent",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "plants",
  });

  // Mutation for adding plants
  const addPlantsMutation = useMutation({
    mutationFn: async (plants: AddPlantsForm["plants"]) => {
      const promises = plants.map((plant) =>
        apiRequest(`/api/purchase-orders/${id}/plants`, "POST", {
          ...plant,
          costPerUnit: Math.round(plant.costPerUnit * 100), // Convert to cents
          purchaseOrderId: parseInt(id!),
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({
        title: "Success",
        description: "Plants added successfully to purchase order",
      });
      setLocation(`/purchase-orders/${id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add plants to purchase order",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddPlantsForm) => {
    addPlantsMutation.mutate(data.plants);
  };

  const addPlantRow = () => {
    append({
      plantName: "",
      quantity: 1,
      costPerUnit: 0,
      status: "Excellent",
    });
  };

  const calculateTotalCost = () => {
    const plants = form.watch("plants");
    return plants.reduce((total, plant) => {
      return total + (plant.quantity * plant.costPerUnit);
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading purchase order...</div>
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Purchase order not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation("/purchase-orders")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Plants to Order</h1>
          <p className="text-muted-foreground">
            Add plants to Purchase Order #{purchaseOrder.id} from {purchaseOrder.supplier}
          </p>
        </div>
      </div>

      {/* Purchase Order Summary */}
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
              <p className="text-lg font-semibold">{purchaseOrder.supplier}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Purchase Date</p>
              <p className="text-lg font-semibold">
                {new Date(purchaseOrder.purchaseDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Currency</p>
              <p className="text-lg font-semibold">{purchaseOrder.currency || "EUR"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plants Form */}
      <Card>
        <CardHeader>
          <CardTitle>Plants to Add</CardTitle>
          <CardDescription>
            Add the plants included in this purchase order with their details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <Card key={field.id} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">Plant #{index + 1}</h4>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => remove(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name={`plants.${index}.plantName`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plant Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Monstera Deliciosa" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`plants.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`plants.${index}.costPerUnit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cost per Unit ({purchaseOrder.currency || "EUR"})</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
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
                        name={`plants.${index}.status`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Condition Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Excellent">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="default">Excellent</Badge>
                                  </div>
                                </SelectItem>
                                <SelectItem value="Good">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary">Good</Badge>
                                  </div>
                                </SelectItem>
                                <SelectItem value="Fair">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">Fair</Badge>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Subtotal for this plant */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-medium">
                          {((form.watch(`plants.${index}.quantity`) || 0) * 
                            (form.watch(`plants.${index}.costPerUnit`) || 0)).toFixed(2)} {purchaseOrder.currency || "EUR"}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addPlantRow}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Plant
                </Button>

                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="text-2xl font-bold text-primary">
                    {calculateTotalCost().toFixed(2)} {purchaseOrder.currency || "EUR"}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/purchase-orders")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addPlantsMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {addPlantsMutation.isPending ? "Adding Plants..." : "Add Plants to Order"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}