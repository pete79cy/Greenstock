import { 
  plants, type Plant, type InsertPlant, type UpdatePlant, 
  users, type User, type InsertUser,
  plantBase, type PlantBase, type InsertPlantBase, type UpdatePlantBase,
  plantInventory, type PlantInventory, type InsertPlantInventory, type UpdatePlantInventory,
  type PlantView,
  purchasesPy8, type PurchasesPy8, type InsertPurchasesPy8, type UpdatePurchasesPy8,
  salesPy9, type SalesPy9, type InsertSalesPy9, type UpdateSalesPy9,
  employees, type Employee, type InsertEmployee, type UpdateEmployee,
  payslips, type Payslip, type InsertPayslip, type UpdatePayslip, type PayslipCalculation,
  regulatoryChecks, type RegulatoryCheck, type InsertRegulatoryCheck, type UpdateRegulatoryCheck,
  employeeDocuments, type EmployeeDocument, type InsertEmployeeDocument,
  employeeLeaves, type EmployeeLeave, type InsertEmployeeLeave, type UpdateEmployeeLeave,
  employeeLeaveBalances, type EmployeeLeaveBalance, type InsertEmployeeLeaveBalance,
  plantPurchases, type PlantPurchase, type InsertPlantPurchase, type UpdatePlantPurchase, type PlantPurchaseAnalysis,
  documents, type Document, type InsertDocument, type UpdateDocument,
  documentCategories, type DocumentCategory, type InsertDocumentCategory
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc, desc, sql, gte, lte } from "drizzle-orm";

// Modify the interface with CRUD methods for plants
export interface IStorage {
  // User methods
  getAllUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Legacy Plant methods (keep for backward compatibility during migration)
  getAllPlants(): Promise<Plant[]>;
  getPlant(id: number): Promise<Plant | undefined>;
  createPlant(plant: InsertPlant): Promise<Plant>;
  updatePlant(plant: UpdatePlant): Promise<Plant | undefined>;
  deletePlant(id: number): Promise<boolean>;
  
  // New PlantBase methods
  getAllPlantBases(): Promise<PlantBase[]>;
  getPlantBase(id: number): Promise<PlantBase | undefined>;
  createPlantBase(plantBase: InsertPlantBase): Promise<PlantBase>;
  updatePlantBase(plantBase: UpdatePlantBase): Promise<PlantBase | undefined>;
  deletePlantBase(id: number): Promise<boolean>;
  
  // PlantInventory methods
  getAllPlantInventories(): Promise<PlantInventory[]>;
  getInventoryForPlant(plantId: number): Promise<PlantInventory[]>;
  getInventoryEntry(id: number): Promise<PlantInventory | undefined>;
  createInventoryEntry(entry: InsertPlantInventory): Promise<PlantInventory>;
  updateInventoryEntry(entry: UpdatePlantInventory): Promise<PlantInventory | undefined>;
  deleteInventoryEntry(id: number): Promise<boolean>;
  
  // Combined methods for handling the PlantView (PlantBase + Inventory)
  getAllPlantViews(): Promise<PlantView[]>;
  getPlantView(id: number): Promise<PlantView | undefined>;
  createPlantView(plantName: string, scientificName: string, description: string | null, inventoryEntries: { plantingYear: number, quantity: number, location?: string, notes?: string }[]): Promise<PlantView>;
  
  // Additional inventory-related methods
  getInventoryCountForPlant(plantId: number): Promise<number>;
  renamePlant(plantId: number, newName: string, forceRename?: boolean): Promise<Plant | undefined>;
  
  // Migration method
  migrateToNewSchema(): Promise<void>;
  
  // ΠΥ8 Purchase methods
  getAllPurchasesPy8(): Promise<PurchasesPy8[]>;
  getPurchasePy8(id: number): Promise<PurchasesPy8 | undefined>;
  createPurchasePy8(purchase: InsertPurchasesPy8 & { invoiceNumber?: string }): Promise<PurchasesPy8>;
  updatePurchasePy8(id: number, purchase: UpdatePurchasesPy8): Promise<PurchasesPy8 | undefined>;
  deletePurchasePy8(id: number): Promise<boolean>;
  getNextInvoiceNumberPy8(year: number): Promise<string>;
  getPurchasesPy8ByDateRange(startDate: string, endDate: string): Promise<PurchasesPy8[]>;
  
  // ΠΥ9 Sales methods
  getAllSalesPy9(): Promise<SalesPy9[]>;
  getSalePy9(id: number): Promise<SalesPy9 | undefined>;
  createSalePy9(sale: InsertSalesPy9): Promise<SalesPy9>;
  updateSalePy9(id: number, sale: UpdateSalesPy9): Promise<SalesPy9 | undefined>;
  deleteSalePy9(id: number): Promise<boolean>;
  
