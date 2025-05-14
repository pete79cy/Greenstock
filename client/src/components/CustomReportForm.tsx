import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, File } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [excludeZeroQuantity, setExcludeZeroQuantity] = useState(false);
  const [exportFormat, setExportFormat] = useState<string>("excel");
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
          excludeZeroQuantity
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

      // Generate the report in the selected format
      if (exportFormat === "excel") {
        // Create and download the Excel file
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Custom Report");
        
        // Generate a filename with current date
        const date = new Date().toISOString().split('T')[0];
        
        // Use UTF-8 handling during file generation to preserve Greek characters
        XLSX.writeFile(workbook, `plant_inventory_custom_report_${date}.xlsx`, {
          bookType: "xlsx",
          type: "binary",
          compression: true
        });
        
        // Alternative CSV export with UTF-8 BOM if needed:
        // const csvContent = XLSX.utils.sheet_to_csv(worksheet);
        // const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
        // const link = document.createElement('a');
        // link.href = URL.createObjectURL(blob);
        // link.download = `plant_inventory_custom_report_${date}.csv`;
        // link.click();
      } else {
        // Generate PDF
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(18);
        doc.text("Custom Plant Inventory Report", 14, 22);
        
        // Add date
        doc.setFontSize(12);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
        
        // Prepare columns for PDF
        const tableColumns = selectedColumns.map(col => {
          // Convert camelCase to Title Case for display
          const colName = col.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return { header: colName, dataKey: col };
        });
        
        // Add table to document
        (autoTable as any)(doc, {
          columns: tableColumns,
          body: data,
          startY: 40,
          theme: 'grid',
          styles: { fontSize: 10 },
          headStyles: { fillColor: [46, 125, 50] },
          didDrawPage: (data: any) => {
            // Footer
            doc.setFontSize(8);
            doc.text(`Plant Inventory System - Page ${data.pageNumber}`, 14, doc.internal.pageSize.height - 10);
          }
        });
        
        // Save document
        const date = new Date().toISOString().split('T')[0];
        doc.save(`plant_inventory_custom_report_${date}.pdf`);
      }
      
      toast({
        title: "Report generated",
        description: `Successfully created ${exportFormat.toUpperCase()} report with ${data.length} entries.`,
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

          <div className="flex items-center space-x-2 pt-6">
            <Checkbox
              id="exclude-zero"
              checked={excludeZeroQuantity}
              onCheckedChange={() => setExcludeZeroQuantity(!excludeZeroQuantity)}
            />
            <label
              htmlFor="exclude-zero"
              className="text-sm font-medium leading-none"
            >
              Exclude plants with zero quantity
            </label>
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

        <div className="mb-6">
          <Label className="block mb-2">Export Format</Label>
          <Tabs defaultValue="excel" value={exportFormat} onValueChange={setExportFormat} className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="excel" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Excel
              </TabsTrigger>
              <TabsTrigger value="pdf" className="flex items-center gap-2">
                <File className="h-4 w-4" />
                PDF
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Button 
          onClick={handleExport} 
          disabled={selectedColumns.length === 0 || isLoading}
          className="w-full"
        >
          {isLoading ? "Generating..." : (
            <>
              <Download className="mr-2 h-4 w-4" />
              {`Generate ${exportFormat === "excel" ? "Excel" : "PDF"} Report`}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}