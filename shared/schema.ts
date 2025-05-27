import { pgTable, text, serial, integer, timestamp, foreignKey, varchar, jsonb, index, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
});

export const loginUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;

// Define Plants base information schema
export const plantBase = pgTable("plant_base", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  scientificName: text("scientific_name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlantBaseSchema = createInsertSchema(plantBase).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updatePlantBaseSchema = createInsertSchema(plantBase).omit({
  createdAt: true,
  updatedAt: true,
});

export type PlantBase = typeof plantBase.$inferSelect;
export type InsertPlantBase = z.infer<typeof insertPlantBaseSchema>;
export type UpdatePlantBase = z.infer<typeof updatePlantBaseSchema>;

// Define plant inventory entries (allows tracking different years/quantities for same plant)
export const plantInventory = pgTable("plant_inventory", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").notNull().references(() => plantBase.id),
  plantingYear: integer("planting_year").notNull(),
  quantity: integer("quantity").notNull(),
  location: text("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlantInventorySchema = createInsertSchema(plantInventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updatePlantInventorySchema = createInsertSchema(plantInventory).omit({
  createdAt: true,
  updatedAt: true,
});

export type PlantInventory = typeof plantInventory.$inferSelect;
export type InsertPlantInventory = z.infer<typeof insertPlantInventorySchema>;
export type UpdatePlantInventory = z.infer<typeof updatePlantInventorySchema>;

