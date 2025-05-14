import { plants, type Plant, type InsertPlant, type UpdatePlant } from "@shared/schema";
import { users, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Modify the interface with CRUD methods for plants
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Plant methods
  getAllPlants(): Promise<Plant[]>;
  getPlant(id: number): Promise<Plant | undefined>;
  createPlant(plant: InsertPlant): Promise<Plant>;
  updatePlant(plant: UpdatePlant): Promise<Plant | undefined>;
  deletePlant(id: number): Promise<boolean>;
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

  // Plant methods
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

  // Function to seed initial plant data if needed
  async seedInitialPlantDataIfNeeded() {
    try {
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
        console.log("Initial plant data seeded successfully");
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