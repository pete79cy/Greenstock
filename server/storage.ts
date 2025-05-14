import { plants, type Plant, type InsertPlant, type UpdatePlant } from "@shared/schema";
import { users, type User, type InsertUser } from "@shared/schema";

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private plantsData: Map<number, Plant>;
  private userCurrentId: number;
  private plantCurrentId: number;

  constructor() {
    this.users = new Map();
    this.plantsData = new Map();
    this.userCurrentId = 1;
    this.plantCurrentId = 1;
    
    // Add some initial plant data
    this.seedInitialPlantData();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Plant methods
  async getAllPlants(): Promise<Plant[]> {
    return Array.from(this.plantsData.values());
  }

  async getPlant(id: number): Promise<Plant | undefined> {
    return this.plantsData.get(id);
  }

  async createPlant(insertPlant: InsertPlant): Promise<Plant> {
    const id = this.plantCurrentId++;
    const now = new Date();
    
    const plant: Plant = { 
      ...insertPlant, 
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.plantsData.set(id, plant);
    return plant;
  }

  async updatePlant(updatePlant: UpdatePlant): Promise<Plant | undefined> {
    const { id } = updatePlant;
    const existingPlant = this.plantsData.get(id);
    
    if (!existingPlant) {
      return undefined;
    }
    
    const updatedPlant: Plant = {
      ...existingPlant,
      ...updatePlant,
      updatedAt: new Date()
    };
    
    this.plantsData.set(id, updatedPlant);
    return updatedPlant;
  }

  async deletePlant(id: number): Promise<boolean> {
    if (!this.plantsData.has(id)) {
      return false;
    }
    
    return this.plantsData.delete(id);
  }

  // Seed some initial plant data for demonstration
  private seedInitialPlantData() {
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

    initialPlants.forEach(plant => {
      const id = this.plantCurrentId++;
      const now = new Date();
      
      this.plantsData.set(id, {
        ...plant,
        id,
        createdAt: now,
        updatedAt: now
      });
    });
  }
}

export const storage = new MemStorage();
