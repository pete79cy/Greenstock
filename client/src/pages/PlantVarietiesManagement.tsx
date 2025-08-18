import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import BackToMenuButton from "@/components/BackToMenuButton";
import { PlantVarietyModal } from "@/components/PlantVarietyModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PlantVariety {
  id: number;
  name: string;
  category?: string;
  createdAt: string;
}

export default function PlantVarietiesManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: varieties = [], isLoading } = useQuery<PlantVariety[]>({
    queryKey: ["/api/plant-varieties"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/plant-varieties/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast({
        title: "Επιτυχία!",
        description: `Η ποικιλία "${deleteName}" διαγράφηκε επιτυχώς.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/plant-varieties"] });
      setDeleteId(null);
      setDeleteName("");
    },
    onError: (error: any) => {
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία διαγραφής ποικιλίας",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (variety: PlantVariety) => {
    setDeleteId(variety.id);
    setDeleteName(variety.name);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  const filteredVarieties = varieties.filter(variety =>
    variety.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (variety.category && variety.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container mx-auto p-6">
      <BackToMenuButton />
      
      <Card>
        <CardHeader>
          <CardTitle>Διαχείριση Ποικιλιών Φυτών</CardTitle>
          <CardDescription>
            Προβολή, προσθήκη και διαγραφή ποικιλιών φυτών που χρησιμοποιούνται στο σύστημα ΠΥ8
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Αναζήτηση ποικιλίας..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <PlantVarietyModal />
          </div>

          {isLoading ? (
            <div className="text-center py-8">Φόρτωση ποικιλιών...</div>
          ) : filteredVarieties.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? "Δεν βρέθηκαν ποικιλίες με αυτά τα κριτήρια" : "Δεν υπάρχουν καταχωρημένες ποικιλίες"}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">Όνομα Ποικιλίας</TableHead>
                    <TableHead className="w-[30%]">Κατηγορία</TableHead>
                    <TableHead className="w-[20%] text-right">Ενέργειες</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVarieties.map((variety) => (
                    <TableRow key={variety.id}>
                      <TableCell className="font-medium">{variety.name}</TableCell>
                      <TableCell>{variety.category || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(variety)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Επιβεβαίωση Διαγραφής</AlertDialogTitle>
            <AlertDialogDescription>
              Είστε σίγουροι ότι θέλετε να διαγράψετε την ποικιλία "{deleteName}";
              Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Διαγραφή
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}