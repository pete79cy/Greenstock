import { useState, useEffect } from "react";
import { Plant } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddStockModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  plant: Plant | null;
}

export function AddStockModal({ isOpen, onOpenChange, plant }: AddStockModalProps) {
  const { toast } = useToast();
  const [quantityToAdd, setQuantityToAdd] = useState<string>("");
  const [plantingYear, setPlantingYear] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [yearOptions, setYearOptions] = useState<number[]>([]);

  // Generate year options (current year down to 5 years ago)
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
    setYearOptions(years);
  }, []);
  
  // Reset fields when plant changes or dialog opens
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setQuantityToAdd("");
      setPlantingYear("");
    } else if (plant) {
      // Default to the plant's current planting year
      setPlantingYear(plant.plantingYear.toString());
    }
    onOpenChange(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!plant) return;

    const amount = parseInt(quantityToAdd, 10);
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid quantity",
        description: "Please enter a positive number.",
      });
      return;
    }

    if (!plantingYear) {
      toast({
        variant: "destructive",
        title: "Planting Year Required",
        description: "Please select a planting year.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Make API request to add stock
      await apiRequest("POST", `/api/plants/${plant.id}/add-stock`, {
        quantityToAdd: amount,
        plantingYear: parseInt(plantingYear, 10)
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });

      toast({
        title: "Stock updated",
        description: `Added ${amount} units to ${plant.name} (Year: ${plantingYear}).`,
      });

      // Close modal and reset form
      handleOpenChange(false);
    } catch (error) {
      console.error("Error adding stock:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add stock. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!plant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Stock: {plant.name}</DialogTitle>
          <DialogDescription>
            Current quantity: {plant.quantity}. Enter the details for stock addition.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantityToAdd" className="text-right">
                Quantity
              </Label>
              <Input
                id="quantityToAdd"
                type="number"
                value={quantityToAdd}
                onChange={(e) => setQuantityToAdd(e.target.value)}
                className="col-span-3"
                min="1"
                required
                autoFocus
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="plantingYear" className="text-right">
                Planting Year
              </Label>
              <div className="col-span-3">
                <Select 
                  value={plantingYear} 
                  onValueChange={setPlantingYear}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}