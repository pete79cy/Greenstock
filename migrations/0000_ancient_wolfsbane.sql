CREATE TYPE "public"."employment_status" AS ENUM('ACTIVE', 'FORMER', 'RETIRED');--> statement-breakpoint
CREATE TYPE "public"."form_type" AS ENUM('ΦΥ/ΠΥ 3', 'Lab Analysis', 'Passport', 'Άδεια Εισαγωγής Λιπασμάτων');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('annual', 'sick', 'maternity', 'paternity', 'personal', 'bereavement');--> statement-breakpoint
CREATE TABLE "document_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name_el" text NOT NULL,
	"name_en" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "document_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"producer_id" text,
	"title" text NOT NULL,
	"file_path" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"issue_date" date,
	"expiry_date" date,
	"notes" text,
	"is_renewable" integer DEFAULT 1 NOT NULL,
	"uploaded_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_passport" text NOT NULL,
	"document_type" text NOT NULL,
	"file_name" text NOT NULL,
	"file_path" text NOT NULL,
	"file_size" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_leave_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_passport" text NOT NULL,
	"year" integer NOT NULL,
	"leave_type" "leave_type" NOT NULL,
	"total_entitlement" integer NOT NULL,
	"used_days" integer DEFAULT 0 NOT NULL,
	"remaining_days" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_leaves" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_passport" text NOT NULL,
	"leave_type" "leave_type" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"days" integer NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"passport" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"designation" text NOT NULL,
	"payment_method" text DEFAULT 'Bank Transfer' NOT NULL,
	"date_of_birth" date,
	"arc" text,
	"social_insurance" text,
	"tax_id" text,
	"monthly_salary" integer NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"status" "employment_status" DEFAULT 'ACTIVE' NOT NULL,
	"left_on" date,
	"retirement_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_passport" text NOT NULL,
	"pay_period" text NOT NULL,
	"pay_date" text NOT NULL,
	"gross_salary" integer NOT NULL,
	"social_insurance" integer NOT NULL,
	"gesy" integer NOT NULL,
	"total_deductions" integer NOT NULL,
	"net_pay" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_base" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"scientific_name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"plant_id" integer NOT NULL,
	"planting_year" integer NOT NULL,
	"quantity" integer NOT NULL,
	"location" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"plant_id" integer,
	"supplier_name" text NOT NULL,
	"supplier_country" text NOT NULL,
	"plant_name" text NOT NULL,
	"scientific_name" text NOT NULL,
	"variety" text,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"total_cost" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"purchase_date" date NOT NULL,
	"expected_delivery" date,
	"actual_delivery" date,
	"order_number" text,
	"invoice_number" text,
	"shipping_cost" integer DEFAULT 0,
	"customs_duty" integer DEFAULT 0,
	"other_fees" integer DEFAULT 0,
	"total_landed_cost" integer NOT NULL,
	"status" text DEFAULT 'ordered' NOT NULL,
	"quality_rating" integer,
	"survival_rate" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_varieties" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plant_varieties_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "plants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"scientific_name" text NOT NULL,
	"planting_year" integer NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases_py8" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" text,
	"date" text NOT NULL,
	"species" text NOT NULL,
	"variety" text,
	"quantity" integer NOT NULL,
	"size" text,
	"documents_origin" text,
	"category" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regulatory_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"producer_id" text NOT NULL,
	"date" text NOT NULL,
	"form_type" "form_type" NOT NULL,
	"document_url" text NOT NULL,
	"notes" text,
	"is_renewable" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_py9" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"species" text NOT NULL,
	"variety" text,
	"quantity" integer NOT NULL,
	"batch_code" text,
	"material_category" text,
	"buyer" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text,
	"first_name" text,
	"last_name" text,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_category_id_document_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."document_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_passport_employees_passport_fk" FOREIGN KEY ("employee_passport") REFERENCES "public"."employees"("passport") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_employee_passport_employees_passport_fk" FOREIGN KEY ("employee_passport") REFERENCES "public"."employees"("passport") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_leaves" ADD CONSTRAINT "employee_leaves_employee_passport_employees_passport_fk" FOREIGN KEY ("employee_passport") REFERENCES "public"."employees"("passport") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_passport_employees_passport_fk" FOREIGN KEY ("employee_passport") REFERENCES "public"."employees"("passport") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_inventory" ADD CONSTRAINT "plant_inventory_plant_id_plant_base_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plant_base"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_purchases" ADD CONSTRAINT "plant_purchases_plant_id_plant_base_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plant_base"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");