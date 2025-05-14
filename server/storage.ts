import { 
  plants, type Plant, type InsertPlant, type UpdatePlant, 
  users, type User, type InsertUser,
  plantBase, type PlantBase, type InsertPlantBase, type UpdatePlantBase,
  plantInventory, type PlantInventory, type InsertPlantInventory, type UpdatePlantInventory,
  type PlantView
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc, desc } from "drizzle-orm";

// Modify the interface with CRUD methods for plants
export interface IStorage {
  // User methods
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
  getInventoryForPlant(plantId: number): Promise<PlantInventory[]>;
  getInventoryEntry(id: number): Promise<PlantInventory | undefined>;
  createInventoryEntry(entry: InsertPlantInventory): Promise<PlantInventory>;
  updateInventoryEntry(entry: UpdatePlantInventory): Promise<PlantInventory | undefined>;
  deleteInventoryEntry(id: number): Promise<boolean>;
  
  // Combined methods for handling the PlantView (PlantBase + Inventory)
  getAllPlantViews(): Promise<PlantView[]>;
  getPlantView(id: number): Promise<PlantView | undefined>;
  createPlantView(plantName: string, scientificName: string, description: string | null, inventoryEntries: { plantingYear: number, quantity: number, location?: string, notes?: string }[]): Promise<PlantView>;
  
  // Migration method
  migrateToNewSchema(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
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
      
      if (plantBaseExists.rows[0].exists) {
        // Use the new schema
        const basesCount = await db.execute(sql`SELECT COUNT(*) FROM plant_base;`);
        
        if (parseInt(basesCount.rows[0].count) === 0) {
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