import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { useState, useEffect } from "react";
import { Plant } from "@shared/schema";
import InventoryTable from "@/components/InventoryTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImportModal from "@/components/ImportModal";
import ExportDropdown from "@/components/ExportDropdown";
import PlantModal from "@/components/PlantModal";
import { Filter, Plus, Search, ChevronDown, ChevronUp } from "lucide-react";
import useDebounce from "@/hooks/useDebounce";

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [quantityFilter, setQuantityFilter] = useState<string>("all");
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPlantModal, setShowPlantModal] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [showFilters, setShowFilters] = useState(false);
  
  // Apply debounce to search term to avoid frequent API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Handle responsive view
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch plant data with search parameter
  const { data: plants = [], isLoading, isError } = useQuery<Plant[]>({
    queryKey: ["/api/plants", debouncedSearchTerm],
    queryFn: async () => {
      try {
        console.log("Fetching plants data...");
        const response = await fetch(`/api/plants${debouncedSearchTerm ? `?search=${encodeURIComponent(debouncedSearchTerm)}` : ''}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) {
          console.error("Error fetching plants:", response.status, response.statusText);
          throw new Error('Failed to fetch plants');
        }
        const data = await response.json();
        console.log("Plants data received:", data.length, "plants");
        return data;
      } catch (error) {
        console.error("Error in plants query:", error);
        throw error;
      }
    },
  });

  // Function to filter plants based on filters (year and quantity)
  // Search filtering is now done on the server side
  const filteredPlants = plants.filter((plant) => {
    try {
      // Apply year filter
      const matchesYear = yearFilter === "all" || plant.plantingYear?.toString() === yearFilter;
      
      // Apply quantity filter
      let matchesQuantity = true;
      if (quantityFilter === "low") {
        matchesQuantity = plant.quantity < 10;
      } else if (quantityFilter === "medium") {
        matchesQuantity = plant.quantity >= 10 && plant.quantity <= 50;
      } else if (quantityFilter === "high") {
        matchesQuantity = plant.quantity > 50;
      }
      
      return matchesYear && matchesQuantity;
    } catch (error) {
      console.error("Error filtering plant:", error, plant);
      return false;
    }
  });

  const handleAddPlant = () => {
    setSelectedPlant(null);
    setShowPlantModal(true);
  };

  const handleEditPlant = (plant: Plant) => {
    setSelectedPlant(plant);
    setShowPlantModal(true);
  };

  const handleClosePlantModal = () => {
    setShowPlantModal(false);
    setSelectedPlant(null);
  };

  return (
    <>
      <Helmet>
        <title>Inventory | Plant Inventory Management System</title>
        <meta name="description" content="Manage your plant inventory with advanced filtering and sorting options" />
      </Helmet>
      <div className="space-y-6">
        {/* Inventory Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Inventory</h2>
            <p className="text-sm text-muted-foreground">Manage your plant inventory</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
            <Button 
              variant="outline" 
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-upload"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              Import Excel
            </Button>
            
            <ExportDropdown />
          </div>
        </div>
        
        {/* Filter and Search */}
        <div className="bg-card rounded-lg shadow">
          {/* Always visible search bar with collapsible filters toggle on mobile */}
          <div className="p-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search plants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {isMobileView ? (
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)} 
                className="flex items-center justify-between"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {showFilters ? 
                  <ChevronUp className="h-4 w-4 ml-2" /> : 
                  <ChevronDown className="h-4 w-4 ml-2" />
                }
              </Button>
            ) : (
              <div className="flex gap-2">
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2022">2022</SelectItem>
                    <SelectItem value="2021">2021</SelectItem>
                    <SelectItem value="2020">2020</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={quantityFilter} onValueChange={setQuantityFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Quantities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quantities</SelectItem>
                    <SelectItem value="low">Low Stock (&lt; 10)</SelectItem>
                    <SelectItem value="medium">Medium (10-50)</SelectItem>
                    <SelectItem value="high">High (&gt; 50)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Collapsible filters section for mobile */}
          {isMobileView && showFilters && (
            <div className="px-4 pb-4 border-t border-border pt-4 space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Year</label>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2022">2022</SelectItem>
                    <SelectItem value="2021">2021</SelectItem>
                    <SelectItem value="2020">2020</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Quantity</label>
                <Select value={quantityFilter} onValueChange={setQuantityFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Quantities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quantities</SelectItem>
                    <SelectItem value="low">Low Stock (&lt; 10)</SelectItem>
                    <SelectItem value="medium">Medium (10-50)</SelectItem>
                    <SelectItem value="high">High (&gt; 50)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        
        {/* Full Inventory Table */}
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h3 className="text-lg font-semibold text-card-foreground">Complete Plant Inventory</h3>
            <Button onClick={handleAddPlant} className="flex items-center gap-1 bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Add Plant
            </Button>
          </div>
          
          <InventoryTable 
            plants={filteredPlants} 
            isLoading={isLoading} 
            isError={isError} 
            onEdit={handleEditPlant} 
            showPagination={true}
          />
        </div>
      </div>

      {/* Import Modal */}
      <ImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} />

      {/* Add/Edit Plant Modal */}
      <PlantModal 
        isOpen={showPlantModal} 
        onClose={handleClosePlantModal} 
        plant={selectedPlant} 
      />
    </>
  );
}