  // Employee methods
  getAllEmployees(): Promise<Employee[]>;
  getActiveEmployees(): Promise<Employee[]>;
  getFormerEmployees(): Promise<Employee[]>;
  getEmployee(passport: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(passport: string, employee: UpdateEmployee): Promise<Employee | undefined>;
  deleteEmployee(passport: string): Promise<boolean>;
  markEmployeeAsLeft(passport: string, leftDate: string): Promise<Employee | undefined>;
  
  // Payslip methods
  getAllPayslips(): Promise<Payslip[]>;
  getPayslip(id: number): Promise<Payslip | undefined>;
  getPayslipsForEmployee(employeePassport: string): Promise<Payslip[]>;
  createPayslip(payslip: InsertPayslip): Promise<Payslip>;
  updatePayslip(id: number, payslip: UpdatePayslip): Promise<Payslip | undefined>;
  deletePayslip(id: number): Promise<boolean>;
  calculatePayslipDeductions(grossSalaryCents: number): PayslipCalculation;
  
  // Regulatory check methods
  getAllRegulatoryChecks(): Promise<RegulatoryCheck[]>;
  getRegulatoryCheck(id: number): Promise<RegulatoryCheck | undefined>;
  getRegulatoryChecksByProducer(producerId: string): Promise<RegulatoryCheck[]>;
  getRegulatoryChecksByFormType(formType: string): Promise<RegulatoryCheck[]>;
  createRegulatoryCheck(check: InsertRegulatoryCheck): Promise<RegulatoryCheck>;
  updateRegulatoryCheck(id: number, check: UpdateRegulatoryCheck): Promise<RegulatoryCheck | undefined>;
  deleteRegulatoryCheck(id: number): Promise<boolean>;
  
  // Employee document methods
  getEmployeeDocuments(employeePassport: string): Promise<EmployeeDocument[]>;
  getEmployeeDocument(id: number): Promise<EmployeeDocument | undefined>;
  createEmployeeDocument(document: InsertEmployeeDocument): Promise<EmployeeDocument>;
  deleteEmployeeDocument(id: number): Promise<boolean>;
  
  // Employee leave methods
  getEmployeeLeaves(employeePassport: string): Promise<EmployeeLeave[]>;
  createEmployeeLeave(leave: InsertEmployeeLeave): Promise<EmployeeLeave>;
  updateEmployeeLeave(id: number, leave: UpdateEmployeeLeave): Promise<EmployeeLeave | undefined>;
  
  // Employee leave balance methods
  getEmployeeLeaveBalances(employeePassport: string, year: number): Promise<EmployeeLeaveBalance[]>;
  createEmployeeLeaveBalance(balance: InsertEmployeeLeaveBalance): Promise<EmployeeLeaveBalance>;
  
  // Plant purchase methods
  getAllPlantPurchases(): Promise<PlantPurchase[]>;
  getPlantPurchase(id: number): Promise<PlantPurchase | undefined>;
  getPlantPurchasesByPlant(plantId: number): Promise<PlantPurchase[]>;
  getPlantPurchaseHistory(plantName: string, scientificName: string): Promise<PlantPurchase[]>;
  createPlantPurchase(purchase: InsertPlantPurchase): Promise<PlantPurchase>;
  updatePlantPurchase(id: number, purchase: UpdatePlantPurchase): Promise<PlantPurchase | undefined>;
  deletePlantPurchase(id: number): Promise<boolean>;
  getPlantPurchaseAnalysis(): Promise<PlantPurchaseAnalysis>;
  
  // Dashboard statistics methods
  getExpiringRegulatoryChecks(expiryDate: string): Promise<number>;
  getSalesToday(date: string): Promise<number>;
  getPendingPurchaseOrders(): Promise<number>;
  getActiveEmployeesCount(): Promise<number>;
  getTotalPlantsCount(): Promise<number>;
  getMonthlyRevenue(month: string): Promise<number>;
  
  // Document Center methods
  getAllDocuments(): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, document: UpdateDocument): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<boolean>;
  
