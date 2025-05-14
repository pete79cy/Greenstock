import { pgTable, text, serial, integer, timestamp, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
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
