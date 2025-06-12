import { db } from "../server/db";
import { purchasedPlants } from "../shared/schema";

async function addPlantsToOrder() {
  console.log("Adding plants to purchase order #2...");

  try {
    // Add sample plants to purchase order #2 (the one created in the UI)
    const plants = [
      {
        purchaseOrderId: 2,
        plantName: "Philodendron Pink Princess",
        quantity: 15,
        costPerUnit: 3500, // €35.00 in cents
        status: "Excellent" as const,
      },
      {
        purchaseOrderId: 2,
        plantName: "Alocasia Black Velvet",
        quantity: 8,
        costPerUnit: 4500, // €45.00 in cents
        status: "Good" as const,
      },
      {
        purchaseOrderId: 2,
        plantName: "Calathea Medallion",
        quantity: 12,
        costPerUnit: 2800, // €28.00 in cents
        status: "Excellent" as const,
      },
    ];

    const createdPlants = await db
      .insert(purchasedPlants)
      .values(plants)
      .returning();

    console.log("Created plants:", createdPlants);
    console.log("Plants added successfully to purchase order #2!");

  } catch (error) {
    console.error("Error adding plants:", error);
  }
}

addPlantsToOrder().then(() => process.exit(0));