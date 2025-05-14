import * as XLSX from "xlsx";
import { Plant } from "@shared/schema";

/**
 * Read Excel file and convert to plants array
 */
export async function readExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsBinaryString(file);
  });
}

/**
 * Export plants data to Excel file
 */
export function exportToExcel(plants: Plant[], filename: string = "plant-inventory.xlsx") {
  // Format data for export
  const exportData = plants.map(plant => ({
    "Name": plant.name,
    "Scientific Name": plant.scientificName,
    "Planting Year": plant.plantingYear,
    "Quantity": plant.quantity
  }));
  
  // Create workbook and add data
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  // Set column widths
  const cols = [
    { wch: 20 },  // Name
    { wch: 25 },  // Scientific Name
    { wch: 15 },  // Planting Year
    { wch: 10 }   // Quantity
  ];
  worksheet["!cols"] = cols;
  
  // Add sheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Plant Inventory");
  
  // Generate and download Excel file
  XLSX.writeFile(workbook, filename);
}
