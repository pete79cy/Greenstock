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
  invoiceNumber: text("invoice_number"),
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
export const formTypeEnum = pgEnum("form_type", ["ΦΥ/ΠΥ 3", "Lab Analysis", "Passport", "Άδεια Εισαγωγής Λιπασμάτων"]);

// Regulatory checks table for compliance document tracking
export const regulatoryChecks = pgTable("regulatory_checks", {
  id: serial("id").primaryKey(),
  producerId: text("producer_id").notNull(), // ID of the producer/company
  date: text("date").notNull(), // Date of the check/document
  formType: formTypeEnum("form_type").notNull(), // Type of regulatory form
  documentUrl: text("document_url").notNull(), // Path to uploaded document
  notes: text("notes"), // Optional notes about the check
  isRenewable: integer("is_renewable").notNull().default(1), // 1 for renewable, 0 for non-renewable
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

// Employee documents table for storing uploaded files
export const employeeDocuments = pgTable("employee_documents", {
  id: serial("id").primaryKey(),
  employeePassport: text("employee_passport").notNull().references(() => employees.passport),
  documentType: text("document_type").notNull(), // passport, contract, visa, plane_ticket
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const insertEmployeeDocumentSchema = createInsertSchema(employeeDocuments, {
  employeePassport: z.string().min(1, "Employee passport is required"),
  documentType: z.enum(["passport", "contract", "visa", "plane_ticket", "arc", "social_insurance", "tax_document", "other"]),
  fileName: z.string().min(1, "File name is required"),
  filePath: z.string().min(1, "File path is required"),
  fileSize: z.number().int().positive("File size must be positive"),
}).omit({
  id: true,
  uploadedAt: true,
});

export type EmployeeDocument = typeof employeeDocuments.$inferSelect;
export type InsertEmployeeDocument = z.infer<typeof insertEmployeeDocumentSchema>;

// Leave types enum
export const leaveTypeEnum = pgEnum("leave_type", ["annual", "sick", "maternity", "paternity", "personal", "bereavement"]);

// Employee leave records table
export const employeeLeaves = pgTable("employee_leaves", {
  id: serial("id").primaryKey(),
  employeePassport: text("employee_passport").notNull().references(() => employees.passport),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  days: integer("days").notNull(), // Total days of leave
  reason: text("reason"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmployeeLeaveSchema = createInsertSchema(employeeLeaves, {
  employeePassport: z.string().min(1, "Employee passport is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  days: z.number().int().positive("Days must be positive"),
  reason: z.string().optional(),
}).omit({
  id: true,
  status: true,
  approvedBy: true,
  approvedAt: true,
  createdAt: true,
});

export const updateEmployeeLeaveSchema = insertEmployeeLeaveSchema.extend({
  status: z.enum(["pending", "approved", "rejected"]),
  approvedBy: z.string().optional(),
}).partial();

export type EmployeeLeave = typeof employeeLeaves.$inferSelect;
export type InsertEmployeeLeave = z.infer<typeof insertEmployeeLeaveSchema>;
export type UpdateEmployeeLeave = z.infer<typeof updateEmployeeLeaveSchema>;

// Employee leave balance tracking
export const employeeLeaveBalances = pgTable("employee_leave_balances", {
  id: serial("id").primaryKey(),
  employeePassport: text("employee_passport").notNull().references(() => employees.passport),
  year: integer("year").notNull(),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  totalEntitlement: integer("total_entitlement").notNull(), // Total days entitled per year
  usedDays: integer("used_days").notNull().default(0),
  remainingDays: integer("remaining_days").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmployeeLeaveBalanceSchema = createInsertSchema(employeeLeaveBalances, {
  employeePassport: z.string().min(1, "Employee passport is required"),
  year: z.number().int().min(2020).max(2050),
  totalEntitlement: z.number().int().positive("Total entitlement must be positive"),
}).omit({
  id: true,
  usedDays: true,
  remainingDays: true,
  updatedAt: true,
});

export type EmployeeLeaveBalance = typeof employeeLeaveBalances.$inferSelect;
export type InsertEmployeeLeaveBalance = z.infer<typeof insertEmployeeLeaveBalanceSchema>;

// Plant varieties table for ΠΥ8 compliance
export const plantVarieties = pgTable("plant_varieties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category"), // Optional category like fruit tree, citrus, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPlantVarietySchema = createInsertSchema(plantVarieties, {
  name: z.string().min(1, "Variety name is required"),
  category: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type PlantVariety = typeof plantVarieties.$inferSelect;
export type InsertPlantVariety = z.infer<typeof insertPlantVarietySchema>;

// Plant purchases from external sources for planning and cost analysis
export const plantPurchases = pgTable("plant_purchases", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").references(() => plantBase.id), // Link to existing plant if available
  supplierName: text("supplier_name").notNull(),
  supplierCountry: text("supplier_country").notNull(),
  plantName: text("plant_name").notNull(),
  scientificName: text("scientific_name").notNull(),
  variety: text("variety"),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(), // Price per unit in cents (EUR)
  totalCost: integer("total_cost").notNull(), // Total cost in cents (EUR)
  currency: text("currency").notNull().default("EUR"),
  purchaseDate: date("purchase_date").notNull(),
  expectedDelivery: date("expected_delivery"),
  actualDelivery: date("actual_delivery"),
  orderNumber: text("order_number"),
  invoiceNumber: text("invoice_number"),
  shippingCost: integer("shipping_cost").default(0), // Shipping cost in cents
  customsDuty: integer("customs_duty").default(0), // Customs duty in cents
  otherFees: integer("other_fees").default(0), // Other fees in cents
  totalLandedCost: integer("total_landed_cost").notNull(), // Total cost including all fees
  status: text("status").notNull().default("ordered"), // ordered, shipped, delivered, planted
  qualityRating: integer("quality_rating"), // 1-5 rating upon delivery
  survivalRate: integer("survival_rate"), // Percentage of plants that survived after planting
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlantPurchaseSchema = createInsertSchema(plantPurchases, {
  supplierName: z.string().min(1, "Supplier name is required"),
  supplierCountry: z.string().min(1, "Supplier country is required"),
  plantName: z.string().min(1, "Plant name is required"),
  scientificName: z.string().min(1, "Scientific name is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
  unitPrice: z.number().int().positive("Unit price must be positive"),
  totalCost: z.number().int().positive("Total cost must be positive"),
  totalLandedCost: z.number().int().positive("Total landed cost must be positive"),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  qualityRating: z.number().int().min(1).max(5).optional(),
  survivalRate: z.number().int().min(0).max(100).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updatePlantPurchaseSchema = insertPlantPurchaseSchema.partial();

export type PlantPurchase = typeof plantPurchases.$inferSelect;
export type InsertPlantPurchase = z.infer<typeof insertPlantPurchaseSchema>;
export type UpdatePlantPurchase = z.infer<typeof updatePlantPurchaseSchema>;

// Purchase analysis view for reporting
export interface PlantPurchaseAnalysis {
  totalPurchases: number;
  totalSpent: number;
  averageUnitPrice: number;
  topSuppliers: Array<{
    supplierName: string;
    totalOrders: number;
    totalSpent: number;
  }>;
  monthlySpending: Array<{
    month: string;
    totalSpent: number;
    orderCount: number;
  }>;
}

// Document categories for the Document Center
export const documentCategories = pgTable("document_categories", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  nameEl: text("name_el").notNull(),
  nameEn: text("name_en").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDocumentCategorySchema = createInsertSchema(documentCategories).omit({
  id: true,
  createdAt: true,
});

export type DocumentCategory = typeof documentCategories.$inferSelect;
export type InsertDocumentCategory = z.infer<typeof insertDocumentCategorySchema>;

// Documents table for the Document Center
export const documents = pgTable("documents", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  categoryId: integer("category_id").notNull().references(() => documentCategories.id),
  producerId: text("producer_id"),
  title: text("title").notNull(),
  filePath: text("file_path").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  issueDate: date("issue_date"),
  expiryDate: date("expiry_date"),
  notes: text("notes"),
  isRenewable: integer("is_renewable").notNull().default(1), // 1 for renewable, 0 for non-renewable
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents, {
  categoryId: z.number().int().positive("Category is required"),
  title: z.string().min(1, "Title is required"),
  filePath: z.string().min(1, "File path is required"),
  fileName: z.string().min(1, "File name is required"),
  fileSize: z.number().int().positive("File size must be positive"),
  uploadedBy: z.number().int().positive("Uploaded by is required"),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  producerId: z.string().optional(),
  notes: z.string().optional(),
  isRenewable: z.number().int().min(0).max(1).default(1),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateDocumentSchema = insertDocumentSchema.partial();

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type UpdateDocument = z.infer<typeof updateDocumentSchema>;

// Document with category information for frontend display
export interface DocumentWithCategory extends Document {
  category: DocumentCategory;
  daysUntilExpiry?: number;
  isExpired?: boolean;
}
