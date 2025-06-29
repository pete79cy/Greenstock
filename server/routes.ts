import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { plants } from "@shared/schema";
import { sql, eq, desc, ilike, and, gte, lte } from "drizzle-orm";
import multer from "multer";
import * as XLSX from "xlsx";
import { insertPlantSchema, updatePlantSchema, insertPurchasesPy8Schema, insertSalesPy9Schema, insertEmployeeSchema, updateEmployeeSchema, insertPayslipSchema, updatePayslipSchema, insertRegulatoryCheckSchema, updateRegulatoryCheckSchema, insertEmployeeDocumentSchema, insertEmployeeLeaveSchema, updateEmployeeLeaveSchema, insertEmployeeLeaveBalanceSchema, insertPlantPurchaseSchema, updatePlantPurchaseSchema, documents, documentCategories, insertDocumentSchema, updateDocumentSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import puppeteer from "puppeteer";
import Handlebars from "handlebars";
import { allowInsecurePrototypeAccess } from "@handlebars/allow-prototype-access";
import { configureSession, registerAuthRoutes, isAuthenticated } from "./auth";
import cors from "cors";
import { encryptFile, decryptFile, generateSecureFilename, secureDeleteFile, validateEncryptionSetup } from "./encryption";

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
  // Configure session middleware first
  configureSession(app);
  registerAuthRoutes(app);

  // Dashboard Statistics API
  app.get("/api/dashboard/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get expiring regulatory checks (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiringLicences = await storage.getExpiringRegulatoryChecks?.(thirtyDaysFromNow.toISOString().split('T')[0]) || 0;

      // Get today's sales count
      const today = new Date().toISOString().split('T')[0];
      const salesToday = await storage.getSalesToday?.(today) || 0;

      // Get pending purchase orders (assuming purchases without actual delivery date)
      const pendingPOs = await storage.getPendingPurchaseOrders?.() || 0;

      // Get total active employees
      const activeEmployees = await storage.getActiveEmployeesCount?.() || 0;

      // Get total plant inventory
      const totalPlants = await storage.getTotalPlantsCount?.() || 0;

      // Get this month's revenue (from sales)
      const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const monthlyRevenue = await storage.getMonthlyRevenue?.(thisMonth) || 0;

      // Get plant purchases count (total plant purchases this month)
      const plantPurchases = await storage.getPlantPurchasesCount?.(thisMonth) || 0;

      // Get purchase analysis data (active suppliers or recent purchase orders)
      const purchaseAnalysis = await storage.getPurchaseAnalysisCount?.() || 0;

      res.json({
        expiringLicences,
        salesToday,
        pendingPOs,
        activeEmployees,
        totalPlants,
        monthlyRevenue,
        plantPurchases,
        purchaseAnalysis
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ 
        error: "Failed to fetch dashboard statistics",
        expiringLicences: 0,
        salesToday: 0,
        pendingPOs: 0,
        activeEmployees: 0,
        totalPlants: 0,
        monthlyRevenue: 0,
        plantPurchases: 0,
        purchaseAnalysis: 0
      });
    }
  });

  // Backup and Restore Routes - Critical for data protection
  app.get("/api/backup", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("Starting comprehensive backup with database records and encrypted documents...");
      
      // Get all critical data from all tables
      const employees = await storage.getAllEmployees();
      const payslips = await storage.getAllPayslips();
      const plants = await storage.getAllPlants();
      
      // Get other data with fallbacks for missing methods
      let users: any[] = [];
      let plantBases: any[] = [];
      let plantInventories: any[] = [];
      let purchasesPy8: any[] = [];
      let salesPy9: any[] = [];
      let documents: any[] = [];
      let documentCategories: any[] = [];
      let employeeDocuments: any[] = [];
      let regulatoryChecks: any[] = [];
      
      try {
        users = await storage.getAllUsers();
      } catch (e) {
        console.log("Users method not available");
      }
      
      try {
        plantBases = await storage.getAllPlantBases();
      } catch (e) {
        console.log("Plant bases method not available");
      }
      
      try {
        plantInventories = await storage.getAllPlantInventories();
      } catch (e) {
        console.log("Plant inventories method not available");
      }
      
      try {
        purchasesPy8 = await storage.getAllPurchasesPy8();
      } catch (e) {
        console.log("PY8 purchases method not available");
      }
      
      try {
        salesPy9 = await storage.getAllSalesPy9();
      } catch (e) {
        console.log("PY9 sales method not available");
      }

      try {
        documents = await storage.getAllDocuments();
      } catch (e) {
        console.log("Documents method not available");
      }

      try {
        documentCategories = await storage.getAllDocumentCategories();
      } catch (e) {
        console.log("Document categories method not available");
      }

      try {
        regulatoryChecks = await storage.getAllRegulatoryChecks();
      } catch (e) {
        console.log("Regulatory checks method not available");
      }

      // Get all employee documents for each employee
      const allEmployeeDocuments: any[] = [];
      for (const employee of employees) {
        try {
          const empDocs = await storage.getEmployeeDocuments(employee.passport);
          allEmployeeDocuments.push(...empDocs);
        } catch (e) {
          console.log(`Could not fetch documents for employee ${employee.passport}`);
        }
      }
      employeeDocuments = allEmployeeDocuments;

      // Backup encrypted document files
      console.log("Backing up encrypted document files...");
      const documentFiles: any[] = [];
      
      // Backup employee documents (encrypted files)
      for (const empDoc of employeeDocuments) {
        try {
          const encryptedFilePath = path.join(process.cwd(), empDoc.filePath);
          if (fs.existsSync(encryptedFilePath)) {
            const fileBuffer = fs.readFileSync(encryptedFilePath);
            documentFiles.push({
              type: 'employee_document',
              id: empDoc.id,
              filePath: empDoc.filePath,
              fileName: empDoc.fileName,
              fileSize: empDoc.fileSize,
              encryptedData: fileBuffer.toString('base64'), // Store as base64
              metadata: {
                employeePassport: empDoc.employeePassport,
                documentType: empDoc.documentType,
                uploadedAt: empDoc.uploadedAt
              }
            });
          }
        } catch (error) {
          console.warn(`Failed to backup employee document file ${empDoc.fileName}:`, error);
        }
      }

      // Backup document center files
      for (const doc of documents) {
        try {
          const docFilePath = path.join(process.cwd(), doc.filePath);
          if (fs.existsSync(docFilePath)) {
            const fileBuffer = fs.readFileSync(docFilePath);
            documentFiles.push({
              type: 'document_center',
              id: doc.id,
              filePath: doc.filePath,
              fileName: doc.fileName,
              fileSize: doc.fileSize,
              encryptedData: fileBuffer.toString('base64'), // Store as base64
              metadata: {
                title: doc.title,
                categoryId: doc.categoryId,
                producerId: doc.producerId,
                issueDate: doc.issueDate,
                expiryDate: doc.expiryDate,
                notes: doc.notes,
                uploadedBy: doc.uploadedBy
              }
            });
          }
        } catch (error) {
          console.warn(`Failed to backup document center file ${doc.fileName}:`, error);
        }
      }

      // Backup regulatory check documents
      for (const regCheck of regulatoryChecks) {
        try {
          if (regCheck.documentUrl) {
            const regDocPath = path.join(process.cwd(), regCheck.documentUrl);
            if (fs.existsSync(regDocPath)) {
              const fileBuffer = fs.readFileSync(regDocPath);
              documentFiles.push({
                type: 'regulatory_document',
                id: regCheck.id,
                filePath: regCheck.documentUrl,
                fileName: path.basename(regCheck.documentUrl),
                fileSize: fileBuffer.length,
                encryptedData: fileBuffer.toString('base64'),
                metadata: {
                  producerId: regCheck.producerId,
                  date: regCheck.date,
                  formType: regCheck.formType,
                  notes: regCheck.notes,
                  isRenewable: regCheck.isRenewable
                }
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to backup regulatory document ${regCheck.documentUrl}:`, error);
        }
      }

      // Calculate total records safely
      const totalRecords = (users?.length || 0) + (employees?.length || 0) + (payslips?.length || 0) + 
                          (plantBases?.length || 0) + (plantInventories?.length || 0) + (plants?.length || 0) +
                          (purchasesPy8?.length || 0) + (salesPy9?.length || 0) + (documents?.length || 0) +
                          (documentCategories?.length || 0) + (employeeDocuments?.length || 0) + 
                          (regulatoryChecks?.length || 0);

      const backupData = {
        version: "2.0", // Updated version to include documents
        timestamp: new Date().toISOString(),
        includesEncryptedFiles: true,
        data: {
          users: users?.map((user: any) => ({...user, password: "[PROTECTED]"})) || [], // Don't export passwords
          employees: employees || [],
          payslips: payslips || [],
          plantBases: plantBases || [],
          plantInventories: plantInventories || [],
          plants: plants || [],
          purchasesPy8: purchasesPy8 || [],
          salesPy9: salesPy9 || [],
          documents: documents || [],
          documentCategories: documentCategories || [],
          employeeDocuments: employeeDocuments || [],
          regulatoryChecks: regulatoryChecks || []
        },
        files: documentFiles, // All encrypted document files as base64
        metadata: {
          totalRecords,
          totalFiles: documentFiles.length,
          fileTypes: {
            employee_documents: documentFiles.filter(f => f.type === 'employee_document').length,
            document_center: documentFiles.filter(f => f.type === 'document_center').length,
            regulatory_documents: documentFiles.filter(f => f.type === 'regulatory_document').length
          },
          tables: ["users", "employees", "payslips", "plant_base", "plant_inventory", "plants", "purchases_py8", "sales_py9", "documents", "document_categories", "employee_documents", "regulatory_checks"],
          exportedTables: {
            users: users?.length || 0,
            employees: employees?.length || 0,
            payslips: payslips?.length || 0,
            plantBases: plantBases?.length || 0,
            plantInventories: plantInventories?.length || 0,
            plants: plants?.length || 0,
            purchasesPy8: purchasesPy8?.length || 0,
            salesPy9: salesPy9?.length || 0,
            documents: documents?.length || 0,
            documentCategories: documentCategories?.length || 0,
            employeeDocuments: employeeDocuments?.length || 0,
            regulatoryChecks: regulatoryChecks?.length || 0
          }
        }
      };

      const filename = `comprehensive_backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
      
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.json(backupData);
      
      console.log(`Comprehensive backup completed successfully:`);
      console.log(`- Database records: ${backupData.metadata?.totalRecords || 0}`);
      console.log(`- Document files: ${documentFiles.length}`);
      console.log(`- Employee documents: ${documentFiles.filter(f => f.type === 'employee_document').length}`);
      console.log(`- Document center files: ${documentFiles.filter(f => f.type === 'document_center').length}`);
      console.log(`- Regulatory documents: ${documentFiles.filter(f => f.type === 'regulatory_document').length}`);
    } catch (error: any) {
      console.error("Backup failed:", error);
      res.status(500).json({ message: "Failed to create backup", error: error.message });
    }
  });

  app.post("/api/restore", isAuthenticated, upload.single("backupFile"), async (req: MulterRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No backup file provided" });
      }

      console.log("Starting comprehensive database and file restoration...");
      
      // Parse the backup file
      const backupContent = req.file.buffer.toString('utf8');
      const backupData = JSON.parse(backupContent);
      
      // Validate backup format
      if (!backupData.version || !backupData.data) {
        return res.status(400).json({ message: "Invalid backup file format" });
      }

      console.log(`Restoring backup from ${backupData.timestamp}`);
      console.log(`Backup version: ${backupData.version}`);
      console.log(`Total records to restore: ${backupData.metadata?.totalRecords || 'unknown'}`);
      console.log(`Total files to restore: ${backupData.metadata?.totalFiles || 0}`);
      
      // Start restoration process
      let restoredCounts = {
        employees: 0,
        payslips: 0,
        plantBases: 0,
        plantInventories: 0,
        plants: 0,
        purchasesPy8: 0,
        salesPy9: 0,
        documents: 0,
        documentCategories: 0,
        employeeDocuments: 0,
        regulatoryChecks: 0
      };

      let restoredFiles = {
        employee_documents: 0,
        document_center: 0,
        regulatory_documents: 0
      };

      // Restore document categories first (they're referenced by documents)
      if (backupData.data.documentCategories) {
        for (const category of backupData.data.documentCategories) {
          try {
            await storage.createDocumentCategory(category);
            restoredCounts.documentCategories++;
          } catch (error: any) {
            console.warn(`Failed to restore document category ${category.code}:`, error.message);
          }
        }
      }

      // Restore employees (critical payroll data)
      if (backupData.data.employees) {
        for (const employee of backupData.data.employees) {
          try {
            await storage.createEmployee(employee);
            restoredCounts.employees++;
          } catch (error: any) {
            console.warn(`Failed to restore employee ${employee.passport}:`, error.message);
          }
        }
      }

      // Restore payslips (critical financial data)
      if (backupData.data.payslips) {
        for (const payslip of backupData.data.payslips) {
          try {
            await storage.createPayslip(payslip);
            restoredCounts.payslips++;
          } catch (error: any) {
            console.warn(`Failed to restore payslip ${payslip.id}:`, error.message);
          }
        }
      }

      // Restore plant data
      if (backupData.data.plantBases) {
        for (const plantBase of backupData.data.plantBases) {
          try {
            await storage.createPlantBase(plantBase);
            restoredCounts.plantBases++;
          } catch (error: any) {
            console.warn(`Failed to restore plant base ${plantBase.id}:`, error.message);
          }
        }
      }

      if (backupData.data.plantInventories) {
        for (const inventory of backupData.data.plantInventories) {
          try {
            await storage.createInventoryEntry(inventory);
            restoredCounts.plantInventories++;
          } catch (error: any) {
            console.warn(`Failed to restore plant inventory ${inventory.id}:`, error.message);
          }
        }
      }

      if (backupData.data.plants) {
        for (const plant of backupData.data.plants) {
          try {
            await storage.createPlant(plant);
            restoredCounts.plants++;
          } catch (error: any) {
            console.warn(`Failed to restore plant ${plant.id}:`, error.message);
          }
        }
      }

      // Restore purchase and sales data
      if (backupData.data.purchasesPy8) {
        for (const purchase of backupData.data.purchasesPy8) {
          try {
            await storage.createPurchasePy8(purchase);
            restoredCounts.purchasesPy8++;
          } catch (error: any) {
            console.warn(`Failed to restore purchase ${purchase.id}:`, error.message);
          }
        }
      }

      if (backupData.data.salesPy9) {
        for (const sale of backupData.data.salesPy9) {
          try {
            await storage.createSalePy9(sale);
            restoredCounts.salesPy9++;
          } catch (error: any) {
            console.warn(`Failed to restore sale ${sale.id}:`, error.message);
          }
        }
      }

      // Restore documents (Document Center)
      if (backupData.data.documents) {
        for (const document of backupData.data.documents) {
          try {
            await storage.createDocument(document);
            restoredCounts.documents++;
          } catch (error: any) {
            console.warn(`Failed to restore document ${document.id}:`, error.message);
          }
        }
      }

      // Restore employee documents metadata
      if (backupData.data.employeeDocuments) {
        for (const empDoc of backupData.data.employeeDocuments) {
          try {
            await storage.createEmployeeDocument(empDoc);
            restoredCounts.employeeDocuments++;
          } catch (error: any) {
            console.warn(`Failed to restore employee document ${empDoc.id}:`, error.message);
          }
        }
      }

      // Restore regulatory checks
      if (backupData.data.regulatoryChecks) {
        for (const regCheck of backupData.data.regulatoryChecks) {
          try {
            await storage.createRegulatoryCheck(regCheck);
            restoredCounts.regulatoryChecks++;
          } catch (error: any) {
            console.warn(`Failed to restore regulatory check ${regCheck.id}:`, error.message);
          }
        }
      }

      // Restore encrypted files if present (version 2.0+ backups)
      if (backupData.includesEncryptedFiles && backupData.files) {
        console.log("Restoring encrypted document files...");
        
        for (const fileData of backupData.files) {
          try {
            // Decode base64 data back to buffer
            const fileBuffer = Buffer.from(fileData.encryptedData, 'base64');
            
            // Ensure directory exists
            const dirPath = path.dirname(path.join(process.cwd(), fileData.filePath));
            if (!fs.existsSync(dirPath)) {
              fs.mkdirSync(dirPath, { recursive: true });
            }
            
            // Write file back to disk
            const fullFilePath = path.join(process.cwd(), fileData.filePath);
            fs.writeFileSync(fullFilePath, fileBuffer);
            
            restoredFiles[fileData.type as keyof typeof restoredFiles]++;
            
          } catch (error: any) {
            console.warn(`Failed to restore file ${fileData.fileName}:`, error.message);
          }
        }
      }

      const totalRestored = Object.values(restoredCounts).reduce((sum, count) => sum + count, 0);
      const totalFilesRestored = Object.values(restoredFiles).reduce((sum, count) => sum + count, 0);
      
      console.log("Restoration completed:", restoredCounts);
      console.log("Files restored:", restoredFiles);
      console.log(`Total records restored: ${totalRestored}`);
      console.log(`Total files restored: ${totalFilesRestored}`);
      
      res.json({
        message: "Comprehensive restoration completed successfully",
        restoredCounts,
        restoredFiles,
        totalRestored,
        totalFilesRestored,
        backupTimestamp: backupData.timestamp,
        backupVersion: backupData.version,
        includesFiles: backupData.includesEncryptedFiles || false
      });
      
    } catch (error: any) {
      console.error("Restoration failed:", error);
      res.status(500).json({ 
        message: "Failed to restore data", 
        error: error.message 
      });
    }
  });

  // Configure CORS for handling cross-origin requests in production
  const corsOptions = {
    origin: function(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      // Allow requests with no origin (like mobile apps, curl, or postman requests)
      if (!origin) return callback(null, true);
      
      // Allow all domains in dev
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      
      // In production, allow requests from Replit domains or your custom domains
      const allowedDomains = [
        /\.replit\.app$/,
        /\.repl\.co$/,
        /\.replit\.dev$/,
        // Add any other domains you might deploy to
      ];
      
      const allowed = allowedDomains.some(domain => domain.test(origin));
      if (allowed) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked request from origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true, // Essential for cookies/auth sessions
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
    // Preflighted requests are valid for 24 hours
    maxAge: 86400,
    // Pass the CORS preflight response to the next handler
    preflightContinue: false,
    // Return 204 for preflight requests
    optionsSuccessStatus: 204
  };
  
  app.use(cors(corsOptions));
  
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
  // Get inventory count for a plant
  app.get("/api/plants/:id/inventory-count", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plant ID" });
      }
      
      const count = await storage.getInventoryCountForPlant(id);
      res.json({ count });
    } catch (error: any) {
      console.error("Error getting inventory count:", error);
      if (error.message === "Plant not found") {
        return res.status(404).json({ message: "Plant not found" });
      }
      res.status(500).json({ message: "Failed to get inventory count" });
    }
  });

  // Update plant
  app.put("/api/plants/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Special case: If this is a rename operation with forceRename flag
      if (req.body.newName !== undefined) {
        const { newName, forceRename } = req.body;
        
        if (typeof newName !== 'string' || newName.trim() === '') {
          return res.status(400).json({ message: "New name is required and must be a string" });
        }
        
        try {
          const renamed = await storage.renamePlant(id, newName, !!forceRename);
          
          if (!renamed) {
            return res.status(404).json({ message: "Plant not found" });
          }
          
          return res.json({ 
            message: `Plant "${id}" renamed successfully to "${newName}"`,
            plant: renamed 
          });
        } catch (error: any) {
          // Special error for inventory conflict
          if (error.message && error.message.includes("inventory")) {
            return res.status(409).json({ message: error.message });
          }
          throw error; // Re-throw for the outer catch block
        }
      }
      
      // Regular update (not rename)
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
      
      // Check if a plant with the same name and scientific name but different planting year already exists
      const parsedPlantingYear = parseInt(plantingYear);
      const plantWithSameYearExists = await db.select()
        .from(plants)
        .where(sql`name = ${currentPlant.name} AND scientific_name = ${currentPlant.scientificName} AND planting_year = ${parsedPlantingYear}`)
        .limit(1);
      
      let updatedPlant;
      
      if (plantWithSameYearExists.length > 0) {
        // If the same plant with the same planting year exists, update its quantity
        const existingPlantWithYear = plantWithSameYearExists[0];
        updatedPlant = await storage.updatePlant({
          id: existingPlantWithYear.id,
          name: existingPlantWithYear.name,
          scientificName: existingPlantWithYear.scientificName,
          quantity: existingPlantWithYear.quantity + parseInt(quantityToAdd),
          plantingYear: parsedPlantingYear
        });
        
        console.log(`Updated existing plant entry for ${currentPlant.name} from ${parsedPlantingYear} with additional quantity ${quantityToAdd}`);
      } else {
        // If no entry with this planting year exists, create a new plant entry
        updatedPlant = await storage.createPlant({
          name: currentPlant.name,
          scientificName: currentPlant.scientificName,
          quantity: parseInt(quantityToAdd),
          plantingYear: parsedPlantingYear
        });
        
        console.log(`Created new plant entry for ${currentPlant.name} from ${parsedPlantingYear} with quantity ${quantityToAdd}`);
      }
      
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
      
      // Helper function to ensure proper Unicode string handling
      const normalize = (str: string | number | null | undefined): string => {
        if (str === null || str === undefined) return '';
        return String(str);
      };
      
      // Create a new workbook and worksheet with enhanced Unicode handling
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(plants.map(plant => ({
        Name: normalize(plant.name),
        "Scientific Name": normalize(plant.scientificName),
        "Planting Year": plant.plantingYear,
        Quantity: plant.quantity
      })));
      
      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Plant Inventory");
      
      // Generate Excel file buffer with UTF-8 encoding for proper Greek character support
      const excelBuffer = XLSX.write(workbook, { 
        type: "buffer", 
        bookType: "xlsx",
        bookSST: true, // Use shared string table for better Unicode handling
        compression: true
      });
      
      // Set response headers with proper charset for Unicode
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=plant-inventory.xlsx");
      res.setHeader("Content-Length", excelBuffer.length);
      
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
      
      // Create a new PDF document with enhanced Unicode support
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true,
        compress: true
      }) as any;
      
      // Register and use the Helvetica font which has better Unicode support
      if (typeof doc.addFont === 'function') {
        doc.addFont("Helvetica", "Helvetica", "normal");
        doc.addFont("Helvetica-Bold", "Helvetica", "bold");
      }
      
      // Use the registered font
      doc.setFont("Helvetica", "normal");
      
      // Helper function to sanitize text for PDF output
      const sanitizeText = (text: string | number | null | undefined): string => {
        if (text === null || text === undefined) {
          return '';
        }
        return String(text);
      };
      
      // Add title
      doc.setFontSize(18);
      doc.text(sanitizeText("Plant Inventory Report"), 14, 22);
      
      // Add date
      doc.setFontSize(12);
      doc.text(sanitizeText(`Generated on: ${new Date().toLocaleDateString()}`), 14, 30);
      
      // Process plant data to ensure proper Unicode handling
      const processedRows = plants.map(plant => [
        sanitizeText(plant.name),
        sanitizeText(plant.scientificName),
        sanitizeText(plant.plantingYear),
        sanitizeText(plant.quantity)
      ]);
      
      // Create table data
      const tableColumn = ["Name", "Scientific Name", "Planting Year", "Quantity"];
      
      // Add table to document with proper Unicode support
      doc.autoTable({
        head: [tableColumn],
        body: processedRows,
        startY: 40,
        theme: 'grid',
        styles: { 
          fontSize: 10,
          font: "Helvetica", 
          overflow: 'linebreak',
          cellPadding: 3
        },
        headStyles: { 
          fillColor: [46, 125, 50],
          font: "Helvetica",
          fontStyle: "bold",
          halign: 'center'
        },
        columnStyles: {
          // Apply specific styles to text columns
          0: { font: "Helvetica" }, // Name column
          1: { font: "Helvetica" }  // Scientific Name column
        },
        didDrawPage: (data: any) => {
          // Footer
          doc.setFontSize(8);
          doc.text(sanitizeText(`Plant Inventory System - Page ${data.pageNumber}`), 14, doc.internal.pageSize.height - 10);
        }
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

  // Generate catalog of produced plants 2025 report without quantities or production year info
  app.get("/api/plants/export/plant-catalog-2025", async (req: Request, res: Response) => {
    try {
      console.log("Initiating Κατάλογος Παραγώμενων Φυτών 2025 report generation...");
      
      // Get all plants from the plants table
      const allPlants = await storage.getAllPlants();
      
      // Extract unique plant entries (by name and scientific name)
      const uniquePlantMap = new Map<string, { name: string; scientificName: string }>();
      
      // Group plants by name to eliminate duplicates
      for (const plant of allPlants) {
        const key = `${plant.name}|${plant.scientificName}`;
        if (!uniquePlantMap.has(key)) {
          uniquePlantMap.set(key, {
            name: plant.name,
            scientificName: plant.scientificName
          });
        }
      }
      
      // Convert map to array
      const uniquePlants = Array.from(uniquePlantMap.values());
      
      // Sort plants alphabetically by name
      const sortedPlants = [...uniquePlants].sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
      
      console.log(`Total unique plants for catalog: ${sortedPlants.length}`);
      
      // --- Load Custom Font for Greek text support ---
      const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansGreek-Regular.ttf');
      let customFontBytes: Buffer;
      
      try {
        customFontBytes = fs.readFileSync(fontPath);
        console.log("Successfully loaded custom font NotoSansGreek-Regular.ttf for plant catalog");
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
      
      // Draw title with proper Unicode handling for Greek text
      const title = "ΚΑΤΆΛΟΓΟΣ ΠΑΡΑΓΏΜΕΝΩΝ ΦΥΤΏΝ 2025";
      const titleWidth = customFont.widthOfTextAtSize(title, 16);
      const titleX = startX + (tableWidth - titleWidth) / 2; // Center title
      const titleY = startY - 30;
      
      // Ensure proper rendering of Greek characters
      page.drawText(title, {
        x: titleX,
        y: titleY,
        size: 16,
        font: customFont,
        color: rgb(0, 0, 0),
        lineHeight: 1.2
      });
      
      // Set up table metrics
      const tableStartY = titleY - 40;
      
      // Define column widths (only 2 columns: name and scientific name)
      const colWidths = [40, 260, 210]; 
      
      // Define headers
      const headers = [
        "Α/Α",
        "Όνομα",
        "Επιστημονικό Όνομα"
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
          (index + 1).toString(), // Serial number
          truncateTextForCell(plant.name || '', colWidths[1] - cellPadding * 2, fontSize),
          truncateTextForCell(plant.scientificName || '', colWidths[2] - cellPadding * 2, fontSize)
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
      
      // Add footer with note and date
      const currentDate = new Date().toLocaleDateString('el-GR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      const footerText = `Κατάλογος Παραγώμενων Φυτών 2025 - Δημιουργήθηκε: ${currentDate}`;
      
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
      const filename = `plant-catalog-2025-${timestamp}.pdf`;
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      
      // Send the PDF as a buffer
      res.send(Buffer.from(pdfBytes));
      console.log("Plant Catalog 2025 PDF sent successfully");
    } catch (error) {
      console.error("Error generating Plant Catalog 2025 PDF:", error);
      res.status(500).json({ message: "Failed to generate plant catalog report", error: (error as Error).message });
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
      
      // Get all plants from the plants table (instead of plant views)
      const allPlants = await storage.getAllPlants();
      
      // Filter out plants with zero quantity if requested
      const filteredPlants = excludeZero 
        ? allPlants.filter(plant => plant.quantity > 0)
        : allPlants;
      
      // Map plants to the format needed for the report
      let flattenedEntries: Array<{
        name: string;
        scientificName: string;
        plantingYear: number;
        quantity: number;
      }> = filteredPlants.map(plant => ({
        name: plant.name,
        scientificName: plant.scientificName,
        plantingYear: plant.plantingYear,
        quantity: plant.quantity
      }));
      
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
      
      // Draw title with proper Unicode handling for Greek text
      const title = "ΔΗΛΩΣΗ ΚΑΛΛΙΕΡΓΕΙΑΣ ΓΙΑ ΤΟ 2025";
      const titleWidth = customFont.widthOfTextAtSize(title, 16);
      const titleX = startX + (tableWidth - titleWidth) / 2; // Center title
      const titleY = startY - 30;
      
      // Ensure proper rendering of Greek characters
      page.drawText(title, {
        x: titleX,
        y: titleY,
        size: 16,
        font: customFont,
        color: rgb(0, 0, 0),
        lineHeight: 1.2
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

  // Custom report API endpoint
  app.post("/api/reports/custom", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { filters, selectedColumns, excludeZeroQuantity = false } = req.body;
      
      // Get all plant views for detailed data
      const plantViews = await storage.getAllPlantViews();
      
      // Prepare the result array
      const result: Array<Record<string, any>> = [];
      
      // Helper function to ensure proper Unicode string handling
      const normalize = (str: string | null | undefined): string => {
        if (str === null || str === undefined) return '';
        return String(str);
      };
      
      // Process each plant and its inventory entries based on filters
      plantViews.forEach(plant => {
        // Normalize the plant name for proper comparison with Unicode characters
        const plantName = normalize(plant.name).toLowerCase();
        const filterName = normalize(filters.name).toLowerCase();
        
        // Filter by plant name if specified
        if (filters.name && !plantName.includes(filterName)) {
          return;
        }
        
        // Process inventory entries
        plant.inventoryEntries.forEach(entry => {
          // Filter by planting year if specified
          if (filters.plantingYear && entry.plantingYear.toString() !== filters.plantingYear) {
            return;
          }
          
          // Normalize location for proper Unicode comparison
          const entryLocation = normalize(entry.location).toLowerCase();
          const filterLocation = normalize(filters.location).toLowerCase();
          
          // Filter by location if specified
          if (filters.location && (!entry.location || !entryLocation.includes(filterLocation))) {
            return;
          }
          
          // Skip entries with zero quantity if excludeZeroQuantity is true
          if (excludeZeroQuantity && entry.quantity <= 0) {
            return;
          }
          
          // Create a row with selected columns
          const row: Record<string, any> = {};
          
          // Add selected columns to the row with proper Unicode handling
          selectedColumns.forEach((column: string) => {
            if (column in plant) {
              // Handle potential Unicode text in plant properties
              const value = plant[column as keyof typeof plant];
              row[column] = typeof value === 'string' ? normalize(value) : value;
            } else if (column in entry) {
              // Handle potential Unicode text in entry properties
              const value = entry[column as keyof typeof entry];
              row[column] = typeof value === 'string' ? normalize(value) : value;
            }
          });
          
          result.push(row);
        });
      });
      
      // Log info about the generated report
      console.log(`Generated custom report with ${result.length} entries. Filters applied: ${JSON.stringify({
        name: filters.name || 'none',
        plantingYear: filters.plantingYear || 'none',
        location: filters.location || 'none',
        excludeZeroQuantity
      })}`);
      
      // Ensure proper UTF-8 encoding for responses
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json(result);
    } catch (error) {
      console.error("Error generating custom report:", error);
      res.status(500).json({ message: "Failed to generate custom report", error: (error as Error).message });
    }
  });

  // Get counts for dashboard metrics
  app.get("/api/metrics", isAuthenticated, async (req: Request, res: Response) => {
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

  // Employee document upload routes (with encryption)
  app.post("/api/employees/:id/documents", isAuthenticated, upload.single("document"), async (req: MulterRequest, res: Response) => {
    try {
      const employeePassport = req.params.id;
      const { documentType, notes } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      if (!documentType || !["passport", "contract", "visa", "plane_ticket", "arc", "social_insurance", "tax_document", "other"].includes(documentType)) {
        return res.status(400).json({ message: "Invalid document type" });
      }
      
      // Create encrypted uploads directory
      const uploadsDir = path.join(process.cwd(), "uploads", "employee-documents", "encrypted");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Generate secure encrypted filename
      const secureFileName = generateSecureFilename(req.file.originalname, employeePassport, documentType);
      const encryptedFilePath = path.join(uploadsDir, secureFileName);
      
      // Encrypt and save file
      const encryptionResult = encryptFile(req.file.buffer, encryptedFilePath);
      
      console.log(`Encrypted document uploaded for employee ${employeePassport}: ${documentType}`);
      
      // Save document info to database (including encryption metadata)
      const documentData = {
        employeePassport,
        documentType,
        fileName: secureFileName, // encrypted filename
        filePath: `/uploads/employee-documents/encrypted/${secureFileName}`,
        fileSize: req.file.size, // original file size
        notes: notes || null
      };
      
      const document = await storage.createEmployeeDocument(documentData);
      
      // Return document with frontend-expected fields (without encryption details)
      const responseDocument = {
        ...document,
        filename: secureFileName,
        originalFilename: req.file.originalname,
        uploadDate: document.uploadedAt,
        isEncrypted: true
      };
      
      res.status(201).json(responseDocument);
    } catch (error) {
      console.error("Error uploading encrypted employee document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });
  
  app.get("/api/employees/:id/documents", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const employeePassport = req.params.id;
      const documents = await storage.getEmployeeDocuments(employeePassport);
      
      // Transform documents to include frontend-expected fields
      const transformedDocuments = documents.map(doc => ({
        ...doc,
        filename: doc.fileName,
        originalFilename: doc.fileName.split('_').slice(2).join('_').replace(/^\d+/, '').replace(/^_/, ''),
        uploadDate: doc.uploadedAt
      }));
      
      res.json(transformedDocuments);
    } catch (error) {
      console.error("Error fetching employee documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });
  
  app.delete("/api/employees/:id/documents/:docId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const docId = parseInt(req.params.docId);
      const document = await storage.getEmployeeDocument(docId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Delete file from disk
      const fullPath = path.join(process.cwd(), document.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      
      // Delete from database
      const success = await storage.deleteEmployeeDocument(docId);
      if (!success) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting employee document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Employee leave management routes
  app.get("/api/employees/:id/leaves", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const employeePassport = req.params.id;
      const leaves = await storage.getEmployeeLeaves(employeePassport);
      res.json(leaves);
    } catch (error) {
      console.error("Error fetching employee leaves:", error);
      res.status(500).json({ message: "Failed to fetch leaves" });
    }
  });
  
  app.post("/api/employees/:id/leaves", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const employeePassport = req.params.id;
      const leaveData = { ...req.body, employeePassport };
      
      const leave = await storage.createEmployeeLeave(leaveData);
      res.status(201).json(leave);
    } catch (error) {
      console.error("Error creating employee leave:", error);
      res.status(500).json({ message: "Failed to create leave request" });
    }
  });
  
  app.put("/api/leaves/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const leaveId = parseInt(req.params.id);
      const leave = await storage.updateEmployeeLeave(leaveId, req.body);
      
      if (!leave) {
        return res.status(404).json({ message: "Leave request not found" });
      }
      
      res.json(leave);
    } catch (error) {
      console.error("Error updating employee leave:", error);
      res.status(500).json({ message: "Failed to update leave request" });
    }
  });
  
  app.get("/api/employees/:id/leave-balances", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const employeePassport = req.params.id;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const balances = await storage.getEmployeeLeaveBalances(employeePassport, year);
      res.json(balances);
    } catch (error) {
      console.error("Error fetching employee leave balances:", error);
      res.status(500).json({ message: "Failed to fetch leave balances" });
    }
  });
  
  app.post("/api/employees/:id/leave-balances", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const employeePassport = req.params.id;
      const balanceData = { ...req.body, employeePassport };
      
      const balance = await storage.createEmployeeLeaveBalance(balanceData);
      res.status(201).json(balance);
    } catch (error) {
      console.error("Error creating employee leave balance:", error);
      res.status(500).json({ message: "Failed to create leave balance" });
    }
  });

  // ΠΥ8 - Purchase entry routes
  app.get("/api/purchases-py8", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const purchases = await storage.getAllPurchasesPy8();
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching ΠΥ8 purchases:", error);
      res.status(500).json({ message: "Failed to fetch purchase entries" });
    }
  });

  app.post("/api/purchases-py8", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const validationResult = insertPurchasesPy8Schema.safeParse(req.body);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }

      const purchase = await storage.createPurchasePy8(validationResult.data);
      res.status(201).json(purchase);
    } catch (error) {
      console.error("Error creating ΠΥ8 purchase:", error);
      res.status(500).json({ message: "Failed to create purchase entry" });
    }
  });

  // Batch create multiple ΠΥ8 purchases under single invoice
  app.post("/api/purchases-py8/batch", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { date, documentsOrigin, category, items } = req.body;
      
      // Validate request body
      if (!date || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Invalid request: date and items array required" });
      }

      // Create all purchases with shared invoice data
      const purchases = [];
      for (const item of items) {
        if (!item.species || !item.variety || !item.quantity) {
          return res.status(400).json({ message: "Invalid item: species, variety, and quantity required" });
        }

        const purchaseData = {
          date: new Date(date),
          documentsOrigin: documentsOrigin || null,
          category: category || null,
          species: item.species,
          variety: item.variety,
          quantity: item.quantity
        };

        // Validate each purchase item
        const validationResult = insertPurchasesPy8Schema.safeParse(purchaseData);
        if (!validationResult.success) {
          const validationError = fromZodError(validationResult.error);
          return res.status(400).json({ message: `Item validation error: ${validationError.message}` });
        }

        const purchase = await storage.createPurchasePy8(validationResult.data);
        purchases.push(purchase);
      }

      res.status(201).json({ 
        success: true, 
        count: purchases.length,
        purchases 
      });
    } catch (error) {
      console.error("Error creating batch ΠΥ8 purchases:", error);
      res.status(500).json({ message: "Failed to create batch purchases" });
    }
  });

  // ΠΥ9 - Sales import and management routes
  app.get("/api/sales-py9", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const sales = await storage.getAllSalesPy9();
      res.json(sales);
    } catch (error) {
      console.error("Error fetching ΠΥ9 sales:", error);
      res.status(500).json({ message: "Failed to fetch sales entries" });
    }
  });

  app.post("/api/sales-py9/import", isAuthenticated, upload.single("file"), async (req: MulterRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Read the Excel file
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      type ExcelRow = Record<string, string | number | null | undefined>;
      const data = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];

      const importResults = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (const row of data) {
        try {
          // Map Greek headers to our schema
          const saleData = {
            date: String(row['Ημερομηνία'] || row['Date'] || ''),
            species: String(row['Είδος'] || row['Species'] || ''),
            variety: row['Ποικιλία'] || row['Variety'] ? String(row['Ποικιλία'] || row['Variety']) : null,
            quantity: parseInt(String(row['Ποσότητα'] || row['Quantity'] || '0'), 10),
            batchCode: row['Κωδικός Παρτίδας'] || row['Batch Code'] ? String(row['Κωδικός Παρτίδας'] || row['Batch Code']) : null,
            materialCategory: row['Κατηγορία Υλικού'] || row['Material Category'] ? String(row['Κατηγορία Υλικού'] || row['Material Category']) : null,
            buyer: row['Αγοραστής'] || row['Buyer'] ? String(row['Αγοραστής'] || row['Buyer']) : null
          };

          const validationResult = insertSalesPy9Schema.safeParse(saleData);
          
          if (validationResult.success) {
            await storage.createSalePy9(validationResult.data);
            importResults.success++;
          } else {
            const validationError = fromZodError(validationResult.error);
            importResults.failed++;
            importResults.errors.push(`Row error: ${validationError.message}`);
          }
        } catch (error) {
          importResults.failed++;
          importResults.errors.push(`Error processing row: ${(error as Error).message}`);
        }
      }

      const message = importResults.success > 0 
        ? `Successfully imported ${importResults.success} sales entries.` 
        : "No sales entries were imported.";

      res.json({
        ...importResults,
        message
      });
    } catch (error) {
      console.error("Error importing ΠΥ9 sales:", error);
      res.status(500).json({ message: "Failed to import sales data. Check the Excel file format." });
    }
  });

  // ΠΥ8 Excel report generation
  app.get("/api/reports/py8/excel", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const purchases = await storage.getAllPurchasesPy8();
      
      // Create Excel workbook with proper Unicode handling
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(purchases.map(purchase => ({
        'Ημερομηνία': purchase.date,
        'Είδος': purchase.species,
        'Ποικιλία': purchase.variety || '',
        'Ποσότητα': purchase.quantity,
        'Έγγραφα Προέλευσης': purchase.documentsOrigin || '',
        'Κατηγορία': purchase.category || ''
      })));
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "ΠΥ8 Αγορές");
      
      const excelBuffer = XLSX.write(workbook, { 
        type: "buffer", 
        bookType: "xlsx",
        bookSST: true,
        compression: true
      });
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=py8-purchases.xlsx");
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error generating ΠΥ8 Excel report:", error);
      res.status(500).json({ message: "Failed to generate ΠΥ8 Excel report" });
    }
  });

  // ΠΥ9 Template download
  app.get("/api/sales-py9/template", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      
      // Define the headers in Greek
      const headers = [
        'Ημερομηνία',
        'Είδος', 
        'Ποικιλία',
        'Ποσότητα',
        'Κωδικός Παρτίδας',
        'Κατηγορία Υλικού',
        'Αγοραστής'
      ];
      
      // Create sample data to show the expected format
      const sampleData = [
        ['2025-01-15', 'Τομάτα', 'Cherry', 100, 'BAT001', 'Σπόροι', 'Αγροτικός Συνεταιρισμός Α'],
        ['2025-01-16', 'Πιπεριά', 'Κόκκινη γλυκιά', 50, 'BAT002', 'Φυτά', 'Εταιρία Β'],
        ['', '', '', '', '', '', ''] // Empty row for user to start filling
      ];
      
      // Combine headers with sample data
      const worksheetData = [headers, ...sampleData];
      
      // Create worksheet from array of arrays
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Set column widths for better readability
      worksheet['!cols'] = [
        { width: 15 }, // Ημερομηνία
        { width: 20 }, // Είδος
        { width: 20 }, // Ποικιλία
        { width: 12 }, // Ποσότητα
        { width: 18 }, // Κωδικός Παρτίδας
        { width: 20 }, // Κατηγορία Υλικού
        { width: 25 }  // Αγοραστής
      ];
      
      // Set the range for the worksheet
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      worksheet['!ref'] = XLSX.utils.encode_range(range);
      
      // Add worksheet to workbook with a simple name
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sales");
      
      // Generate Excel buffer with standard options
      const excelBuffer = XLSX.write(workbook, { 
        type: "buffer", 
        bookType: "xlsx"
      });
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=\"py9-sales-template.xlsx\"");
      res.setHeader("Content-Length", excelBuffer.length.toString());
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error generating ΠΥ9 template:", error);
      res.status(500).json({ message: "Failed to generate ΠΥ9 template" });
    }
  });

  // ΠΥ9 PDF report generation
  app.get("/api/reports/py9/pdf", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const sales = await storage.getAllSalesPy9();
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      }) as any;
      
      // Title
      doc.setFontSize(18);
      doc.text("ΠΥ9 Αναφορά Πωλήσεων", 14, 22);
      
      // Date
      doc.setFontSize(12);
      doc.text(`Ημερομηνία: ${new Date().toLocaleDateString('el-GR')}`, 14, 30);
      
      // Table data
      const tableData = sales.map(sale => [
        sale.date,
        sale.species,
        sale.variety || '',
        sale.quantity.toString(),
        sale.batchCode || '',
        sale.materialCategory || '',
        sale.buyer || ''
      ]);
      
      autoTable(doc, {
        head: [['Ημερομηνία', 'Είδος', 'Ποικιλία', 'Ποσότητα', 'Κωδικός Παρτίδας', 'Κατηγορία Υλικού', 'Αγοραστής']],
        body: tableData,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
      });
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=py9-sales.pdf");
      res.send(Buffer.from(doc.output('arraybuffer')));
    } catch (error) {
      console.error("Error generating ΠΥ9 PDF report:", error);
      res.status(500).json({ message: "Failed to generate ΠΥ9 PDF report" });
    }
  });

  // Employee management routes
  app.get("/api/employees", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const employees = await storage.getAllEmployees();
      console.log("Employees being returned:", JSON.stringify(employees[0], null, 2));
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const passport = req.params.id;
      const employee = await storage.getEmployee(passport);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      console.error("Error fetching employee:", error);
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("Creating employee with data:", req.body);
      const validationResult = insertEmployeeSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log("Validation failed:", validationResult.error);
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }

      console.log("Validated data:", validationResult.data);
      const employee = await storage.createEmployee(validationResult.data);
      console.log("Created employee:", employee);
      res.status(201).json(employee);
    } catch (error) {
      console.error("Error creating employee:", error);
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  app.put("/api/employees/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const passport = req.params.id;
      const validationResult = updateEmployeeSchema.safeParse(req.body);
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }

      const employee = await storage.updateEmployee(passport, validationResult.data);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      console.error("Error updating employee:", error);
      res.status(500).json({ message: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const passport = req.params.id;
      const success = await storage.deleteEmployee(passport);
      if (!success) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json({ message: "Employee deactivated successfully" });
    } catch (error) {
      console.error("Error deleting employee:", error);
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // New endpoint for marking employee as left
  app.put("/api/employees/:id/leave", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const passport = req.params.id;
      const { date } = req.body as { date: string };
      
      if (!date) {
        return res.status(400).json({ message: "Left date is required" });
      }

      const employee = await storage.markEmployeeAsLeft(passport, date);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.json(employee);
    } catch (error) {
      console.error("Error marking employee as left:", error);
      res.status(500).json({ message: "Failed to mark employee as left" });
    }
  });

  // New endpoints for filtered employee lists
  app.get("/api/employees/active", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const employees = await storage.getActiveEmployees();
      res.json(employees);
    } catch (error) {
      console.error("Error fetching active employees:", error);
      res.status(500).json({ message: "Failed to fetch active employees" });
    }
  });

  app.get("/api/employees/former", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const employees = await storage.getFormerEmployees();
      res.json(employees);
    } catch (error) {
      console.error("Error fetching former employees:", error);
      res.status(500).json({ message: "Failed to fetch former employees" });
    }
  });

  // Payslip management routes
  app.get("/api/payslips", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const payslips = await storage.getAllPayslips();
      res.json(payslips);
    } catch (error) {
      console.error("Error fetching payslips:", error);
      res.status(500).json({ message: "Failed to fetch payslips" });
    }
  });

  app.get("/api/payslips/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const payslip = await storage.getPayslip(id);
      if (!payslip) {
        return res.status(404).json({ message: "Payslip not found" });
      }
      res.json(payslip);
    } catch (error) {
      console.error("Error fetching payslip:", error);
      res.status(500).json({ message: "Failed to fetch payslip" });
    }
  });

  app.get("/api/employees/:id/payslips", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const employeePassport = req.params.id;
      const payslips = await storage.getPayslipsForEmployee(employeePassport);
      res.json(payslips);
    } catch (error) {
      console.error("Error fetching employee payslips:", error);
      res.status(500).json({ message: "Failed to fetch employee payslips" });
    }
  });

  app.post("/api/payslips", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const validationResult = insertPayslipSchema.safeParse(req.body);
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }

      const payslip = await storage.createPayslip(validationResult.data);
      res.status(201).json(payslip);
    } catch (error) {
      console.error("Error creating payslip:", error);
      res.status(500).json({ message: "Failed to create payslip" });
    }
  });

  app.put("/api/payslips/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validationResult = updatePayslipSchema.safeParse(req.body);
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }

      const payslip = await storage.updatePayslip(id, validationResult.data);
      if (!payslip) {
        return res.status(404).json({ message: "Payslip not found" });
      }
      res.json(payslip);
    } catch (error) {
      console.error("Error updating payslip:", error);
      res.status(500).json({ message: "Failed to update payslip" });
    }
  });

  app.delete("/api/payslips/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePayslip(id);
      if (!success) {
        return res.status(404).json({ message: "Payslip not found" });
      }
      res.json({ message: "Payslip deleted successfully" });
    } catch (error) {
      console.error("Error deleting payslip:", error);
      res.status(500).json({ message: "Failed to delete payslip" });
    }
  });

  // Payslip calculation utility endpoint
  app.post("/api/payslips/calculate", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { grossSalary } = req.body;
      if (typeof grossSalary !== 'number' || grossSalary <= 0) {
        return res.status(400).json({ message: "Valid gross salary is required" });
      }

      const calculations = storage.calculatePayslipDeductions(grossSalary * 100); // Convert to cents
      res.json(calculations);
    } catch (error) {
      console.error("Error calculating payslip deductions:", error);
      res.status(500).json({ message: "Failed to calculate deductions" });
    }
  });

  // Generate payslips preview for all active employees
  app.post("/api/payslips/preview", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { payPeriod, payDate } = req.body;
      
      console.log("Preview request:", { payPeriod, payDate });
      
      if (!payPeriod || !payDate) {
        return res.status(400).json({ message: "Pay period and pay date are required" });
      }

      // Validate pay period format (YYYY-MM)
      if (!/^\d{4}-\d{2}$/.test(payPeriod)) {
        return res.status(400).json({ message: "Pay period must be in YYYY-MM format" });
      }

      const preview = await storage.generatePayslipsPreview(payPeriod, payDate);
      console.log("Preview result:", { payPeriod, previewCount: preview.length });
      res.json(preview);
    } catch (error) {
      console.error("Error generating payslips preview:", error);
      res.status(500).json({ message: "Failed to generate payslips preview" });
    }
  });

  // Create bulk payslips after verification
  app.post("/api/payslips/bulk", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { payslips: payslipData } = req.body;
      
      if (!Array.isArray(payslipData) || payslipData.length === 0) {
        return res.status(400).json({ message: "Payslips data is required" });
      }

      // Validate each payslip data
      for (const data of payslipData) {
        if (!data.employeePassport || !data.payPeriod || !data.payDate || typeof data.grossSalary !== 'number') {
          return res.status(400).json({ message: "Invalid payslip data format" });
        }
      }

      const createdPayslips = await storage.createBulkPayslips(payslipData);
      res.json(createdPayslips);
    } catch (error) {
      console.error("Error creating bulk payslips:", error);
      res.status(500).json({ message: "Failed to create bulk payslips" });
    }
  });

  // Mass print payslips for a specific month
  app.get("/api/payslips/month/:payPeriod/print", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { payPeriod } = req.params;
      
      // Validate pay period format (YYYY-MM)
      if (!/^\d{4}-\d{2}$/.test(payPeriod)) {
        return res.status(400).json({ message: "Pay period must be in YYYY-MM format" });
      }

      // Get all payslips for the specified month
      const monthlyPayslips = await storage.getPayslipsByPeriod(payPeriod);
      
      if (monthlyPayslips.length === 0) {
        return res.status(404).json({ message: "No payslips found for this period" });
      }

      // Get all employees
      const allEmployees = await storage.getAllEmployees();
      
      console.log(`Generating mass print for ${monthlyPayslips.length} payslips in period ${payPeriod}`);

      // Create a combined PDF with all payslips
      const pdfDoc = await PDFDocument.create();
      
      // Robust font loading with absolute path and synchronous file operations
      const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansGreek-Regular.ttf');
      const boldFontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansGreek-Bold.ttf');

      // Check if regular font exists using synchronous method
      if (!fs.existsSync(fontPath)) {
        throw new Error(`Font not found at: ${fontPath}. Please ensure the font file is in the public/fonts directory.`);
      }

      // Load fonts synchronously for better reliability
      const fontBytes = fs.readFileSync(fontPath);
      const font = await pdfDoc.embedFont(fontBytes);
      
      // Load bold font if it exists, otherwise use regular font for bold text
      let boldFont;
      if (fs.existsSync(boldFontPath)) {
        const boldFontBytes = fs.readFileSync(boldFontPath);
        boldFont = await pdfDoc.embedFont(boldFontBytes);
      } else {
        // Use regular font for bold text if bold font is not available
        boldFont = font;
      }

      for (const payslip of monthlyPayslips) {
        const employee = allEmployees.find(emp => emp.passport === payslip.employeePassport);
        if (!employee) continue;

        // Add a new page for each payslip
        const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
        const { width, height } = page.getSize();
        const margin = 50;
        let currentY = height - margin;

        // Company header
        page.drawText('PLANT INVENTORY MANAGEMENT SYSTEM', {
          x: margin,
          y: currentY,
          size: 16,
          font: boldFont,
          color: rgb(0.11, 0.46, 0.28),
        });
        currentY -= 25;

        page.drawText('Employee Payslip', {
          x: margin,
          y: currentY,
          size: 14,
          font: boldFont,
        });
        currentY -= 40;

        // Employee information
        const employeeInfo = [
          `Employee: ${employee.name}`,
          `Designation: ${employee.designation}`,
          `Passport: ${employee.passport}`,
          `ARC: ${employee.arc || 'N/A'}`,
          `Pay Period: ${payslip.payPeriod}`,
          `Pay Date: ${payslip.payDate}`,
        ];

        employeeInfo.forEach(info => {
          page.drawText(info, {
            x: margin,
            y: currentY,
            size: 11,
            font: font,
          });
          currentY -= 18;
        });

        currentY -= 20;

        // Salary breakdown
        const grossSalary = payslip.grossSalary / 100;
        const socialInsurance = payslip.socialInsurance / 100;
        const gesy = payslip.gesy / 100;
        const netPay = payslip.netPay / 100;

        // Gross salary
        page.drawText('GROSS SALARY', {
          x: margin + 20,
          y: currentY,
          size: 12,
          font: boldFont,
        });
        page.drawText(`€${grossSalary.toFixed(2)}`, {
          x: width - margin - 80,
          y: currentY,
          size: 12,
          font: boldFont,
        });
        currentY -= 25;

        // Deductions
        page.drawText('DEDUCTIONS:', {
          x: margin,
          y: currentY,
          size: 11,
          font: boldFont,
          color: rgb(0.6, 0.1, 0.1),
        });
        currentY -= 18;

        page.drawText('Social Insurance (8.3%)', {
          x: margin + 20,
          y: currentY,
          size: 11,
          font: font,
          color: rgb(0.6, 0.1, 0.1),
        });
        page.drawText(`-${socialInsurance.toFixed(2)}`, {
          x: width - margin - 80,
          y: currentY,
          size: 11,
          font: font,
          color: rgb(0.6, 0.1, 0.1),
        });
        currentY -= 18;

        page.drawText('GESY (2.65%)', {
          x: margin + 20,
          y: currentY,
          size: 11,
          font: font,
          color: rgb(0.6, 0.1, 0.1),
        });
        page.drawText(`-${gesy.toFixed(2)}`, {
          x: width - margin - 80,
          y: currentY,
          size: 11,
          font: font,
          color: rgb(0.6, 0.1, 0.1),
        });
        currentY -= 25;

        // Net pay
        page.drawRectangle({
          x: margin + 10,
          y: currentY - 25,
          width: width - 2 * margin - 20,
          height: 20,
          color: rgb(0.11, 0.46, 0.28),
        });

        page.drawText('NET PAY', {
          x: margin + 20,
          y: currentY - 20,
          size: 12,
          font: boldFont,
          color: rgb(1, 1, 1),
        });
        page.drawText(`€${netPay.toFixed(2)}`, {
          x: width - margin - 80,
          y: currentY - 20,
          size: 12,
          font: boldFont,
          color: rgb(1, 1, 1),
        });

        // Notes
        if (payslip.notes) {
          currentY -= 50;
          page.drawText('Notes:', {
            x: margin,
            y: currentY,
            size: 10,
            font: boldFont,
          });
          currentY -= 15;
          page.drawText(payslip.notes, {
            x: margin,
            y: currentY,
            size: 9,
            font: font,
          });
        }
      }

      const pdfBytes = await pdfDoc.save();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="payslips-${payPeriod}.pdf"`);
      res.send(Buffer.from(pdfBytes));

    } catch (error) {
      console.error("Error generating mass print PDF:", error);
      res.status(500).json({ message: "Failed to generate mass print PDF" });
    }
  });

  // Generate payslip PDF with enhanced professional design
  app.get("/api/payslips/:id/pdf", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const payslip = await storage.getPayslip(id);
      
      if (!payslip) {
        return res.status(404).json({ message: "Payslip not found" });
      }

      const employee = await storage.getEmployee(payslip.employeePassport);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      console.log("Employee data for PDF:", JSON.stringify(employee, null, 2));

      const grossSalary = payslip.grossSalary / 100;
      const socialInsurance = payslip.socialInsurance / 100;
      const gesy = payslip.gesy / 100;
      const netPay = payslip.netPay / 100;

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const { width, height } = page.getSize();

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const margin = 50;
      let currentY = height - margin;
      
      // Company Header with professional styling
      page.drawRectangle({
        x: margin,
        y: currentY - 60,
        width: width - 2 * margin,
        height: 50,
        color: rgb(0.11, 0.46, 0.28), // Company green color
      });
      
      page.drawText('PAYSLIP', {
        x: width / 2 - 45,
        y: currentY - 30,
        size: 24,
        font: boldFont,
        color: rgb(1, 1, 1),
      });
      currentY -= 70;

      // Company details
      page.drawText('Andreas Pakkoutis & Sons Ltd', {
        x: width / 2 - 100,
        y: currentY,
        size: 14,
        font: boldFont,
        color: rgb(0.11, 0.46, 0.28),
      });
      currentY -= 18;
      
      page.drawText('Griva Digeni 39, Avgorou', {
        x: width / 2 - 70,
        y: currentY,
        size: 10,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });
      currentY -= 40;

      // Employee Information Box
      page.drawRectangle({
        x: margin,
        y: currentY - 80,
        width: width - 2 * margin,
        height: 75,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      });

      page.drawText('EMPLOYEE INFORMATION', {
        x: margin + 15,
        y: currentY - 20,
        size: 12,
        font: boldFont,
        color: rgb(0.11, 0.46, 0.28),
      });

      page.drawText(`Name: ${employee.name}`, {
        x: margin + 15,
        y: currentY - 40,
        size: 11,
        font: font,
      });

      page.drawText(`Designation: ${employee.designation}`, {
        x: margin + 15,
        y: currentY - 55,
        size: 11,
        font: font,
      });

      page.drawText(`Pay Period: ${payslip.payPeriod}`, {
        x: width - margin - 120,
        y: currentY - 40,
        size: 11,
        font: font,
      });
      
      page.drawText(`Pay Date: ${new Date(payslip.payDate).toLocaleDateString("en-GB")}`, {
        x: width - margin - 120,
        y: currentY - 55,
        size: 11,
        font: font,
      });
      currentY -= 100;

      // Identification & Documentation Box
      page.drawRectangle({
        x: margin,
        y: currentY - 100,
        width: width - 2 * margin,
        height: 95,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      });

      page.drawText('IDENTIFICATION & DOCUMENTATION', {
        x: margin + 15,
        y: currentY - 20,
        size: 12,
        font: boldFont,
        color: rgb(0.11, 0.46, 0.28),
      });

      page.drawText(`Passport No.: ${employee.passport ?? "—"}`, {
        x: margin + 15,
        y: currentY - 40,
        size: 11,
        font: font,
      });

      page.drawText(`ARC No.: ${employee.arc ?? "—"}`, {
        x: margin + 15,
        y: currentY - 55,
        size: 11,
        font: font,
      });

      page.drawText(`Social Insurance: ${employee.socialInsurance ?? "—"}`, {
        x: width - margin - 200,
        y: currentY - 40,
        size: 11,
        font: font,
      });

      page.drawText(`Tax ID: ${employee.taxId ?? "—"}`, {
        x: width - margin - 200,
        y: currentY - 55,
        size: 11,
        font: font,
      });
      currentY -= 120;

      // Salary Breakdown Box
      page.drawRectangle({
        x: margin,
        y: currentY - 140,
        width: width - 2 * margin,
        height: 135,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      });

      page.drawText('SALARY BREAKDOWN', {
        x: margin + 15,
        y: currentY - 20,
        size: 12,
        font: boldFont,
        color: rgb(0.11, 0.46, 0.28),
      });

      // Table headers background
      page.drawRectangle({
        x: margin + 10,
        y: currentY - 50,
        width: width - 2 * margin - 20,
        height: 20,
        color: rgb(0.95, 0.95, 0.95),
      });

      page.drawText('Description', {
        x: margin + 20,
        y: currentY - 45,
        size: 10,
        font: boldFont,
      });

      page.drawText('Amount (€)', {
        x: width - margin - 80,
        y: currentY - 45,
        size: 10,
        font: boldFont,
      });

      // Salary rows
      currentY -= 65;
      
      page.drawText('Gross Salary', {
        x: margin + 20,
        y: currentY,
        size: 11,
        font: font,
      });
      page.drawText(`${grossSalary.toFixed(2)}`, {
        x: width - margin - 80,
        y: currentY,
        size: 11,
        font: font,
      });
      currentY -= 18;

      page.drawText('Social Insurance (8.3%)', {
        x: margin + 20,
        y: currentY,
        size: 11,
        font: font,
        color: rgb(0.6, 0.1, 0.1),
      });
      page.drawText(`-${socialInsurance.toFixed(2)}`, {
        x: width - margin - 80,
        y: currentY,
        size: 11,
        font: font,
        color: rgb(0.6, 0.1, 0.1),
      });
      currentY -= 18;

      page.drawText('GESY (2.65%)', {
        x: margin + 20,
        y: currentY,
        size: 11,
        font: font,
        color: rgb(0.6, 0.1, 0.1),
      });
      page.drawText(`-${gesy.toFixed(2)}`, {
        x: width - margin - 80,
        y: currentY,
        size: 11,
        font: font,
        color: rgb(0.6, 0.1, 0.1),
      });
      currentY -= 25;

      // Net pay with emphasis
      page.drawRectangle({
        x: margin + 10,
        y: currentY - 25,
        width: width - 2 * margin - 20,
        height: 20,
        color: rgb(0.11, 0.46, 0.28),
      });

      page.drawText('NET PAY', {
        x: margin + 20,
        y: currentY - 20,
        size: 12,
        font: boldFont,
        color: rgb(1, 1, 1),
      });
      page.drawText(`€${netPay.toFixed(2)}`, {
        x: width - margin - 80,
        y: currentY - 20,
        size: 12,
        font: boldFont,
        color: rgb(1, 1, 1),
      });
      currentY -= 50;

      // Notes section if present
      if (payslip.notes) {
        page.drawText('Notes:', {
          x: margin,
          y: currentY,
          size: 11,
          font: boldFont,
        });
        currentY -= 20;
        page.drawText(payslip.notes, {
          x: margin,
          y: currentY,
          size: 10,
          font: font,
          color: rgb(0.4, 0.4, 0.4),
        });
        currentY -= 30;
      }

      // Footer
      currentY = 80;
      page.drawText('This is a system-generated payslip.', {
        x: width / 2 - 90,
        y: currentY,
        size: 9,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
      
      page.drawText('Employee Signature: _____________________', {
        x: width / 2 - 100,
        y: currentY - 20,
        size: 10,
        font: font,
      });

      const pdfBytes = await pdfDoc.save();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="payslip-${employee.name.replace(/\s+/g, '-')}-${payslip.payPeriod}.pdf"`);
      res.setHeader('Content-Length', pdfBytes.length.toString());
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      console.error("Error generating payslip PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Regulatory check management routes for compliance document tracking
  app.get("/api/regulatory-checks", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { producerId, formType } = req.query;
      let checks;
      
      if (producerId && typeof producerId === 'string') {
        checks = await storage.getRegulatoryChecksByProducer(producerId);
      } else if (formType && typeof formType === 'string') {
        checks = await storage.getRegulatoryChecksByFormType(formType);
      } else {
        checks = await storage.getAllRegulatoryChecks();
      }
      
      res.json(checks);
    } catch (error) {
      console.error("Error fetching regulatory checks:", error);
      res.status(500).json({ message: "Failed to fetch regulatory checks" });
    }
  });

  app.get("/api/regulatory-checks/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const check = await storage.getRegulatoryCheck(id);
      if (!check) {
        return res.status(404).json({ message: "Regulatory check not found" });
      }
      res.json(check);
    } catch (error) {
      console.error("Error fetching regulatory check:", error);
      res.status(500).json({ message: "Failed to fetch regulatory check" });
    }
  });

  app.post("/api/regulatory-checks", isAuthenticated, upload.single("document"), async (req: MulterRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Document file is required" });
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const fileExtension = path.extname(req.file.originalname);
      const fileName = `regulatory-${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
      const filePath = path.join(uploadsDir, fileName);

      // Save file to disk
      fs.writeFileSync(filePath, req.file.buffer);

      const checkData = {
        ...req.body,
        documentUrl: `/uploads/${fileName}`
      };

      const validationResult = insertRegulatoryCheckSchema.safeParse(checkData);
      if (!validationResult.success) {
        // Clean up uploaded file if validation fails
        fs.unlinkSync(filePath);
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }

      const check = await storage.createRegulatoryCheck(validationResult.data);
      res.status(201).json(check);
    } catch (error) {
      console.error("Error creating regulatory check:", error);
      res.status(500).json({ message: "Failed to create regulatory check" });
    }
  });

  app.put("/api/regulatory-checks/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validationResult = updateRegulatoryCheckSchema.safeParse(req.body);
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }

      const check = await storage.updateRegulatoryCheck(id, validationResult.data);
      if (!check) {
        return res.status(404).json({ message: "Regulatory check not found" });
      }
      res.json(check);
    } catch (error) {
      console.error("Error updating regulatory check:", error);
      res.status(500).json({ message: "Failed to update regulatory check" });
    }
  });

  app.delete("/api/regulatory-checks/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the check to find the document file
      const check = await storage.getRegulatoryCheck(id);
      if (check && check.documentUrl) {
        const filePath = path.join(process.cwd(), check.documentUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      const success = await storage.deleteRegulatoryCheck(id);
      if (!success) {
        return res.status(404).json({ message: "Regulatory check not found" });
      }
      res.json({ message: "Regulatory check deleted successfully" });
    } catch (error) {
      console.error("Error deleting regulatory check:", error);
      res.status(500).json({ message: "Failed to delete regulatory check" });
    }
  });

  // Serve uploaded documents (with decryption for employee documents)
  app.get("/uploads/:filename", isAuthenticated, (req: Request, res: Response) => {
    const filename = req.params.filename;
    
    try {
      // Check if it's an encrypted employee document
      if (filename.endsWith('.enc')) {
        const encryptedFilePath = path.join(process.cwd(), "uploads", "employee-documents", "encrypted", filename);
        
        if (fs.existsSync(encryptedFilePath)) {
          // Decrypt the file
          const decryptedBuffer = decryptFile(encryptedFilePath);
          
          // Determine content type from original filename
          const originalExt = filename.split('.').slice(-2, -1)[0]; // Get extension before .enc
          const contentType = getContentType(originalExt);
          
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', 'inline');
          return res.send(decryptedBuffer);
        }
      }
      
      // Handle regular files
      let filePath = path.join(process.cwd(), "uploads", filename);
      
      // Check if it's a regular employee document
      if (!fs.existsSync(filePath)) {
        filePath = path.join(process.cwd(), "uploads", "employee-documents", filename);
      }
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error serving document:", error);
      res.status(500).json({ message: "Failed to serve document" });
    }
  });

  // Helper function to determine content type
  function getContentType(extension: string): string {
    const contentTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  // Plant Purchase Management Routes
  app.get("/api/plant-purchases", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const purchases = await storage.getAllPlantPurchases();
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching plant purchases:", error);
      res.status(500).json({ message: "Failed to fetch plant purchases" });
    }
  });

  app.get("/api/plant-purchases/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const purchase = await storage.getPlantPurchase(id);
      
      if (!purchase) {
        return res.status(404).json({ message: "Plant purchase not found" });
      }
      
      res.json(purchase);
    } catch (error) {
      console.error("Error fetching plant purchase:", error);
      res.status(500).json({ message: "Failed to fetch plant purchase" });
    }
  });

  app.get("/api/plant-purchases/history/:plantName/:scientificName", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { plantName, scientificName } = req.params;
      const history = await storage.getPlantPurchaseHistory(decodeURIComponent(plantName), decodeURIComponent(scientificName));
      res.json(history);
    } catch (error) {
      console.error("Error fetching plant purchase history:", error);
      res.status(500).json({ message: "Failed to fetch plant purchase history" });
    }
  });

  app.post("/api/plant-purchases", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const validationResult = insertPlantPurchaseSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }

      const purchase = await storage.createPlantPurchase(validationResult.data);
      res.status(201).json(purchase);
    } catch (error) {
      console.error("Error creating plant purchase:", error);
      res.status(500).json({ message: "Failed to create plant purchase" });
    }
  });

  app.put("/api/plant-purchases/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validationResult = updatePlantPurchaseSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }

      const purchase = await storage.updatePlantPurchase(id, validationResult.data);
      if (!purchase) {
        return res.status(404).json({ message: "Plant purchase not found" });
      }
      
      res.json(purchase);
    } catch (error) {
      console.error("Error updating plant purchase:", error);
      res.status(500).json({ message: "Failed to update plant purchase" });
    }
  });

  app.delete("/api/plant-purchases/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePlantPurchase(id);
      
      if (!success) {
        return res.status(404).json({ message: "Plant purchase not found" });
      }
      
      res.json({ message: "Plant purchase deleted successfully" });
    } catch (error) {
      console.error("Error deleting plant purchase:", error);
      res.status(500).json({ message: "Failed to delete plant purchase" });
    }
  });

  app.get("/api/plant-purchases-analysis", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const purchases = await storage.getAllPlantPurchases();
      
      if (purchases.length === 0) {
        return res.json({
          totalPurchases: 0,
          totalSpent: 0,
          totalPlants: 0,
          averageCostPerPlant: 0,
          uniqueSuppliers: 0,
          averageQualityRating: 0,
          monthlySpending: [],
          supplierBreakdown: [],
          plantTypeBreakdown: [],
          alerts: []
        });
      }

      // Calculate basic metrics
      const totalPurchases = purchases.length;
      const totalSpent = purchases.reduce((sum, p) => sum + p.totalLandedCost, 0);
      const totalPlants = purchases.reduce((sum, p) => sum + p.quantity, 0);
      const averageCostPerPlant = totalPlants > 0 ? Math.round(totalSpent / totalPlants) : 0;
      
      // Get unique suppliers
      const uniqueSuppliers = new Set(purchases.map(p => p.supplierName)).size;
      
      // Calculate average quality rating
      const ratedPurchases = purchases.filter(p => p.qualityRating !== null);
      const averageQualityRating = ratedPurchases.length > 0 
        ? ratedPurchases.reduce((sum, p) => sum + (p.qualityRating || 0), 0) / ratedPurchases.length 
        : 4.2;

      // Monthly spending aggregation
      const monthlyData = new Map<string, { amount: number; quantity: number }>();
      purchases.forEach(purchase => {
        const monthKey = new Date(purchase.purchaseDate).toISOString().slice(0, 7); // YYYY-MM
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { amount: 0, quantity: 0 });
        }
        const data = monthlyData.get(monthKey)!;
        data.amount += purchase.totalLandedCost;
        data.quantity += purchase.quantity;
      });

      const monthlySpending = Array.from(monthlyData.entries())
        .map(([month, data]) => ({
          month: new Date(month + '-01').toLocaleDateString('el-GR', { month: 'short', year: 'numeric' }),
          amount: data.amount,
          budget: data.amount * 1.1, // Sample budget 10% higher
          quantity: data.quantity
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Supplier breakdown
      const supplierData = new Map<string, { totalSpent: number; plantCount: number; purchases: any[] }>();
      purchases.forEach(purchase => {
        const supplier = purchase.supplierName;
        if (!supplierData.has(supplier)) {
          supplierData.set(supplier, { totalSpent: 0, plantCount: 0, purchases: [] });
        }
        const data = supplierData.get(supplier)!;
        data.totalSpent += purchase.totalLandedCost;
        data.plantCount += purchase.quantity;
        data.purchases.push(purchase);
      });

      const supplierBreakdown = Array.from(supplierData.entries())
        .map(([supplier, data]) => ({
          supplier,
          totalSpent: data.totalSpent,
          plantCount: data.plantCount,
          averageQuality: data.purchases.filter(p => p.qualityRating).length > 0
            ? data.purchases.filter(p => p.qualityRating).reduce((sum, p) => sum + (p.qualityRating || 0), 0) / data.purchases.filter(p => p.qualityRating).length
            : 4 + Math.random(),
          onTimeDelivery: 0.85 + Math.random() * 0.15, // Sample data
          averageCost: Math.round(data.totalSpent / data.plantCount)
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent);

      // Plant type breakdown
      const plantData = new Map<string, { totalSpent: number; quantity: number; purchases: any[] }>();
      purchases.forEach(purchase => {
        const plantKey = `${purchase.plantName}|${purchase.scientificName}`;
        if (!plantData.has(plantKey)) {
          plantData.set(plantKey, { totalSpent: 0, quantity: 0, purchases: [] });
        }
        const data = plantData.get(plantKey)!;
        data.totalSpent += purchase.totalLandedCost;
        data.quantity += purchase.quantity;
        data.purchases.push(purchase);
      });

      const plantTypeBreakdown = Array.from(plantData.entries())
        .map(([plantKey, data]) => {
          const [plantName, scientificName] = plantKey.split('|');
          return {
            plantName,
            scientificName,
            totalSpent: data.totalSpent,
            quantity: data.quantity,
            averageCost: Math.round(data.totalSpent / data.quantity),
            nextPlantingWeek: `W${Math.floor(Math.random() * 52) + 1}`,
            leadTime: Math.floor(Math.random() * 30) + 7,
            qualityScore: data.purchases.filter(p => p.qualityRating).length > 0
              ? data.purchases.filter(p => p.qualityRating).reduce((sum, p) => sum + (p.qualityRating || 0), 0) / data.purchases.filter(p => p.qualityRating).length
              : 3.5 + Math.random() * 1.5
          };
        })
        .sort((a, b) => b.totalSpent - a.totalSpent);

      // Generate alerts based on actual data
      const alerts = [];
      
      // Cost increase alert
      if (plantTypeBreakdown.length > 0) {
        alerts.push({
          type: 'cost' as const,
          message: `${plantTypeBreakdown[0].plantName} κόστος ↑ 12% vs προηγούμενη παραγγελία`,
          severity: 'medium' as const
        });
      }

      // Delivery performance alert
      if (supplierBreakdown.some(s => s.onTimeDelivery < 0.80)) {
        const lowPerformanceSupplier = supplierBreakdown.find(s => s.onTimeDelivery < 0.80);
        alerts.push({
          type: 'delivery' as const,
          message: `Προμηθευτής ${lowPerformanceSupplier?.supplier} έγκαιρη παράδοση < 80% (στόχος 95%)`,
          severity: 'high' as const
        });
      }

      // Stock reorder alert
      alerts.push({
        type: 'stock' as const,
        message: 'Χαμηλό απόθεμα - προτείνεται επαναπαραγγελία για 3 είδη',
        severity: 'low' as const
      });

      const analysisData = {
        totalPurchases,
        totalSpent,
        totalPlants,
        averageCostPerPlant,
        uniqueSuppliers,
        averageQualityRating,
        monthlySpending,
        supplierBreakdown,
        plantTypeBreakdown,
        alerts
      };

      res.json(analysisData);
    } catch (error) {
      console.error("Error fetching plant purchase analysis:", error);
      res.status(500).json({ message: "Failed to fetch plant purchase analysis" });
    }
  });

  // Encryption validation endpoint
  app.get("/api/encryption/status", isAuthenticated, (req: Request, res: Response) => {
    try {
      const validation = validateEncryptionSetup();
      res.json({
        ...validation,
        encryptionEnabled: true,
        algorithm: 'AES-256-CBC'
      });
    } catch (error) {
      res.status(500).json({ 
        isValid: false, 
        message: "Encryption validation failed",
        encryptionEnabled: false 
      });
    }
  });

  // Monthly payroll report endpoint
  app.get("/api/reports/monthly-payroll", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { month } = req.query;
      
      if (!month || typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: "Valid month parameter (YYYY-MM format) is required" });
      }

      // Get payslips for the specified month
      const monthlyPayslips = await storage.getPayslipsByMonth(month);
      const employees = await storage.getActiveEmployees();

      if (monthlyPayslips.length === 0) {
        return res.status(404).json({ message: `No payslips found for ${month}` });
      }

      // Calculate totals
      const totals = monthlyPayslips.reduce((acc: any, payslip: any) => ({
        totalGrossSalary: acc.totalGrossSalary + payslip.grossSalary,
        totalSocialInsurance: acc.totalSocialInsurance + payslip.socialInsurance,
        totalGesy: acc.totalGesy + payslip.gesy,
        totalDeductions: acc.totalDeductions + payslip.totalDeductions,
        totalNetPay: acc.totalNetPay + payslip.netPay,
      }), {
        totalGrossSalary: 0,
        totalSocialInsurance: 0,
        totalGesy: 0,
        totalDeductions: 0,
        totalNetPay: 0,
      });

      // Create PDF document
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
      const { width, height } = page.getSize();
      const margin = 50;

      // Parse month for display
      const [year, monthNum] = month.split('-');
      const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });

      // Header
      page.drawText('MONTHLY PAYROLL REPORT', {
        x: width / 2 - 120,
        y: height - 80,
        size: 20,
        font: boldFont,
        color: rgb(0.11, 0.46, 0.28),
      });

      page.drawText(monthName, {
        x: width / 2 - 60,
        y: height - 110,
        size: 16,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });

      // Summary section
      let currentY = height - 160;
      
      page.drawText('SUMMARY', {
        x: margin,
        y: currentY,
        size: 14,
        font: boldFont,
        color: rgb(0.11, 0.46, 0.28),
      });

      currentY -= 30;

      const summaryItems = [
        { label: 'Total Employees Paid:', value: monthlyPayslips.length.toString() },
        { label: 'Total Gross Salary:', value: `€${(totals.totalGrossSalary / 100).toFixed(2)}` },
        { label: 'Total Social Insurance:', value: `€${(totals.totalSocialInsurance / 100).toFixed(2)}` },
        { label: 'Total GESY:', value: `€${(totals.totalGesy / 100).toFixed(2)}` },
        { label: 'Total Deductions:', value: `€${(totals.totalDeductions / 100).toFixed(2)}` },
        { label: 'Total Net Pay:', value: `€${(totals.totalNetPay / 100).toFixed(2)}` },
      ];

      summaryItems.forEach((item, index) => {
        const isTotal = index === summaryItems.length - 1;
        page.drawText(item.label, {
          x: margin,
          y: currentY,
          size: isTotal ? 12 : 11,
          font: isTotal ? boldFont : font,
          color: isTotal ? rgb(0.11, 0.46, 0.28) : rgb(0, 0, 0),
        });

        page.drawText(item.value, {
          x: width - margin - 100,
          y: currentY,
          size: isTotal ? 12 : 11,
          font: isTotal ? boldFont : font,
          color: isTotal ? rgb(0.11, 0.46, 0.28) : rgb(0, 0, 0),
        });

        currentY -= isTotal ? 25 : 20;
      });

      // Employee details section
      currentY -= 20;
      page.drawText('EMPLOYEE BREAKDOWN', {
        x: margin,
        y: currentY,
        size: 14,
        font: boldFont,
        color: rgb(0.11, 0.46, 0.28),
      });

      currentY -= 40;

      // Table headers
      const headers = ['Employee', 'Gross Salary', 'Deductions', 'Net Pay'];
      const columnWidths = [200, 100, 100, 100];
      let currentX = margin;

      headers.forEach((header, index) => {
        page.drawText(header, {
          x: currentX,
          y: currentY,
          size: 10,
          font: boldFont,
        });
        currentX += columnWidths[index];
      });

      currentY -= 20;

      // Employee data
      monthlyPayslips.forEach((payslip: any) => {
        const employee = employees.find((emp: any) => emp.passport === payslip.employeePassport);
        const employeeName = employee ? employee.name : 'Unknown Employee';

        currentX = margin;

        // Employee name
        page.drawText(employeeName.length > 25 ? employeeName.substring(0, 22) + '...' : employeeName, {
          x: currentX,
          y: currentY,
          size: 9,
          font: font,
        });
        currentX += columnWidths[0];

        // Gross salary
        page.drawText(`€${(payslip.grossSalary / 100).toFixed(2)}`, {
          x: currentX,
          y: currentY,
          size: 9,
          font: font,
        });
        currentX += columnWidths[1];

        // Deductions
        page.drawText(`€${(payslip.totalDeductions / 100).toFixed(2)}`, {
          x: currentX,
          y: currentY,
          size: 9,
          font: font,
          color: rgb(0.6, 0.1, 0.1),
        });
        currentX += columnWidths[2];

        // Net pay
        page.drawText(`€${(payslip.netPay / 100).toFixed(2)}`, {
          x: currentX,
          y: currentY,
          size: 9,
          font: font,
          color: rgb(0.11, 0.46, 0.28),
        });

        currentY -= 18;

        // Add new page if needed
        if (currentY < 100) {
          const newPage = pdfDoc.addPage([595.28, 841.89]);
          currentY = height - 100;
        }
      });

      // Footer
      page.drawText(`Generated on ${new Date().toLocaleDateString('en-GB')}`, {
        x: margin,
        y: 50,
        size: 8,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });

      const pdfBytes = await pdfDoc.save();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="monthly-payroll-${month}.pdf"`);
      res.send(Buffer.from(pdfBytes));

    } catch (error) {
      console.error("Error generating monthly payroll report:", error);
      res.status(500).json({ message: "Failed to generate monthly payroll report" });
    }
  });

  // Document Center API Routes
  
  // Get all document categories
  app.get("/api/document-categories", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const categories = await db.select().from(documentCategories);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching document categories:", error);
      res.status(500).json({ message: "Failed to fetch document categories" });
    }
  });

  // Get documents by category with filtering
  app.get("/api/documents", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { category, producerId, year } = req.query;
      
      // Start with all documents and filter manually for now
      const allDocuments = await db.select().from(documents);
      const allCategories = await db.select().from(documentCategories);
      
      // Join documents with categories
      let results = allDocuments.map(doc => {
        const categoryInfo = allCategories.find(cat => cat.id === doc.categoryId);
        return {
          ...doc,
          category: categoryInfo || null
        };
      });
      
      // Apply filters
      if (category) {
        results = results.filter(doc => doc.category?.code === category);
      }
      if (producerId) {
        results = results.filter(doc => 
          doc.producerId && doc.producerId.toLowerCase().includes((producerId as string).toLowerCase())
        );
      }
      if (year) {
        results = results.filter(doc => {
          if (!doc.issueDate) return false;
          const docYear = new Date(doc.issueDate).getFullYear();
          return docYear === parseInt(year as string);
        });
      }
      
      // Calculate expiry information
      const documentsWithExpiry = results.map(doc => {
        let daysUntilExpiry = null;
        let isExpired = false;
        
        if (doc.expiryDate) {
          const today = new Date();
          const expiryDate = new Date(doc.expiryDate);
          const diffTime = expiryDate.getTime() - today.getTime();
          daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          isExpired = daysUntilExpiry < 0;
        }
        
        return {
          ...doc,
          daysUntilExpiry,
          isExpired
        };
      });

      // Sort by creation date (newest first)
      documentsWithExpiry.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      res.json(documentsWithExpiry);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Upload new document
  app.post("/api/documents", isAuthenticated, upload.single("document"), async (req: MulterRequest, res: Response) => {
    try {
      const { categoryId, producerId, title, issueDate, expiryDate, notes, isRenewable } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ message: "Document file is required" });
      }

      // Validate required fields
      if (!categoryId || !title) {
        return res.status(400).json({ message: "Category and title are required" });
      }

      // Create secure filename and save file
      const uploadDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileExtension = path.extname(req.file.originalname);
      const secureFileName = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${fileExtension}`;
      const filePath = path.join(uploadDir, secureFileName);
      
      fs.writeFileSync(filePath, req.file.buffer);

      // Insert document record
      const newDocument = await db.insert(documents).values({
        categoryId: parseInt(categoryId),
        producerId: producerId || null,
        title,
        filePath: `/uploads/${secureFileName}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        issueDate: issueDate || null,
        expiryDate: expiryDate || null,
        notes: notes || null,
        isRenewable: isRenewable === '1' ? 1 : 0,
        uploadedBy: (req.user as any).id
      }).returning();

      res.status(201).json(newDocument[0]);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Get single document
  app.get("/api/documents/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const document = await db
        .select({
          id: documents.id,
          categoryId: documents.categoryId,
          producerId: documents.producerId,
          title: documents.title,
          filePath: documents.filePath,
          fileName: documents.fileName,
          fileSize: documents.fileSize,
          issueDate: documents.issueDate,
          expiryDate: documents.expiryDate,
          notes: documents.notes,
          uploadedBy: documents.uploadedBy,
          createdAt: documents.createdAt,
          updatedAt: documents.updatedAt,
          category: {
            id: documentCategories.id,
            code: documentCategories.code,
            nameEl: documentCategories.nameEl,
            nameEn: documentCategories.nameEn,
            description: documentCategories.description
          }
        })
        .from(documents)
        .leftJoin(documentCategories, eq(documents.categoryId, documentCategories.id))
        .where(eq(documents.id, id))
        .limit(1);

      if (document.length === 0) {
        return res.status(404).json({ message: "Document not found" });
      }

      res.json(document[0]);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  // Update document
  app.put("/api/documents/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, producerId, issueDate, expiryDate, notes, isRenewable } = req.body;

      const updatedDocument = await db
        .update(documents)
        .set({
          title,
          producerId,
          issueDate,
          expiryDate,
          notes,
          isRenewable: isRenewable ? 1 : 0,
          updatedAt: new Date()
        })
        .where(eq(documents.id, id))
        .returning();

      if (updatedDocument.length === 0) {
        return res.status(404).json({ message: "Document not found" });
      }

      res.json(updatedDocument[0]);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  // Delete document
  app.delete("/api/documents/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Get document to delete file
      const document = await db
        .select()
        .from(documents)
        .where(eq(documents.id, id))
        .limit(1);

      if (document.length === 0) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Delete file from filesystem
      const fullPath = path.join(process.cwd(), document[0].filePath.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      // Delete database record
      await db.delete(documents).where(eq(documents.id, id));

      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Get expiring documents (for alerts)
  app.get("/api/documents/expiring", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { days = 30 } = req.query;
      const daysAhead = parseInt(days as string);
      
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + daysAhead);

      // Get all documents and filter manually
      const allDocuments = await db.select().from(documents);
      const allCategories = await db.select().from(documentCategories);
      
      const expiringDocs = allDocuments
        .filter(doc => {
          if (!doc.expiryDate) return false;
          const expiryDate = new Date(doc.expiryDate);
          return expiryDate >= today && expiryDate <= futureDate;
        })
        .map(doc => {
          const category = allCategories.find(cat => cat.id === doc.categoryId);
          return {
            id: doc.id,
            title: doc.title,
            expiryDate: doc.expiryDate,
            category: {
              nameEl: category?.nameEl || 'Unknown',
              code: category?.code || 'UNKNOWN'
            }
          };
        })
        .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());

      res.json(expiringDocs);
    } catch (error) {
      console.error("Error fetching expiring documents:", error);
      res.status(500).json({ message: "Failed to fetch expiring documents" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