  // Document Categories methods
  getAllDocumentCategories(): Promise<DocumentCategory[]>;
  getDocumentCategory(id: number): Promise<DocumentCategory | undefined>;
  createDocumentCategory(category: InsertDocumentCategory): Promise<DocumentCategory>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.id));
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Legacy Plant methods (keep for backward compatibility during migration)
  async getAllPlants(): Promise<Plant[]> {
    return await db.select().from(plants);
  }

  async getPlant(id: number): Promise<Plant | undefined> {
    const [plant] = await db.select().from(plants).where(eq(plants.id, id));
    return plant || undefined;
  }

  async createPlant(insertPlant: InsertPlant): Promise<Plant> {
    const now = new Date();
    const [plant] = await db
      .insert(plants)
      .values({
        ...insertPlant,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return plant;
  }

  async updatePlant(updatePlant: UpdatePlant): Promise<Plant | undefined> {
    const { id, ...data } = updatePlant;
    if (!id) return undefined;
    
    // Drizzle requires the condition to compare numeric ID in a specific way
    const result = await db
      .update(plants)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(plants.id, id))
      .returning();
    
    return result[0] || undefined;
  }

  async deletePlant(id: number): Promise<boolean> {
    const result = await db
      .delete(plants)
      .where(eq(plants.id, id))
      .returning({ id: plants.id });
    
    return result.length > 0;
  }

  // New PlantBase methods
  async getAllPlantBases(): Promise<PlantBase[]> {
    return await db.select().from(plantBase).orderBy(asc(plantBase.name));
  }

  async getPlantBase(id: number): Promise<PlantBase | undefined> {
    const [base] = await db.select().from(plantBase).where(eq(plantBase.id, id));
    return base || undefined;
  }

  async createPlantBase(insertPlantBase: InsertPlantBase): Promise<PlantBase> {
    const now = new Date();
    const [base] = await db
      .insert(plantBase)
      .values({
        ...insertPlantBase,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return base;
  }

  async updatePlantBase(updatePlantBase: UpdatePlantBase): Promise<PlantBase | undefined> {
    const { id, ...data } = updatePlantBase;
    if (!id) return undefined;
    
    const result = await db
      .update(plantBase)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(plantBase.id, id))
      .returning();
    
    return result[0] || undefined;
  }

  async deletePlantBase(id: number): Promise<boolean> {
    // This will cascade delete all inventory entries too
    const result = await db
      .delete(plantBase)
      .where(eq(plantBase.id, id))
      .returning({ id: plantBase.id });
    
    return result.length > 0;
  }

  // PlantInventory methods
  async getAllPlantInventories(): Promise<PlantInventory[]> {
    return await db.select().from(plantInventory).orderBy(asc(plantInventory.id));
  }

  async getInventoryForPlant(plantId: number): Promise<PlantInventory[]> {
    return await db
      .select()
      .from(plantInventory)
      .where(eq(plantInventory.plantId, plantId))
      .orderBy(desc(plantInventory.plantingYear));
  }

  async getInventoryEntry(id: number): Promise<PlantInventory | undefined> {
    const [entry] = await db.select().from(plantInventory).where(eq(plantInventory.id, id));
    return entry || undefined;
  }

  async createInventoryEntry(entry: InsertPlantInventory): Promise<PlantInventory> {
    const now = new Date();
    const [inventoryEntry] = await db
      .insert(plantInventory)
      .values({
        ...entry,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return inventoryEntry;
  }

  async updateInventoryEntry(entry: UpdatePlantInventory): Promise<PlantInventory | undefined> {
    const { id, ...data } = entry;
    if (!id) return undefined;
    
    const result = await db
      .update(plantInventory)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(plantInventory.id, id))
      .returning();
    
    return result[0] || undefined;
  }

  async deleteInventoryEntry(id: number): Promise<boolean> {
    const result = await db
      .delete(plantInventory)
      .where(eq(plantInventory.id, id))
      .returning({ id: plantInventory.id });
    
    return result.length > 0;
  }

  // Combined methods for handling the PlantView (PlantBase + Inventory)
  async getAllPlantViews(): Promise<PlantView[]> {
    // Get all plant bases
    const bases = await this.getAllPlantBases();
    
    // For each base, get the inventory entries and construct the PlantViews
    const views: PlantView[] = [];
    
    for (const base of bases) {
      const inventoryEntries = await this.getInventoryForPlant(base.id);
      views.push({
        ...base,
        inventoryEntries
      });
    }
    
    return views;
  }

  async getPlantView(id: number): Promise<PlantView | undefined> {
    const base = await this.getPlantBase(id);
    if (!base) return undefined;
    
    const inventoryEntries = await this.getInventoryForPlant(base.id);
    
    return {
      ...base,
      inventoryEntries
    };
  }

  async createPlantView(
    plantName: string, 
    scientificName: string, 
    description: string | null,
    inventoryEntries: { plantingYear: number, quantity: number, location?: string, notes?: string }[]
  ): Promise<PlantView> {
    // First, create the plant base
    const base = await this.createPlantBase({
      name: plantName,
      scientificName: scientificName,
      description: description || undefined
    });
    
    // Then create all inventory entries
    const entries: PlantInventory[] = [];
    
    for (const entry of inventoryEntries) {
      const inventoryEntry = await this.createInventoryEntry({
        plantId: base.id,
        plantingYear: entry.plantingYear,
        quantity: entry.quantity,
        location: entry.location,
        notes: entry.notes
      });
      
      entries.push(inventoryEntry);
    }
    
    // Return the combined view
    return {
      ...base,
      inventoryEntries: entries
    };
  }

  // Migration method to move data from the old schema to the new schema
  async getInventoryCountForPlant(plantId: number): Promise<number> {
    // Check if plant exists first
    const plant = await this.getPlant(plantId);
    if (!plant) {
      throw new Error("Plant not found");
    }
    
    // Get the count of inventory items for this plant (if using old schema)
    // For old plants schema, we can just return 1 if the plant exists
    return 1;
  }
  
  async renamePlant(plantId: number, newName: string, forceRename: boolean = false): Promise<Plant | undefined> {
    // Check if plant exists
    const plant = await this.getPlant(plantId);
    if (!plant) {
      return undefined; // Plant not found
    }
    
    // If forceRename is false, check if there are inventory entries
    if (!forceRename) {
      const inventoryCount = await this.getInventoryCountForPlant(plantId);
      
      if (inventoryCount > 0) {
        // Plant has inventory and force flag is false, don't allow rename
        throw new Error(`This plant has inventory entries. Use forceRename to proceed with renaming.`);
      }
    }
    
    // Proceed with renaming the plant - maintain all other fields
    return await this.updatePlant({
      id: plantId,
      name: newName,
      scientificName: plant.scientificName,
      plantingYear: plant.plantingYear,
      quantity: plant.quantity
    });
  }

  async migrateToNewSchema(): Promise<void> {
    // Get all plants from the old schema
    const oldPlants = await this.getAllPlants();
    
    // Create a map to store unique plant bases by name + scientific name
    const baseMap = new Map<string, PlantBase>();
    
    // First pass: create all unique plant bases
    for (const plant of oldPlants) {
      const key = `${plant.name}_${plant.scientificName}`;
      
      if (!baseMap.has(key)) {
        const base = await this.createPlantBase({
          name: plant.name,
          scientificName: plant.scientificName,
          description: undefined
        });
        
        baseMap.set(key, base);
      }
    }
    
    // Second pass: create all inventory entries
    for (const plant of oldPlants) {
      const key = `${plant.name}_${plant.scientificName}`;
      const base = baseMap.get(key);
      
      if (base) {
        await this.createInventoryEntry({
          plantId: base.id,
          plantingYear: plant.plantingYear,
          quantity: plant.quantity,
          location: undefined,
          notes: undefined
        });
      }
    }
    
    console.log(`Migration completed: ${oldPlants.length} plants migrated to the new schema`);
  }

  // Function to seed initial plant data if needed
  async seedInitialPlantDataIfNeeded() {
    try {
      // Check if we should use the new schema or the old one
      const plantBaseExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'plant_base'
        );
      `);
      
      if (plantBaseExists.rows[0].exists === true) {
        // Use the new schema
        const basesCount = await db.execute(sql`SELECT COUNT(*) FROM plant_base;`);
        
        if (Number(basesCount.rows[0].count) === 0) {
          // Seed using the new schema
          const initialPlants = [
            {
              name: "Silver Maple",
              scientificName: "Acer saccharinum",
              description: "Fast-growing deciduous tree with silvery undersides to its leaves",
              inventoryEntries: [
                { plantingYear: 2022, quantity: 85, location: "North Area" },
                { plantingYear: 2023, quantity: 35, location: "East Garden" }
              ]
            },
            {
              name: "Japanese Cherry",
              scientificName: "Prunus serrulata",
              description: "Ornamental cherry tree famous for its spring blossoms",
              inventoryEntries: [
                { plantingYear: 2023, quantity: 32, location: "Central Garden" }
              ]
            },
            {
              name: "Blue Spruce",
              scientificName: "Picea pungens",
              description: "Coniferous evergreen tree with distinctive blue-gray needles",
              inventoryEntries: [
                { plantingYear: 2022, quantity: 8, location: "West Area" }
              ]
            },
            {
              name: "American Beech",
              scientificName: "Fagus grandifolia",
              description: "Large deciduous tree with smooth gray bark",
              inventoryEntries: [
                { plantingYear: 2021, quantity: 45, location: "South Woods" }
              ]
            },
            {
              name: "Red Oak",
              scientificName: "Quercus rubra",
              description: "Fast-growing oak with distinctive fall colors",
              inventoryEntries: [
                { plantingYear: 2021, quantity: 62, location: "South Woods" },
                { plantingYear: 2023, quantity: 25, location: "East Garden" }
              ]
            }
          ];
          
          for (const plant of initialPlants) {
            await this.createPlantView(
              plant.name, 
              plant.scientificName, 
              plant.description,
              plant.inventoryEntries
            );
          }
          
          console.log("Initial plant data seeded using new schema");
        }
      } else {
        // Use the old schema
        const allPlants = await this.getAllPlants();
        if (allPlants.length === 0) {
          const initialPlants: InsertPlant[] = [
            {
              name: "Silver Maple",
              scientificName: "Acer saccharinum",
              plantingYear: 2022,
              quantity: 85
            },
            {
              name: "Japanese Cherry",
              scientificName: "Prunus serrulata",
              plantingYear: 2023,
              quantity: 32
            },
            {
              name: "Blue Spruce",
              scientificName: "Picea pungens",
              plantingYear: 2022,
              quantity: 8
            },
            {
              name: "American Beech",
              scientificName: "Fagus grandifolia",
              plantingYear: 2021,
              quantity: 45
            },
            {
              name: "Red Oak",
              scientificName: "Quercus rubra",
              plantingYear: 2021,
              quantity: 62
            }
          ];

          const now = new Date();
          for (const plant of initialPlants) {
            await db.insert(plants).values({
              ...plant,
              createdAt: now,
              updatedAt: now
            });
          }
          console.log("Initial plant data seeded using old schema");
        }
      }
    } catch (error) {
      console.error("Error seeding plant data:", error);
      throw error;
    }
  }

  // ΠΥ8 Purchase methods
  async getAllPurchasesPy8(): Promise<PurchasesPy8[]> {
    return await db.select().from(purchasesPy8).orderBy(desc(purchasesPy8.createdAt));
  }

  async getPurchasePy8(id: number): Promise<PurchasesPy8 | undefined> {
    const [purchase] = await db.select().from(purchasesPy8).where(eq(purchasesPy8.id, id));
    return purchase || undefined;
  }

  async createPurchasePy8(insertPurchase: InsertPurchasesPy8 & { invoiceNumber?: string | null }): Promise<PurchasesPy8> {
    const [purchase] = await db.insert(purchasesPy8).values(insertPurchase).returning();
    return purchase;
  }

  async updatePurchasePy8(id: number, updatePurchase: UpdatePurchasesPy8): Promise<PurchasesPy8 | undefined> {
    const [purchase] = await db
      .update(purchasesPy8)
      .set(updatePurchase)
      .where(eq(purchasesPy8.id, id))
      .returning();
    return purchase || undefined;
  }

  async deletePurchasePy8(id: number): Promise<boolean> {
    const result = await db.delete(purchasesPy8).where(eq(purchasesPy8.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getNextInvoiceNumberPy8(year: number): Promise<string> {
    // Get the highest invoice number for the given year
    const [result] = await db
      .select({ 
        maxInvoice: sql<string>`MAX(invoice_number)` 
      })
      .from(purchasesPy8)
      .where(sql`invoice_number LIKE ${year + '-%'}`);
    
    let nextNumber = 1;
    if (result?.maxInvoice) {
      // Extract the number part after the year and dash
      const parts = result.maxInvoice.split('-');
      if (parts.length === 2) {
        nextNumber = parseInt(parts[1]) + 1;
      }
    }
    
    // Format as YYYY-NNN (e.g., 2025-001)
    return `${year}-${nextNumber.toString().padStart(3, '0')}`;
  }

  async getPurchasesPy8ByDateRange(startDate: string, endDate: string): Promise<PurchasesPy8[]> {
    return await db
      .select()
      .from(purchasesPy8)
      .where(and(
        gte(purchasesPy8.date, startDate),
        lte(purchasesPy8.date, endDate)
      ))
      .orderBy(asc(purchasesPy8.date));
  }

  // ΠΥ9 Sales methods
  async getAllSalesPy9(): Promise<SalesPy9[]> {
    return await db.select().from(salesPy9).orderBy(desc(salesPy9.createdAt));
  }

  async getSalePy9(id: number): Promise<SalesPy9 | undefined> {
    const [sale] = await db.select().from(salesPy9).where(eq(salesPy9.id, id));
    return sale || undefined;
  }

  async createSalePy9(insertSale: InsertSalesPy9): Promise<SalesPy9> {
    const [sale] = await db.insert(salesPy9).values(insertSale).returning();
    return sale;
  }

  async updateSalePy9(id: number, updateSale: UpdateSalesPy9): Promise<SalesPy9 | undefined> {
    const [sale] = await db
      .update(salesPy9)
      .set(updateSale)
      .where(eq(salesPy9.id, id))
      .returning();
    return sale || undefined;
  }

  async deleteSalePy9(id: number): Promise<boolean> {
    const result = await db.delete(salesPy9).where(eq(salesPy9.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Employee methods
  async getAllEmployees(): Promise<Employee[]> {
    return await db.select().from(employees).orderBy(asc(employees.name));
  }

  async getActiveEmployees(): Promise<Employee[]> {
    return await db.select().from(employees).where(eq(employees.status, "ACTIVE")).orderBy(asc(employees.name));
  }

  async getFormerEmployees(): Promise<Employee[]> {
    return await db.select().from(employees).where(eq(employees.status, "FORMER")).orderBy(asc(employees.name));
  }

  async getEmployee(passport: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.passport, passport));
    return employee || undefined;
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    console.log("Storage: Creating employee with data:", insertEmployee);
    try {
      const [employee] = await db.insert(employees).values(insertEmployee).returning();
      console.log("Storage: Employee created successfully:", employee);
      return employee;
    } catch (error) {
      console.error("Storage: Error creating employee:", error);
      throw error;
    }
  }

  async updateEmployee(passport: string, updateEmployee: UpdateEmployee): Promise<Employee | undefined> {
    const [employee] = await db
      .update(employees)
      .set({ ...updateEmployee, updatedAt: new Date() })
      .where(eq(employees.passport, passport))
      .returning();
    return employee || undefined;
  }

  async deleteEmployee(passport: string): Promise<boolean> {
    // Soft delete by setting isActive to 0
    const [employee] = await db
      .update(employees)
      .set({ isActive: 0, updatedAt: new Date() })
      .where(eq(employees.passport, passport))
      .returning();
    return !!employee;
  }

  async markEmployeeAsLeft(passport: string, leftDate: string): Promise<Employee | undefined> {
    const [employee] = await db
      .update(employees)
      .set({ 
        status: "FORMER", 
        leftOn: leftDate, 
        isActive: 0, // Also update legacy field for compatibility
        updatedAt: new Date() 
      })
      .where(eq(employees.passport, passport))
      .returning();
    return employee || undefined;
  }

  // Payslip methods
  async getAllPayslips(): Promise<Payslip[]> {
    return await db.select().from(payslips).orderBy(desc(payslips.createdAt));
  }

  async getPayslipsByPeriod(payPeriod: string): Promise<Payslip[]> {
    return await db.select().from(payslips)
      .where(eq(payslips.payPeriod, payPeriod))
      .orderBy(payslips.employeePassport);
  }

  async getPayslip(id: number): Promise<Payslip | undefined> {
    const [payslip] = await db.select().from(payslips).where(eq(payslips.id, id));
    return payslip || undefined;
  }

  async getPayslipsForEmployee(employeePassport: string): Promise<Payslip[]> {
    return await db
      .select()
      .from(payslips)
      .where(eq(payslips.employeePassport, employeePassport))
      .orderBy(desc(payslips.payPeriod));
  }

  async getPayslipsByMonth(month: string): Promise<Payslip[]> {
    return await db
      .select()
      .from(payslips)
      .where(eq(payslips.payPeriod, month))
      .orderBy(desc(payslips.payDate));
  }

  async createPayslip(insertPayslip: InsertPayslip): Promise<Payslip> {
    // Calculate deductions using the exact formula from your requirements
    const calculations = this.calculatePayslipDeductions(insertPayslip.grossSalary);
    
    const payslipData = {
      ...insertPayslip,
      socialInsurance: Math.round(calculations.socialInsurance * 100), // Convert to cents
      gesy: Math.round(calculations.gesy * 100), // Convert to cents
      totalDeductions: Math.round(calculations.totalDeductions * 100), // Convert to cents
      netPay: Math.round(calculations.netPay * 100), // Convert to cents
    };

    const [payslip] = await db.insert(payslips).values(payslipData).returning();
    return payslip;
  }

  async updatePayslip(id: number, updatePayslip: UpdatePayslip): Promise<Payslip | undefined> {
    // Recalculate deductions if gross salary is being updated
    let payslipData: any = { ...updatePayslip };
    if (updatePayslip.grossSalary !== undefined) {
      const calculations = this.calculatePayslipDeductions(updatePayslip.grossSalary);
      payslipData = {
        ...payslipData,
        socialInsurance: Math.round(calculations.socialInsurance * 100), // Convert to cents
        gesy: Math.round(calculations.gesy * 100), // Convert to cents
        totalDeductions: Math.round(calculations.totalDeductions * 100), // Convert to cents
        netPay: Math.round(calculations.netPay * 100), // Convert to cents
      };
    }

    const [payslip] = await db
      .update(payslips)
      .set(payslipData)
      .where(eq(payslips.id, id))
      .returning();
    return payslip || undefined;
  }

  async deletePayslip(id: number): Promise<boolean> {
    const result = await db.delete(payslips).where(eq(payslips.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  calculatePayslipDeductions(grossSalaryCents: number): PayslipCalculation {
    // Cyprus payroll deduction rates
    const SOCIAL_INSURANCE_RATE = 0.083; // 8.3%
    const GESY_RATE = 0.0265; // 2.65%
    
    // Convert from cents to euros for calculation
    const grossSalary = grossSalaryCents / 100;
    
    // Calculate deductions using your exact formula
    const socialInsurance = Math.round((grossSalary * SOCIAL_INSURANCE_RATE) * 100); // Convert back to cents
    const gesy = Math.round((grossSalary * GESY_RATE) * 100); // Convert back to cents
    const totalDeductions = socialInsurance + gesy;
    const netPay = grossSalaryCents - totalDeductions;
    
    return {
      grossSalary: grossSalaryCents / 100, // Return in euros for display
      socialInsurance: socialInsurance / 100, // Return in euros for display
      gesy: gesy / 100, // Return in euros for display
      totalDeductions: totalDeductions / 100, // Return in euros for display
      netPay: netPay / 100, // Return in euros for display
      socialInsuranceRate: SOCIAL_INSURANCE_RATE,
      gesyRate: GESY_RATE,
    };
  }

  async generatePayslipsPreview(payPeriod: string, payDate: string): Promise<Array<{ employee: Employee; payslip: Omit<InsertPayslip, 'employeePassport'> & { calculations: PayslipCalculation } }>> {
    const activeEmployees = await this.getActiveEmployees();
    console.log("Active employees count:", activeEmployees.length);
    
    // Check if payslips already exist for this period
    const existingPayslips = await db
      .select()
      .from(payslips)
      .where(eq(payslips.payPeriod, payPeriod));
    
    console.log("Existing payslips for period", payPeriod, ":", existingPayslips.length);
    
    const existingEmployeePassports = new Set(existingPayslips.map(p => p.employeePassport));
    console.log("Existing employee passports:", Array.from(existingEmployeePassports));
    
    const eligibleEmployees = activeEmployees.filter(employee => !existingEmployeePassports.has(employee.passport));
    console.log("Eligible employees count:", eligibleEmployees.length);
    console.log("Eligible employees:", eligibleEmployees.map(e => ({ passport: e.passport, name: e.name })));
    
    const payslipPreviews = eligibleEmployees.map(employee => {
        const calculations = this.calculatePayslipDeductions(employee.monthlySalary);
        
        return {
          employee,
          payslip: {
            payPeriod,
            payDate,
            grossSalary: employee.monthlySalary, // Already in cents
            notes: `Auto-generated for ${payPeriod}`,
            calculations
          }
        };
      });
    
    console.log("Generated preview count:", payslipPreviews.length);
    return payslipPreviews;
  }

  async createBulkPayslips(payslipData: Array<{ employeePassport: string; payPeriod: string; payDate: string; grossSalary: number; notes?: string }>): Promise<Payslip[]> {
    const payslipsToInsert = payslipData.map(data => {
      const calculations = this.calculatePayslipDeductions(data.grossSalary);
      
      return {
        ...data,
        socialInsurance: Math.round(calculations.socialInsurance * 100), // Convert to cents
        gesy: Math.round(calculations.gesy * 100),
        totalDeductions: Math.round(calculations.totalDeductions * 100),
        netPay: Math.round(calculations.netPay * 100),
      };
    });

    const insertedPayslips = await db.insert(payslips).values(payslipsToInsert).returning();
    return insertedPayslips;
  }

  // Regulatory check methods
  async getAllRegulatoryChecks(): Promise<RegulatoryCheck[]> {
    return await db.select().from(regulatoryChecks).orderBy(desc(regulatoryChecks.createdAt));
  }

  async getRegulatoryCheck(id: number): Promise<RegulatoryCheck | undefined> {
    const [check] = await db.select().from(regulatoryChecks).where(eq(regulatoryChecks.id, id));
    return check || undefined;
  }

  async getRegulatoryChecksByProducer(producerId: string): Promise<RegulatoryCheck[]> {
    return await db.select().from(regulatoryChecks)
      .where(eq(regulatoryChecks.producerId, producerId))
      .orderBy(desc(regulatoryChecks.createdAt));
  }

  async getRegulatoryChecksByFormType(formType: string): Promise<RegulatoryCheck[]> {
    return await db.select().from(regulatoryChecks)
      .where(eq(regulatoryChecks.formType, formType as any))
      .orderBy(desc(regulatoryChecks.createdAt));
  }

  async createRegulatoryCheck(insertCheck: InsertRegulatoryCheck): Promise<RegulatoryCheck> {
    const [check] = await db
      .insert(regulatoryChecks)
      .values(insertCheck)
      .returning();
    return check;
  }

  async updateRegulatoryCheck(id: number, updateCheck: UpdateRegulatoryCheck): Promise<RegulatoryCheck | undefined> {
    const [check] = await db
      .update(regulatoryChecks)
      .set(updateCheck)
      .where(eq(regulatoryChecks.id, id))
      .returning();
    return check || undefined;
  }

  async deleteRegulatoryCheck(id: number): Promise<boolean> {
    const result = await db.delete(regulatoryChecks).where(eq(regulatoryChecks.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Employee document methods
  async getEmployeeDocuments(employeePassport: string): Promise<EmployeeDocument[]> {
    return await db
      .select()
      .from(employeeDocuments)
      .where(eq(employeeDocuments.employeePassport, employeePassport))
      .orderBy(desc(employeeDocuments.uploadedAt));
  }

  async getEmployeeDocument(id: number): Promise<EmployeeDocument | undefined> {
    const [document] = await db
      .select()
      .from(employeeDocuments)
      .where(eq(employeeDocuments.id, id));
    return document || undefined;
  }

  async createEmployeeDocument(insertDocument: InsertEmployeeDocument): Promise<EmployeeDocument> {
    const [document] = await db
      .insert(employeeDocuments)
      .values(insertDocument)
      .returning();
    return document;
  }

  async deleteEmployeeDocument(id: number): Promise<boolean> {
    const result = await db.delete(employeeDocuments).where(eq(employeeDocuments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Employee leave methods
  async getEmployeeLeaves(employeePassport: string): Promise<EmployeeLeave[]> {
    return await db
      .select()
      .from(employeeLeaves)
      .where(eq(employeeLeaves.employeePassport, employeePassport))
      .orderBy(desc(employeeLeaves.createdAt));
  }

  async createEmployeeLeave(insertLeave: InsertEmployeeLeave): Promise<EmployeeLeave> {
    const [leave] = await db
      .insert(employeeLeaves)
      .values(insertLeave)
      .returning();
    return leave;
  }

  async updateEmployeeLeave(id: number, updateLeave: UpdateEmployeeLeave): Promise<EmployeeLeave | undefined> {
    const [leave] = await db
      .update(employeeLeaves)
      .set(updateLeave)
      .where(eq(employeeLeaves.id, id))
      .returning();
    return leave || undefined;
  }

  // Employee leave balance methods
  async getEmployeeLeaveBalances(employeePassport: string, year: number): Promise<EmployeeLeaveBalance[]> {
    return await db
      .select()
      .from(employeeLeaveBalances)
      .where(
        and(
          eq(employeeLeaveBalances.employeePassport, employeePassport),
          eq(employeeLeaveBalances.year, year)
        )
      )
      .orderBy(asc(employeeLeaveBalances.leaveType));
  }

  async createEmployeeLeaveBalance(insertBalance: InsertEmployeeLeaveBalance): Promise<EmployeeLeaveBalance> {
    const [balance] = await db
      .insert(employeeLeaveBalances)
      .values({
        ...insertBalance,
        remainingDays: insertBalance.totalEntitlement
      })
      .returning();
    return balance;
  }

  // Plant purchase methods
  async getAllPlantPurchases(): Promise<PlantPurchase[]> {
    return await db.select().from(plantPurchases).orderBy(desc(plantPurchases.purchaseDate));
  }

  async getPlantPurchase(id: number): Promise<PlantPurchase | undefined> {
    const [purchase] = await db.select().from(plantPurchases).where(eq(plantPurchases.id, id));
    return purchase || undefined;
  }

  async getPlantPurchasesByPlant(plantId: number): Promise<PlantPurchase[]> {
    return await db.select().from(plantPurchases)
      .where(eq(plantPurchases.plantId, plantId))
      .orderBy(desc(plantPurchases.purchaseDate));
  }

  async getPlantPurchaseHistory(plantName: string, scientificName: string): Promise<PlantPurchase[]> {
    return await db.select().from(plantPurchases)
      .where(and(
        eq(plantPurchases.plantName, plantName),
        eq(plantPurchases.scientificName, scientificName)
      ))
      .orderBy(desc(plantPurchases.purchaseDate));
  }

  async createPlantPurchase(insertPurchase: InsertPlantPurchase): Promise<PlantPurchase> {
    const now = new Date();
    const [purchase] = await db
      .insert(plantPurchases)
      .values({
        ...insertPurchase,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return purchase;
  }

  async updatePlantPurchase(id: number, updatePurchase: UpdatePlantPurchase): Promise<PlantPurchase | undefined> {
    const result = await db
      .update(plantPurchases)
      .set({
        ...updatePurchase,
        updatedAt: new Date()
      })
      .where(eq(plantPurchases.id, id))
      .returning();
    
    return result[0] || undefined;
  }

  async deletePlantPurchase(id: number): Promise<boolean> {
    const result = await db
      .delete(plantPurchases)
      .where(eq(plantPurchases.id, id))
      .returning({ id: plantPurchases.id });
    
    return result.length > 0;
  }

  async getPlantPurchaseAnalysis(): Promise<PlantPurchaseAnalysis> {
    // Get total purchases and spending
    const totalsResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total_purchases,
        COALESCE(SUM(total_landed_cost), 0) as total_spent,
        COALESCE(AVG(unit_price), 0) as average_unit_price
      FROM plant_purchases
    `);

    // Get top suppliers
    const suppliersResult = await db.execute(sql`
      SELECT 
        supplier_name,
        COUNT(*) as total_orders,
        SUM(total_landed_cost) as total_spent
      FROM plant_purchases
      GROUP BY supplier_name
      ORDER BY total_spent DESC
      LIMIT 5
    `);

    // Get monthly spending
    const monthlyResult = await db.execute(sql`
      SELECT 
        TO_CHAR(purchase_date, 'YYYY-MM') as month,
        SUM(total_landed_cost) as total_spent,
        COUNT(*) as order_count
      FROM plant_purchases
      WHERE purchase_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(purchase_date, 'YYYY-MM')
      ORDER BY month DESC
    `);

    const totals = totalsResult.rows[0];
    
    return {
      totalPurchases: Number(totals.total_purchases) || 0,
      totalSpent: Number(totals.total_spent) || 0,
      averageUnitPrice: Number(totals.average_unit_price) || 0,
      topSuppliers: suppliersResult.rows.map(row => ({
        supplierName: String(row.supplier_name || ''),
        totalOrders: Number(row.total_orders) || 0,
        totalSpent: Number(row.total_spent) || 0
      })),
      monthlySpending: monthlyResult.rows.map(row => ({
        month: String(row.month || ''),
        totalSpent: Number(row.total_spent) || 0,
        orderCount: Number(row.order_count) || 0
      }))
    };
  }

  // Dashboard statistics methods implementation
  async getExpiringRegulatoryChecks(expiryDate: string): Promise<number> {
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM regulatory_checks 
        WHERE date <= ${expiryDate}
      `);
      return Number(result.rows[0]?.count) || 0;
    } catch (error) {
      console.error("Error getting expiring regulatory checks:", error);
      return 0;
    }
  }

  async getSalesToday(date: string): Promise<number> {
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM sales_py9 
        WHERE date = ${date}
      `);
      return Number(result.rows[0]?.count) || 0;
    } catch (error) {
      console.error("Error getting today's sales:", error);
      return 0;
    }
  }

  async getPendingPurchaseOrders(): Promise<number> {
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM plant_purchases 
        WHERE actual_delivery IS NULL AND expected_delivery IS NOT NULL
      `);
      return Number(result.rows[0]?.count) || 0;
    } catch (error) {
      console.error("Error getting pending purchase orders:", error);
      return 0;
    }
  }

  async getActiveEmployeesCount(): Promise<number> {
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM employees 
        WHERE status = 'ACTIVE'
      `);
      return Number(result.rows[0]?.count) || 0;
    } catch (error) {
      console.error("Error getting active employees count:", error);
      return 0;
    }
  }

  async getTotalPlantsCount(): Promise<number> {
    try {
      const result = await db.execute(sql`
        SELECT COALESCE(SUM(quantity), 0) as total 
        FROM plant_inventory
      `);
      return Number(result.rows[0]?.total) || 0;
    } catch (error) {
      console.error("Error getting total plants count:", error);
      return 0;
    }
  }

  async getMonthlyRevenue(month: string): Promise<number> {
    try {
      // Assuming we need to calculate revenue from sales - this would need actual price data
      const result = await db.execute(sql`
        SELECT COUNT(*) * 100 as revenue 
        FROM sales_py9 
        WHERE date LIKE ${month + '%'}
      `);
      return Number(result.rows[0]?.revenue) || 0;
    } catch (error) {
      console.error("Error getting monthly revenue:", error);
      return 0;
    }
  }

  async getPlantPurchasesCount(month: string): Promise<number> {
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM plant_purchases 
        WHERE purchase_date::text LIKE ${month + '%'}
      `);
      return Number(result.rows[0]?.count) || 0;
    } catch (error) {
      console.error("Error getting plant purchases count:", error);
      return 0;
    }
  }

  async getPurchaseAnalysisCount(): Promise<number> {
    try {
      // Count unique suppliers or total purchase orders as analysis metric
      const result = await db.execute(sql`
        SELECT COUNT(DISTINCT supplier_name) as count 
        FROM plant_purchases 
        WHERE purchase_date >= CURRENT_DATE - INTERVAL '30 days'
      `);
      return Number(result.rows[0]?.count) || 0;
    } catch (error) {
      console.error("Error getting purchase analysis count:", error);
      return 0;
    }
  }

  // Document Center methods
  async getAllDocuments(): Promise<Document[]> {
    return await db.select().from(documents).orderBy(desc(documents.createdAt));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values(insertDocument)
      .returning();
    return document;
  }

  async updateDocument(id: string, updateDocument: UpdateDocument): Promise<Document | undefined> {
    const [document] = await db
      .update(documents)
      .set({
        ...updateDocument,
        updatedAt: new Date()
      })
      .where(eq(documents.id, id))
      .returning();
    return document || undefined;
  }

  async deleteDocument(id: string): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Document Categories methods
  async getAllDocumentCategories(): Promise<DocumentCategory[]> {
    return await db.select().from(documentCategories).orderBy(asc(documentCategories.nameEl));
  }

  async getDocumentCategory(id: number): Promise<DocumentCategory | undefined> {
    const [category] = await db.select().from(documentCategories).where(eq(documentCategories.id, id));
    return category || undefined;
  }

  async createDocumentCategory(insertCategory: InsertDocumentCategory): Promise<DocumentCategory> {
    const [category] = await db
      .insert(documentCategories)
      .values(insertCategory)
      .returning();
    return category;
  }
}

// Create a singleton instance of the storage
const storage = new DatabaseStorage();

// Seed initial data when the server starts
(async () => {
  try {
    await storage.seedInitialPlantDataIfNeeded();
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
})();

export { storage };