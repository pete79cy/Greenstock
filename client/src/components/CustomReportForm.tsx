import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";

const columns = [
  { label: "Plant Name", value: "name" },
  { label: "Scientific Name", value: "scientificName" },
  { label: "Description", value: "description" },
  { label: "Planting Year", value: "plantingYear" },
  { label: "Quantity", value: "quantity" },
  { label: "Location", value: "location" },
  { label: "Notes", value: "notes" },
  { label: "Created At", value: "createdAt" }
];

export default function CustomReportForm() {
  const { toast } = useToast();
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    name: "",
    plantingYear: "",
    location: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleColumnToggle = (value: string) => {
    setSelectedColumns((prev) =>
      prev.includes(value)
        ? prev.filter((col) => col !== value)
        : [...prev, value]
    );
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      toast({
        title: "No columns selected",
        description: "Please select at least one column for your report.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call the API to get filtered data
      const response = await fetch('/api/reports/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters,
          selectedColumns,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report data');
      }

      const data = await response.json();
      
      if (data.length === 0) {
        toast({
          title: "No results found",
          description: "Your filter criteria did not match any records.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Create and download the Excel file
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Custom Report");
      
      // Generate a filename with current date
      const date = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `plant_inventory_custom_report_${date}.xlsx`);
      
      toast({
        title: "Report generated",
        description: `Successfully created report with ${data.length} entries.`,
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error generating report",
        description: "There was a problem creating your report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto mt-6 mb-10">
      <CardContent className="pt-6">
        <h2 className="text-xl font-bold mb-4">Custom Report Options</h2>

        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="plant-name">Plant Name</Label>
            <Input
              id="plant-name"
              placeholder="e.g., Silver Maple"
              value={filters.name}
              onChange={(e) => handleFilterChange("name", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="planting-year">Planting Year</Label>
            <Input
              id="planting-year"
              type="number"
              placeholder="e.g., 2023"
              value={filters.plantingYear}
              onChange={(e) => handleFilterChange("plantingYear", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., North Area"
              value={filters.location}
              onChange={(e) => handleFilterChange("location", e.target.value)}
            />
          </div>
        </div>

        <div className="mb-6">
          <Label className="block mb-2">Select Columns</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {columns.map((col) => (
              <div key={col.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`col-${col.value}`}
                  checked={selectedColumns.includes(col.value)}
                  onCheckedChange={() => handleColumnToggle(col.value)}
                />
                <label
                  htmlFor={`col-${col.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {col.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Button 
          onClick={handleExport} 
          disabled={selectedColumns.length === 0 || isLoading}
          className="w-full"
        >
          {isLoading ? "Generating..." : "Generate Custom Report"}
        </Button>
      </CardContent>
    </Card>
  );
}