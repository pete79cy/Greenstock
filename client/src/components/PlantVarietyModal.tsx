import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PlantVarietyModalProps {
  onVarietyAdded?: (variety: { id: number; name: string }) => void;
}

export function PlantVarietyModal({ onVarietyAdded }: PlantVarietyModalProps) {
  const [open, setOpen] = useState(false);
  const [varietyName, setVarietyName] = useState("");
  const [category, setCategory] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: { name: string; category?: string }) => {
      const response = await apiRequest("/api/plant-varieties", "POST", data);
      return await response.json();
    },
    onSuccess: (newVariety) => {
      toast({
        title: "Επιτυχία!",
        description: `Η ποικιλία "${varietyName}" προστέθηκε επιτυχώς.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/plant-varieties"] });
      onVarietyAdded?.(newVariety);
      setVarietyName("");
      setCategory("");
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία προσθήκης ποικιλίας",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!varietyName.trim()) {
      toast({
        title: "Σφάλμα",
        description: "Το όνομα της ποικιλίας είναι υποχρεωτικό",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate({ 
      name: varietyName.trim(), 
      category: category.trim() || undefined 
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Νέα Ποικιλία
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Προσθήκη Νέας Ποικιλίας</DialogTitle>
            <DialogDescription>
              Προσθέστε μια νέα ποικιλία φυτού που θα αποθηκευτεί μόνιμα στο σύστημα.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="variety-name" className="text-right">
                Όνομα *
              </Label>
              <Input
                id="variety-name"
                value={varietyName}
                onChange={(e) => setVarietyName(e.target.value)}
                className="col-span-3"
                placeholder="π.χ. Μηλιά Fuji"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Κατηγορία
              </Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="col-span-3"
                placeholder="π.χ. Φρούτα (προαιρετικό)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Αποθήκευση..." : "Αποθήκευση"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}