import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertPlantSchema, insertPlantBaseSchema, insertPlantInventorySchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plant, PlantBase, PlantInventory } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Info } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface PlantModalProps {
  isOpen: boolean;
  onClose: () => void;
  plant: Plant | null;
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 20 }, (_, i) => currentYear - i);

// Enhanced schema for plant details with inventory entries
const inventoryEntrySchema = z.object({
  id: z.number().optional(),
  plantingYear: z.coerce.number().int().min(2000, "Year must be 2000 or later").max(currentYear, `Year cannot be after ${currentYear}`),
  quantity: z.coerce.number().int().min(0, "Quantity must be 0 or greater"),
  location: z.string().optional(),
  notes: z.string().optional(),
});

const plantFormSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  scientificName: z.string().min(2, "Scientific name must be at least 2 characters"),
  description: z.string().optional(),
  inventoryEntries: z.array(inventoryEntrySchema).min(1, "Add at least one inventory entry")
});

export default function PlantModal({ isOpen, onClose, plant }: PlantModalProps) {
  const { toast } = useToast();
  const isEditMode = !!plant;
  const [activeTab, setActiveTab] = useState("details");
  
  // Until we implement the new database schema, we'll adapt the old format
  const form = useForm<z.infer<typeof plantFormSchema>>({
    resolver: zodResolver(plantFormSchema),
    defaultValues: {
      id: plant?.id,
      name: plant?.name || "",
      scientificName: plant?.scientificName || "",
      description: "",
      inventoryEntries: plant 
        ? [{ 
            id: plant.id,
            plantingYear: plant.plantingYear, 
            quantity: plant.quantity,
            location: "",
            notes: ""
          }] 
        : [{ 
            plantingYear: currentYear, 
            quantity: 0,
            location: "",
            notes: ""
          }]
    }
  });
  
  // Set up field array for inventory entries
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "inventoryEntries",
  });
  
  // Monitor form values
  const watchInventoryEntries = form.watch("inventoryEntries");
  
  const addInventoryEntry = () => {
    append({ 
      plantingYear: currentYear,
      quantity: 0,
      location: "",
      notes: ""
    });
  };
  
  async function onSubmit(values: z.infer<typeof plantFormSchema>) {
    try {
      // For now, we'll adapt to the existing database schema
      // Later we'll implement the new schema
      if (isEditMode && plant) {
        // Update existing plant - for now just use the first inventory entry
        const firstEntry = values.inventoryEntries[0];
        await apiRequest("PUT", `/api/plants/${plant.id}`, {
          id: plant.id,
          name: values.name,
          scientificName: values.scientificName,
          plantingYear: firstEntry.plantingYear,
          quantity: firstEntry.quantity
        });
        
        toast({
          title: "Plant updated",
          description: "The plant details have been successfully updated.",
        });
      } else {
        // Create a new plant for each inventory entry
        for (const entry of values.inventoryEntries) {
          await apiRequest("POST", "/api/plants", {
            name: values.name,
            scientificName: values.scientificName,
            plantingYear: entry.plantingYear,
            quantity: entry.quantity
          });
        }
        
        toast({
          title: "Plant added",
          description: `Successfully added ${values.inventoryEntries.length} inventory entries for ${values.name}.`,
        });
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      
      // Close modal and reset form
      onClose();
      form.reset();
    } catch (error) {
      console.error("Error saving plant:", error);
      toast({
        title: "Error",
        description: "Failed to save the plant. Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Plant" : "Add New Plant"}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Plant Details</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <TabsContent value="details" className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plant Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Silver Maple" {...field} />
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
                      <FormLabel>Scientific Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Acer saccharinum" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter any additional details about this plant..."
                          {...field}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2 pt-2">
                  <Button 
                    type="button" 
                    onClick={() => setActiveTab("inventory")}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Next: Inventory
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="inventory" className="space-y-4">
                <div className="text-sm flex items-center mb-2 text-muted-foreground border rounded-md p-2 bg-muted/30">
                  <Info className="h-4 w-4 mr-2" />
                  <p>Add separate entries for each planting year or location</p>
                </div>
                
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="border rounded-md p-4 relative">
                      <div className="absolute right-2 top-2">
                        {fields.length > 1 && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => remove(index)}
                            className="h-7 w-7 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <h3 className="font-medium mb-3">Inventory Entry #{index + 1}</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`inventoryEntries.${index}.plantingYear`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Planting Year</FormLabel>
                              <Select 
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                defaultValue={field.value?.toString()}
                                value={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Year" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {yearOptions.map((year) => (
                                    <SelectItem key={year} value={year.toString()}>
                                      {year}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`inventoryEntries.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  placeholder="e.g. 42" 
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 mt-3">
                        <FormField
                          control={form.control}
                          name={`inventoryEntries.${index}.location`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location (Optional)</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g. North garden, Greenhouse 2" 
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`inventoryEntries.${index}.notes`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes (Optional)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Any specific notes for this inventory entry..."
                                  {...field}
                                  rows={2}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addInventoryEntry}
                  className="w-full mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Inventory Entry
                </Button>
                
                <div className="grid grid-cols-2 gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setActiveTab("details")}
                  >
                    Back to Details
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isEditMode ? "Update Plant" : "Save Plant"}
                  </Button>
                </div>
              </TabsContent>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
