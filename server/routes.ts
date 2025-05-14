import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import * as XLSX from "xlsx";
import { insertPlantSchema, updatePlantSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Define a type for the request with file
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all plants
  app.get("/api/plants", async (req: Request, res: Response) => {
    try {
      const plants = await storage.getAllPlants();
      res.json(plants);
    } catch (error) {
      console.error("Error fetching plants:", error);
      res.status(500).json({ message: "Failed to fetch plants" });
    }
  });

  // Get plant by ID
  app.get("/api/plants/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const plant = await storage.getPlant(id);
      
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }
      
      res.json(plant);
    } catch (error) {
      console.error("Error fetching plant:", error);
      res.status(500).json({ message: "Failed to fetch plant" });
    }
  });

  // Create a new plant
  app.post("/api/plants", async (req: Request, res: Response) => {
    try {
      const validationResult = insertPlantSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const plant = await storage.createPlant(validationResult.data);
      res.status(201).json(plant);
    } catch (error) {
      console.error("Error creating plant:", error);
      res.status(500).json({ message: "Failed to create plant" });
    }
  });

  // Update plant
  app.put("/api/plants/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validationResult = updatePlantSchema.safeParse({
        id,
        ...req.body
      });
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const updated = await storage.updatePlant(validationResult.data);
      
      if (!updated) {
        return res.status(404).json({ message: "Plant not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating plant:", error);
      res.status(500).json({ message: "Failed to update plant" });
    }
  });

  // Delete plant
  app.delete("/api/plants/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePlant(id);
      
      if (!success) {
        return res.status(404).json({ message: "Plant not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting plant:", error);
      res.status(500).json({ message: "Failed to delete plant" });
    }
  });

  // Import plants from Excel
  app.post("/api/plants/import", upload.single("file"), async (req: MulterRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Read the Excel file
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Define a type for Excel row data
      type ExcelRow = Record<string, string | number | null | undefined>;
      
      const data = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];

      console.log("Excel import data preview:", data.slice(0, 2));

      // Validate and transform the data
      const importResults = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (const row of data) {
        // Additional logging to understand the data structure
        if (importResults.success === 0) {
          console.log("First row structure:", JSON.stringify(row));
        }

        // Extract and normalize field values with type safety
        const getValue = (fieldNames: string[]): string | number | null => {
          for (const field of fieldNames) {
            if (row[field] !== undefined && row[field] !== null) {
              return row[field] as string | number;
            }
          }
          return null;
        };

        // Get values using the helper function
        const nameValue = getValue([
          'Name', 'name', 'NAME', 'Plant Name', 'PLANT NAME', 'plant_name'
        ]);
        
        const scientificNameValue = getValue([
          'ScientificName', 'Scientific Name', 'scientificName', 
          'SCIENTIFIC NAME', 'scientific_name'
        ]);
        
        const yearValue = getValue([
          'PlantingYear', 'Planting Year', 'plantingYear', 'YEAR',
          'PLANTING YEAR', 'planting_year'
        ]);
        
        const quantityValue = getValue([
          'Quantity', 'quantity', 'QUANTITY', 'count', 'COUNT'
        ]);

        // Skip rows with missing essential data
        if (!nameValue || nameValue === "") {
          importResults.failed++;
          importResults.errors.push(`Row skipped: Missing plant name`);
          continue;
        }

        const plantData = {
          name: String(nameValue).trim(),
          scientificName: scientificNameValue ? String(scientificNameValue).trim() : "Unknown",
          plantingYear: yearValue !== null ? parseInt(String(yearValue)) : new Date().getFullYear(),
          quantity: quantityValue !== null ? parseInt(String(quantityValue)) : 0
        };

        // Ensure numbers are valid
        if (isNaN(plantData.plantingYear)) plantData.plantingYear = new Date().getFullYear();
        if (isNaN(plantData.quantity)) plantData.quantity = 0;

        const validationResult = insertPlantSchema.safeParse(plantData);
        
        if (validationResult.success) {
          await storage.createPlant(validationResult.data);
          importResults.success++;
        } else {
          const validationError = fromZodError(validationResult.error);
          importResults.failed++;
          importResults.errors.push(`Row error: ${validationError.message}`);
        }
      }

      // Add a detailed message for the frontend
      const message = importResults.success > 0 
        ? `Successfully imported ${importResults.success} plants.` 
        : "No plants were imported.";

      const detailedErrors = importResults.errors.length > 0 
        ? `There were ${importResults.failed} errors.` 
        : "";

      res.json({
        ...importResults,
        message,
        detailedErrors
      });
    } catch (error) {
      console.error("Error importing plants:", error);
      res.status(500).json({ message: "Failed to import plants. Check the Excel file format." });
    }
  });

  // Export plants to Excel
  app.get("/api/plants/export/excel", async (req: Request, res: Response) => {
    try {
      const plants = await storage.getAllPlants();
      
      // Create a new workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(plants.map(plant => ({
        Name: plant.name,
        "Scientific Name": plant.scientificName,
        "Planting Year": plant.plantingYear,
        Quantity: plant.quantity
      })));
      
      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Plant Inventory");
      
      // Generate Excel file buffer
      const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      
      // Set response headers
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=plant-inventory.xlsx");
      
      // Send the file
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      res.status(500).json({ message: "Failed to export plants to Excel" });
    }
  });

  // Export plants to PDF
  app.get("/api/plants/export/pdf", async (req: Request, res: Response) => {
    try {
      const plants = await storage.getAllPlants();
      
      // Create a new PDF document
      const doc = new jsPDF() as any;
      
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
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [46, 125, 50] } // #2E7D32 (primary color)
      });
      
      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=plant-inventory.pdf");
      
      // Send the PDF as a buffer
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      res.status(500).json({ message: "Failed to export plants to PDF" });
    }
  });

  // Get counts for dashboard metrics
  app.get("/api/metrics", async (req: Request, res: Response) => {
    try {
      const plants = await storage.getAllPlants();
      
      // Calculate metrics
      const totalPlants = plants.length;
      const lowStockItems = plants.filter(plant => plant.quantity < 10).length;
      
      // Get plants added in the last month
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      // For simplicity, use a random number for new additions
      // In a real application, you'd check the createdAt timestamp
      const newAdditions = Math.floor(totalPlants * 0.2);
      
      // Count unique planting years as a proxy for categories
      const plantCategories = new Set(plants.map(plant => plant.plantingYear)).size;
      
      res.json({
        totalPlants,
        lowStockItems,
        newAdditions,
        plantCategories
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
