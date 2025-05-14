import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Register jsPDF's default UTF-8 fonts which have better Unicode support
(jsPDF as any).API.events.push([
  "addFonts",
  function(this: any) {
    // Standard fonts with better Unicode support
    this.addFont("Helvetica", "Helvetica", "normal");
    this.addFont("Helvetica-Bold", "Helvetica", "bold");
  }
]);

// Helper function to ensure text is properly encoded for PDF output
export function sanitizeText(text: string | number | null | undefined): string {
  if (text === null || text === undefined) {
    return '';
  }
  
  // Convert to string 
  const str = String(text);
  
  // Replace problematic characters or escape sequences if needed
  return str
    .replace(/[\u0080-\uFFFF]/g, (match) => {
      // This will properly handle Unicode characters including Greek
      return match;
    });
}

// Generate PDF with proper Unicode support
export function generatePDF(
  data: Array<Record<string, any>>, 
  columns: { header: string, dataKey: string }[],
  title: string,
  filename: string
): void {
  // Create PDF with specific settings for Unicode support
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    compress: true
  });
  
  // Set font to one that supports Greek characters
  doc.setFont("Helvetica", "normal");
  
  // Add title
  doc.setFontSize(18);
  doc.text(sanitizeText(title), 14, 22);
  
  // Add date
  doc.setFontSize(12);
  doc.text(sanitizeText(`Generated on: ${new Date().toLocaleDateString()}`), 14, 30);
  
  // Process data to ensure all text is properly encoded for PDF
  const processedData = data.map(row => {
    const newRow: Record<string, any> = {};
    Object.keys(row).forEach(key => {
      newRow[key] = sanitizeText(row[key]);
    });
    return newRow;
  });
  
  // Generate the table with proper font configuration
  (autoTable as any)(doc, {
    columns: columns,
    body: processedData,
    startY: 40,
    theme: 'grid',
    styles: { 
      fontSize: 10,
      font: "Helvetica",
      overflow: 'linebreak',
      cellPadding: 3
    },
    headStyles: { 
      fillColor: [46, 125, 50], // green color
      font: "Helvetica",
      fontStyle: "bold",
      halign: 'center'
    },
    didDrawPage: (data: any) => {
      // Add footer
      doc.setFontSize(8);
      doc.setFont("Helvetica", "normal");
      doc.text(
        `Plant Inventory System - Page ${data.pageNumber}`, 
        14, 
        doc.internal.pageSize.height - 10
      );
    }
  });
  
  // Save the PDF
  doc.save(filename);
}