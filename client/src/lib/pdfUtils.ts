import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Plant } from "@shared/schema";

/**
 * Export plants data to PDF file
 */
export function exportToPDF(plants: Plant[], filename: string = "plant-inventory.pdf") {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text("Plant Inventory Report", 14, 22);
  
  // Add date
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Create table data
  const tableColumn = ["Name", "Scientific Name", "Planting Year", "Quantity"];
  const tableRows = plants.map(plant => [
    plant.name,
    plant.scientificName,
    plant.plantingYear.toString(),
    plant.quantity.toString()
  ]);
  
  // Add table to document
  (autoTable as any)(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    theme: "grid",
    styles: { fontSize: 10 },
    headStyles: { fillColor: [46, 125, 50] } // #2E7D32 (primary color)
  });
  
  // Save document
  doc.save(filename);
}
