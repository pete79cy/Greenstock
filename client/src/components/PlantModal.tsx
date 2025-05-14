import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertPlantSchema } from "@shared/schema";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plant } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface PlantModalProps {
  isOpen: boolean;
  onClose: () => void;
  plant: Plant | null;
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

// Extend schema with additional validation rules
const formSchema = insertPlantSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  scientificName: z.string().min(2, "Scientific name must be at least 2 characters"),
  plantingYear: z.coerce.number().int().min(2000, "Year must be 2000 or later").max(currentYear, `Year cannot be after ${currentYear}`),
  quantity: z.coerce.number().int().min(0, "Quantity must be 0 or greater")
});

export default function PlantModal({ isOpen, onClose, plant }: PlantModalProps) {
  const { toast } = useToast();
  const isEditMode = !!plant;
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: plant?.name || "",
      scientificName: plant?.scientificName || "",
      plantingYear: plant?.plantingYear || currentYear,
      quantity: plant?.quantity || 0
    }
  });
  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (isEditMode && plant) {
        // Update existing plant
        await apiRequest("PUT", `/api/plants/${plant.id}`, values);
        toast({
          title: "Plant updated",
          description: "The plant has been successfully updated.",
        });
      } else {
        // Create new plant
        await apiRequest("POST", "/api/plants", values);
        toast({
          title: "Plant added",
          description: "The plant has been successfully added to inventory.",
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Plant" : "Add New Plant"}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
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
              name="plantingYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Planting Year</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value.toString()}
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
              name="quantity"
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
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditMode ? "Update Plant" : "Save Plant"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
