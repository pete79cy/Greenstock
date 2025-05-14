import { useState, useEffect } from "react";
import { Plant } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, PlusCircle, PenLine } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { AddStockModal } from "@/components/AddStockModal";
import { PlantRenameModal } from "@/components/PlantRenameModal";

interface InventoryTableProps {
  plants: Plant[];
  isLoading: boolean;
  isError: boolean;
  onEdit: (plant: Plant) => void;
  showPagination?: boolean;
}

export default function InventoryTable({ 
  plants, 
  isLoading, 
  isError, 
  onEdit, 
  showPagination = false 
}: InventoryTableProps) {
  const { toast } = useToast();
  const [sortField, setSortField] = useState<keyof Plant>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const itemsPerPage = 10;

  // Handle responsive view
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  
  // Sort plants
  const sortedPlants = [...plants].sort((a, b) => {
    let valueA = a[sortField];
    let valueB = b[sortField];
    
    // For string comparisons
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      valueA = valueA.toLowerCase();
      valueB = valueB.toLowerCase();
    }
    
    if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
    if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });
  
  const currentItems = showPagination 
    ? sortedPlants.slice(indexOfFirstItem, indexOfLastItem) 
    : sortedPlants.slice(0, 10);
  
  const totalPages = Math.ceil(plants.length / itemsPerPage);

  const handleSort = (field: keyof Plant) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDeletePlant = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/plants/${id}`);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      
      toast({
        title: "Plant deleted",
        description: "The plant has been successfully removed from inventory.",
      });
    } catch (error) {
      console.error("Error deleting plant:", error);
      toast({
        title: "Error",
        description: "Failed to delete the plant. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Calculate the stock level color based on quantity
  const getStockLevelColor = (quantity: number) => {
    if (quantity < 10) return "!bg-yellow-500"; // Low stock
    return "!bg-green-500"; // Good stock
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="space-y-3">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex items-center space-x-4">
              <Skeleton className="h-10 w-[250px]" />
              <Skeleton className="h-10 w-[250px]" />
              <Skeleton className="h-10 w-[100px]" />
              <Skeleton className="h-10 w-[150px]" />
              <Skeleton className="h-10 w-[100px]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Error loading plant inventory. Please try again.</p>
      </div>
    );
  }

  if (plants.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No plants found. Add some plants to your inventory.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile view - card-based layout */}
      {isMobileView ? (
        <div className="space-y-4">
          {currentItems.map((plant) => (
            <div key={plant.id} className="bg-white p-4 rounded-lg shadow border">
              <div className="flex justify-between mb-2">
                <h3 className="font-medium">{plant.name}</h3>
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      setSelectedPlant(plant);
                      setIsAddStockModalOpen(true);
                    }}
                    className="h-8 w-8 text-green-600"
                    title="Add Stock"
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onEdit(plant)}
                    className="h-8 w-8 text-blue-600"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeletePlant(plant.id)}
                    className="h-8 w-8 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scientific Name:</span>
                  <span className="italic">{plant.scientificName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Planting Year:</span>
                  <span>{plant.plantingYear}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Quantity:</span>
                  <div className="flex items-center space-x-2">
                    <span>{plant.quantity}</span>
                    <div className="w-16">
                      <Progress 
                        value={Math.min(plant.quantity, 100)} 
                        className={`h-2 bg-gray-200 ${getStockLevelColor(plant.quantity)}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop view - table layout */
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-accent/30"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center">
                    Name
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-accent/30"
                  onClick={() => handleSort("scientificName")}
                >
                  <div className="flex items-center">
                    Scientific Name
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-accent/30"
                  onClick={() => handleSort("plantingYear")}
                >
                  <div className="flex items-center">
                    Planting Year
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-accent/30"
                  onClick={() => handleSort("quantity")}
                >
                  <div className="flex items-center">
                    Quantity
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.map((plant) => (
                <TableRow key={plant.id} className="hover:bg-muted/50">
                  <TableCell>{plant.name}</TableCell>
                  <TableCell className="italic">{plant.scientificName}</TableCell>
                  <TableCell>{plant.plantingYear}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="w-8 text-right">{plant.quantity}</span>
                      <div className="w-24">
                        <Progress 
                          value={Math.min(plant.quantity, 100)} 
                          className={`h-2 bg-gray-200 ${getStockLevelColor(plant.quantity)}`}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setSelectedPlant(plant);
                          setIsAddStockModalOpen(true);
                        }}
                        className="text-green-600 hover:text-green-800 hover:bg-green-50"
                        title="Add Stock"
                      >
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onEdit(plant)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeletePlant(plant.id)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button 
              variant="outline" 
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                <span className="font-medium">{Math.min(indexOfLastItem, plants.length)}</span> of{" "}
                <span className="font-medium">{plants.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-l-md"
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button 
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    className={currentPage === page ? "bg-primary text-primary-foreground" : ""}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                ))}

                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-r-md"
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </nav>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Stock Modal */}
      <AddStockModal 
        isOpen={isAddStockModalOpen}
        onOpenChange={setIsAddStockModalOpen}
        plant={selectedPlant}
      />
    </div>
  );
}
