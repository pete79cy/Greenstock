import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import * as XLSX from "xlsx";
import { insertPlantSchema, updatePlantSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as fs from "fs";
import path from "path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { configureSession, registerAuthRoutes, isAuthenticated } from "./auth";
import cors from "cors";

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
  // Configure CORS for handling cross-origin requests in production
  app.use(cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, or postman requests)
      if (!origin) return callback(null, true);
      // Allow all domains in dev and specific domains in production
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      // In production, allow requests from Replit domains or your custom domains
      const allowedDomains = [
        /\.replit\.app$/,
        /\.repl\.co$/,
        // Add any other domains you might deploy to
      ];
      
      const allowed = allowedDomains.some(domain => domain.test(origin));
      if (allowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true, // Important for cookies/auth sessions
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  
  // Configure session and authentication
  configureSession(app);
  registerAuthRoutes(app);
  // Backup plants as JSON
  app.get("/api/backup", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const plants = await storage.getAllPlants();
      
      // Get current timestamp for the filename
      const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
      const filename = `plant-inventory-backup-${timestamp}.json`;
      
      // Set the response headers
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      
      // Send the JSON data
      res.json(plants);
    } catch (error) {
      console.error("Error creating backup:", error);
      res.status(500).json({ message: "Failed to create backup" });
    }
  });
  
  // Restore plants from JSON
  app.post("/api/restore", isAuthenticated, upload.single("backupFile"), async (req: MulterRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No backup file uploaded" });
      }
      
      // Read the JSON file
      const backupDataString = req.file.buffer.toString('utf-8');
      let plantsToRestore;
      
      try {
        plantsToRestore = JSON.parse(backupDataString);
      } catch (parseError) {
        return res.status(400).json({ message: "Invalid JSON format in backup file" });
      }
      
      if (!Array.isArray(plantsToRestore)) {
        return res.status(400).json({ message: "Invalid backup format. Expected an array of plants." });
      }
      
      console.log(`Restoring ${plantsToRestore.length} plants from backup...`);
      
      // Validate each plant
      const restoreResults = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };
      
      // Clear existing plants and add new ones in a transaction
      let clearSuccess = false;
      
      // First, try to delete all existing plants
      try {
        // Get all plants
        const existingPlants = await storage.getAllPlants();
        
        // Delete each plant
        for (const plant of existingPlants) {
          await storage.deletePlant(plant.id);
        }
        
        clearSuccess = true;
      } catch (clearError) {
        console.error("Error clearing existing plants:", clearError);
        return res.status(500).json({ 
          message: "Failed to clear existing plants before restore",
          error: (clearError as Error).message
        });
      }
      
      if (clearSuccess) {
        // Now add plants from the backup
        for (const plantData of plantsToRestore) {
          try {
            // Ensure we have required fields for a plant
            if (!plantData.name) {
              restoreResults.failed++;
              restoreResults.errors.push(`Plant missing name field`);
              continue;
            }
            
            // Extract relevant fields for insert (omit id and timestamps)
            const plantToInsert = {
              name: plantData.name,
              scientificName: plantData.scientificName || "Unknown",
              plantingYear: parseInt(plantData.plantingYear) || new Date().getFullYear(),
              quantity: parseInt(plantData.quantity) || 0
            };
            
            // Validate using the schema
            const validationResult = insertPlantSchema.safeParse(plantToInsert);
            
            if (validationResult.success) {
              await storage.createPlant(validationResult.data);
              restoreResults.success++;
            } else {
              const validationError = fromZodError(validationResult.error);
              restoreResults.failed++;
              restoreResults.errors.push(`Validation error: ${validationError.message}`);
            }
          } catch (insertError) {
            restoreResults.failed++;
            restoreResults.errors.push(`Error inserting plant: ${(insertError as Error).message}`);
          }
        }
      }
      
      // Generate response
      const message = restoreResults.success > 0 
        ? `Successfully restored ${restoreResults.success} plants.` 
        : "No plants were restored.";
      
      const detailedErrors = restoreResults.errors.length > 0 
        ? `There were ${restoreResults.failed} errors.` 
        : "";
      
      res.json({
        ...restoreResults,
        message,
        detailedErrors
      });
    } catch (error) {
      console.error("Error restoring data:", error);
      res.status(500).json({ message: "Failed to restore plants" });
    }
  });

  // Get all plants with optional search
  app.get("/api/plants", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const searchQuery = req.query.search as string | undefined;
      
      // Get all plants
      const plants = await storage.getAllPlants();
      
      // If search query is provided, filter plants on the server
      if (searchQuery && searchQuery.trim() !== '') {
        const normalizedQuery = searchQuery.toLowerCase().trim();
        const filteredPlants = plants.filter(plant => 
          plant.name.toLowerCase().includes(normalizedQuery) || 
          (plant.scientificName && plant.scientificName.toLowerCase().includes(normalizedQuery))
        );
        res.json(filteredPlants);
      } else {
        // Return all plants if no search query
        res.json(plants);
      }
    } catch (error) {
      console.error("Error fetching plants:", error);
      res.status(500).json({ message: "Failed to fetch plants" });
    }
  });

  // Get plant by ID
  app.get("/api/plants/:id", isAuthenticated, async (req: Request, res: Response) => {
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
  
  // Add stock to plant
  app.post("/api/plants/:id/add-stock", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { quantityToAdd, plantingYear } = req.body;
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      if (!quantityToAdd || isNaN(parseInt(quantityToAdd)) || parseInt(quantityToAdd) <= 0) {
        return res.status(400).json({ message: "Quantity to add must be a positive number" });
      }
      
      if (!plantingYear || isNaN(parseInt(plantingYear))) {
        return res.status(400).json({ message: "Valid planting year is required" });
      }
      
      // Get the current plant
      const currentPlant = await storage.getPlant(id);
      if (!currentPlant) {
        return res.status(404).json({ message: "Plant not found" });
      }
      
      // If the planting year is different from the current one, create a new entry
      // For now, we'll just update the existing plant's data
      // In a real-world scenario with proper inventory tracking, you might want to
      // create a separate inventory entry for each planting year
      
      // Update the plant with the new quantity and planting year
      const updatedPlant = await storage.updatePlant({
        id: currentPlant.id,
        name: currentPlant.name,
        scientificName: currentPlant.scientificName,
        quantity: currentPlant.quantity + parseInt(quantityToAdd),
        plantingYear: parseInt(plantingYear)
      });
      
      if (!updatedPlant) {
        return res.status(500).json({ message: "Failed to update plant quantity" });
      }
      
      res.json({ 
        message: "Stock updated successfully",
        plant: updatedPlant
      });
    } catch (error) {
      console.error("Error adding stock to plant:", error);
      res.status(500).json({ message: "Failed to add stock to plant" });
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

  // Generate cultivation declaration report (Greek format)
  app.get("/api/plants/export/cultivation-declaration", async (req: Request, res: Response) => {
    try {
      console.log("Initiating Cultivation Declaration Report generation (sorted by name and planting year) with custom font...");
      
      // Check if we should exclude plants with zero quantity
      const excludeZero = req.query.excludeZero === 'true';
      if (excludeZero) {
        console.log("Will exclude plants with zero quantity from the report");
      }
      
      // Get all plant views with their inventory entries
      const plantViews = await storage.getAllPlantViews();
      
      // Create flattened entries for the report
      let flattenedEntries: Array<{
        name: string;
        scientificName: string;
        plantingYear: number;
        quantity: number;
      }> = [];
      
      // Flatten the plant views into individual entries
      plantViews.forEach(plantView => {
        // Debug log for American Beech
        if (plantView.name === 'American Beech') {
          console.log(`American Beech inventory entries: ${JSON.stringify(plantView.inventoryEntries)}`);
        }
        
        plantView.inventoryEntries.forEach(entry => {
          // Filter out zero quantities if requested
          if (!excludeZero || entry.quantity > 0) {
            flattenedEntries.push({
              name: plantView.name,
              scientificName: plantView.scientificName,
              plantingYear: entry.plantingYear,
              quantity: entry.quantity
            });
          }
        });
      });
      
      // Log flattened entries count and some samples
      console.log(`Total flattened entries: ${flattenedEntries.length}`);
      if (flattenedEntries.length > 0) {
        console.log(`Sample entry: ${JSON.stringify(flattenedEntries[0])}`);
      }
      
      // Sort flattened entries: primary sort by name, secondary sort by planting year
      const sortedPlants = [...flattenedEntries].sort((a, b) => {
        // First sort by name alphabetically
        const nameComparison = a.name.localeCompare(b.name);
        
        // If names are the same, sort by planting year (oldest first)
        if (nameComparison === 0) {
          return a.plantingYear - b.plantingYear;
        }
        
        // Otherwise, sort by name
        return nameComparison;
      });
      
      // Log American Beech entries in the sorted plants
      const americanBeechEntries = sortedPlants.filter(plant => plant.name === 'American Beech');
      console.log(`American Beech entries in sorted plants: ${JSON.stringify(americanBeechEntries)}`);
      
      // --- Load Custom Font ---
      // Construct the path to the font file
      const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansGreek-Regular.ttf');
      let customFontBytes: Buffer;
      
      try {
        customFontBytes = fs.readFileSync(fontPath);
        console.log("Successfully loaded custom font NotoSansGreek-Regular.ttf");
      } catch (fontError: any) {
        console.error(`Failed to load font file at ${fontPath}. Error: ${fontError.message}`);
        console.error("Please ensure 'NotoSansGreek-Regular.ttf' is placed in the 'public/fonts/' directory.");
        throw new Error(`Font file not found or unreadable at ${fontPath}`);
      }
      
      // Create PDF document with custom embedded font
      const pdfDoc = await PDFDocument.create();
      // Register fontkit with PDFDocument
      pdfDoc.registerFontkit(fontkit);
      const customFont = await pdfDoc.embedFont(customFontBytes);
      
      // Helper function to truncate text if it's too long for the cell width
      const truncateTextForCell = (text: string, maxWidth: number, fontSize: number): string => {
        if (!text) return '';
        
        const textWidth = customFont.widthOfTextAtSize(text, fontSize);
        if (textWidth <= maxWidth) return text;
        
        // If text is too long, truncate it with an ellipsis
        const ellipsis = '...';
        const ellipsisWidth = customFont.widthOfTextAtSize(ellipsis, fontSize);
        const availableWidth = maxWidth - ellipsisWidth;
        
        // Find where to truncate
        let truncatedText = '';
        for (let i = text.length; i > 0; i--) {
          const testText = text.substring(0, i);
          if (customFont.widthOfTextAtSize(testText, fontSize) <= availableWidth) {
            truncatedText = testText + ellipsis;
            break;
          }
        }
        
        return truncatedText;
      };
      
      // Create a portrait page (A4)
      let page = pdfDoc.addPage([595, 842]); // A4 portrait dimensions in points
      const { width, height } = page.getSize();
      // These will be updated when we add new pages
      let currentWidth = width;
      let currentHeight = height;
      
      // Set up dimensions and positions
      const margin = 40;
      const startX = margin;
      const startY = height - margin;
      const tableWidth = width - 2 * margin;
      const rowHeight = 25;
      
      // Draw title
      const title = "ΔΗΛΩΣΗ ΚΑΛΛΙΕΡΓΕΙΑΣ ΓΙΑ ΤΟ 2025";
      const titleWidth = customFont.widthOfTextAtSize(title, 16);
      const titleX = startX + (tableWidth - titleWidth) / 2; // Center title
      const titleY = startY - 30;
      
      page.drawText(title, {
        x: titleX,
        y: titleY,
        size: 16,
        font: customFont,
        color: rgb(0, 0, 0)
      });
      
      // Set up table metrics
      const tableStartY = titleY - 40;
      
      // Define column widths (adjusted for 5 columns)
      // Increased width for "Name" and "Scientific Name" columns
      const colWidths = [40, 170, 170, 60, 60]; 
      
      // Define headers - updated for new column requirements
      const headers = [
        "Α/Α",
        "Name",
        "Scientific Name",
        "Year",
        "Quantity"
      ];
      
      // Draw header line
      page.drawLine({
        start: { x: startX, y: tableStartY + 5 },
        end: { x: width - margin, y: tableStartY + 5 },
        thickness: 1,
        color: rgb(0, 0, 0)
      });
      
      // Draw header text
      let currentX = startX;
      let currentY = tableStartY;
      
      headers.forEach((header, index) => {
        page.drawText(header, {
          x: currentX + 5,
          y: currentY - 15,
          size: 11,
          font: customFont,
          color: rgb(0, 0, 0)
        });
        currentX += colWidths[index];
      });
      
      // Draw line below headers
      page.drawLine({
        start: { x: startX, y: currentY - rowHeight + 7 },
        end: { x: width - margin, y: currentY - rowHeight + 7 },
        thickness: 1,
        color: rgb(0, 0, 0)
      });
      
      currentY -= rowHeight;
      
      // Draw rows
      sortedPlants.forEach((plant, index) => {
        // Check if we need a new page (not enough space for a row)
        if (currentY < margin + rowHeight) {
          // Add a new page
          page = pdfDoc.addPage([595, 842]);
          // Get dimensions of the new page
          const { width: pageWidth, height: pageHeight } = page.getSize();
          currentWidth = pageWidth; // Update current width
          currentHeight = pageHeight; // Update current height
          currentY = currentHeight - margin - rowHeight - 10;
          
          // Redraw headers on new page
          let newPageX = startX;
          const newPageHeaderY = currentY;
          
          // Draw header line on new page
          page.drawLine({
            start: { x: startX, y: newPageHeaderY + 5 },
            end: { x: currentWidth - margin, y: newPageHeaderY + 5 },
            thickness: 1,
            color: rgb(0, 0, 0)
          });
          
          // Draw headers on new page
          headers.forEach((header, idx) => {
            page.drawText(header, {
              x: newPageX + 5,
              y: newPageHeaderY - 15,
              size: 11,
              font: customFont,
              color: rgb(0, 0, 0)
            });
            newPageX += colWidths[idx];
          });
          
          // Draw line below headers on new page
          page.drawLine({
            start: { x: startX, y: newPageHeaderY - rowHeight + 7 },
            end: { x: currentWidth - margin, y: newPageHeaderY - rowHeight + 7 },
            thickness: 1,
            color: rgb(0, 0, 0)
          });
          
          currentY -= rowHeight;
        }
        
        // Prepare and truncate row data
        const fontSize = 10;
        const cellPadding = 5;
        
        // Apply text truncation for each cell
        const rowData = [
          (index + 1).toString(), // Serial number, rarely needs truncation
          truncateTextForCell(plant.name || '', colWidths[1] - cellPadding * 2, fontSize),
          truncateTextForCell(plant.scientificName || '', colWidths[2] - cellPadding * 2, fontSize),
          truncateTextForCell(plant.plantingYear.toString(), colWidths[3] - cellPadding * 2, fontSize),
          truncateTextForCell(plant.quantity.toString(), colWidths[4] - cellPadding * 2, fontSize)
        ];
        
        // Draw row data with the truncated text
        currentX = startX;
        rowData.forEach((text, cellIndex) => {
          page.drawText(text, {
            x: currentX + cellPadding,
            y: currentY - 15,
            size: fontSize,
            font: customFont,
            color: rgb(0, 0, 0)
          });
          currentX += colWidths[cellIndex];
        });
        
        // Draw line below row
        page.drawLine({
          start: { x: startX, y: currentY - rowHeight + 7 },
          end: { x: currentWidth - margin, y: currentY - rowHeight + 7 },
          thickness: 0.5,
          color: rgb(0.7, 0.7, 0.7)
        });
        
        currentY -= rowHeight;
      });
      
      // Add footer with note
      const footerText = excludeZero 
        ? "Σημείωση: Κατάσταση Καλλιεργούμενων Φυτών (Αλφαβητικά και ανά έτος φύτευσης, χωρίς τα φυτά με μηδενική ποσότητα)" 
        : "Σημείωση: Κατάσταση Καλλιεργούμενων Φυτών (Αλφαβητικά και ανά έτος φύτευσης)";
      
      page.drawText(footerText, {
        x: 50,
        y: 30,
        size: 10,
        font: customFont,
        color: rgb(0.5, 0.5, 0.5)
      });
      
      // Finalize PDF and send
      const pdfBytes = await pdfDoc.save();
      
      // Set response headers with timestamp for unique filename
      const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
      const filename = `declaration-cultivation-2025-${timestamp}.pdf`;
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      
      // Send the PDF as a buffer
      res.send(Buffer.from(pdfBytes));
      console.log("Cultivation Declaration Report PDF (sorted by name and planting year) sent successfully");
    } catch (error) {
      console.error("Error generating cultivation declaration PDF:", error);
      res.status(500).json({ message: "Failed to generate cultivation declaration report", error: (error as Error).message });
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
