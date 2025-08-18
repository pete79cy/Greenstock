import { Router } from "express";
import { db } from "../db";
import { plantVarieties, insertPlantVarietySchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { isAuthenticated } from "../auth";

const router = Router();

// Get all plant varieties
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const varieties = await db
      .select()
      .from(plantVarieties)
      .orderBy(plantVarieties.name);
    
    res.json(varieties);
  } catch (error: any) {
    console.error("Error fetching plant varieties:", error);
    res.status(500).json({ message: "Failed to fetch plant varieties" });
  }
});

// Add a new plant variety
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const validatedData = insertPlantVarietySchema.parse(req.body);
    
    // Check if variety already exists
    const existing = await db
      .select()
      .from(plantVarieties)
      .where(eq(plantVarieties.name, validatedData.name));
    
    if (existing.length > 0) {
      return res.status(400).json({ message: "Η ποικιλία υπάρχει ήδη" });
    }
    
    const [newVariety] = await db
      .insert(plantVarieties)
      .values(validatedData)
      .returning();
    
    res.json(newVariety);
  } catch (error: any) {
    console.error("Error adding plant variety:", error);
    
    if (error.name === "ZodError") {
      return res.status(400).json({ 
        message: "Invalid data", 
        errors: error.errors 
      });
    }
    
    res.status(500).json({ message: "Failed to add plant variety" });
  }
});

// Delete a plant variety
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid variety ID" });
    }
    
    const deleted = await db
      .delete(plantVarieties)
      .where(eq(plantVarieties.id, id))
      .returning();
    
    if (deleted.length === 0) {
      return res.status(404).json({ message: "Variety not found" });
    }
    
    res.json({ message: "Variety deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting plant variety:", error);
    res.status(500).json({ message: "Failed to delete plant variety" });
  }
});

export default router;