// For backward compatibility, keep old plants schema during migration
export const plants = pgTable("plants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  scientificName: text("scientific_name").notNull(),
  plantingYear: integer("planting_year").notNull(),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlantSchema = createInsertSchema(plants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updatePlantSchema = createInsertSchema(plants).omit({
  createdAt: true,
  updatedAt: true,
});

export type Plant = typeof plants.$inferSelect;
export type InsertPlant = z.infer<typeof insertPlantSchema>;
export type UpdatePlant = z.infer<typeof updatePlantSchema>;

// Combined plant view type (for UI) 
export interface PlantView extends PlantBase {
  inventoryEntries: PlantInventory[];
}

// ΠΥ8 - Purchase entries table
export const purchasesPy8 = pgTable("purchases_py8", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // Using text for date to avoid timezone issues
  species: text("species").notNull(),
  variety: text("variety"),
  quantity: integer("quantity").notNull(),
  documentsOrigin: text("documents_origin"),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPurchasesPy8Schema = createInsertSchema(purchasesPy8, {
  date: z.string().min(1, "Date is required"),
  species: z.string().min(1, "Species is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
}).omit({
  id: true,
  createdAt: true,
});

export const updatePurchasesPy8Schema = insertPurchasesPy8Schema.partial();

export type PurchasesPy8 = typeof purchasesPy8.$inferSelect;
export type InsertPurchasesPy8 = z.infer<typeof insertPurchasesPy8Schema>;
export type UpdatePurchasesPy8 = z.infer<typeof updatePurchasesPy8Schema>;

// ΠΥ9 - Sales entries table
export const salesPy9 = pgTable("sales_py9", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // Using text for date to avoid timezone issues
  species: text("species").notNull(),
  variety: text("variety"),
  quantity: integer("quantity").notNull(),
  batchCode: text("batch_code"),
  materialCategory: text("material_category"),
  buyer: text("buyer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSalesPy9Schema = createInsertSchema(salesPy9, {
  date: z.string().min(1, "Date is required"),
  species: z.string().min(1, "Species is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
}).omit({
  id: true,
  createdAt: true,
});

export const updateSalesPy9Schema = insertSalesPy9Schema.partial();

export type SalesPy9 = typeof salesPy9.$inferSelect;
export type InsertSalesPy9 = z.infer<typeof insertSalesPy9Schema>;
export type UpdateSalesPy9 = z.infer<typeof updateSalesPy9Schema>;

// Employment status enum
export const employmentStatusEnum = pgEnum("employment_status", ["ACTIVE", "FORMER"]);

// Employee table for payslip management
export const employees = pgTable("employees", {
  passport: text("passport").primaryKey(), // Passport number as unique identifier
  name: text("name").notNull(),
  designation: text("designation").notNull(),
  paymentMethod: text("payment_method").notNull().default("Bank Transfer"),
  dateOfBirth: date("date_of_birth"),
  arc: text("arc"),
  socialInsurance: text("social_insurance"),
  taxId: text("tax_id"),
  monthlySalary: integer("monthly_salary").notNull(), // Store in cents to avoid decimal issues
  isActive: integer("is_active").notNull().default(1), // 1 for active, 0 for inactive (legacy field)
  status: employmentStatusEnum("status").default("ACTIVE").notNull(),
  leftOn: date("left_on"), // Date when employee left (null if still working)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmployeeSchema = createInsertSchema(employees, {
  passport: z.string().min(1, "Passport number is required"),
  name: z.string().min(1, "Name is required"),
  designation: z.string().min(1, "Designation is required"),
  monthlySalary: z.number().int().positive("Monthly salary must be positive"),
}).omit({
  createdAt: true,
  updatedAt: true,
});

export const updateEmployeeSchema = insertEmployeeSchema.partial();

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type UpdateEmployee = z.infer<typeof updateEmployeeSchema>;

// Payslip records table
export const payslips = pgTable("payslips", {
  id: serial("id").primaryKey(),
  employeePassport: text("employee_passport").notNull().references(() => employees.passport),
  payPeriod: text("pay_period").notNull(), // Format: "YYYY-MM"
  payDate: text("pay_date").notNull(),
  grossSalary: integer("gross_salary").notNull(), // Store in cents
  socialInsurance: integer("social_insurance").notNull(), // Store in cents
  gesy: integer("gesy").notNull(), // Store in cents
  totalDeductions: integer("total_deductions").notNull(), // Store in cents
  netPay: integer("net_pay").notNull(), // Store in cents
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPayslipSchema = createInsertSchema(payslips, {
  payPeriod: z.string().regex(/^\d{4}-\d{2}$/, "Pay period must be in YYYY-MM format"),
  payDate: z.string().min(1, "Pay date is required"),
  grossSalary: z.number().int().positive("Gross salary must be positive"),
}).omit({
  id: true,
  socialInsurance: true, // These will be calculated automatically
  gesy: true,
  totalDeductions: true,
  netPay: true,
  createdAt: true,
});

export const updatePayslipSchema = insertPayslipSchema.partial();

export type Payslip = typeof payslips.$inferSelect;
export type InsertPayslip = z.infer<typeof insertPayslipSchema>;
export type UpdatePayslip = z.infer<typeof updatePayslipSchema>;

// Payslip calculation interface for frontend
export interface PayslipCalculation {
  grossSalary: number;
  socialInsurance: number;
  gesy: number;
  totalDeductions: number;
  netPay: number;
  socialInsuranceRate: number;
  gesyRate: number;
}

// Regulatory check form types enum
export const formTypeEnum = pgEnum("form_type", ["ΦΥ/ΠΥ 3", "Lab Analysis", "Passport"]);

// Regulatory checks table for compliance document tracking
export const regulatoryChecks = pgTable("regulatory_checks", {
  id: serial("id").primaryKey(),
  producerId: text("producer_id").notNull(), // ID of the producer/company
  date: text("date").notNull(), // Date of the check/document
  formType: formTypeEnum("form_type").notNull(), // Type of regulatory form
  documentUrl: text("document_url").notNull(), // Path to uploaded document
  notes: text("notes"), // Optional notes about the check
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRegulatoryCheckSchema = createInsertSchema(regulatoryChecks, {
  producerId: z.string().min(1, "Producer ID is required"),
  date: z.string().min(1, "Date is required"),
  documentUrl: z.string().min(1, "Document is required"),
}).omit({
  id: true,
  createdAt: true,
});

export const updateRegulatoryCheckSchema = insertRegulatoryCheckSchema.partial();

export type RegulatoryCheck = typeof regulatoryChecks.$inferSelect;
export type InsertRegulatoryCheck = z.infer<typeof insertRegulatoryCheckSchema>;
export type UpdateRegulatoryCheck = z.infer<typeof updateRegulatoryCheckSchema>;
