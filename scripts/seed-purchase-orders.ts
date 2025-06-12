import { db } from "../server/db";
import { purchaseOrders, purchasedPlants } from "../shared/schema";

async function seedPurchaseOrders() {
  console.log("Seeding purchase orders...");

  try {
    // Create sample purchase order
    const [order] = await db
      .insert(purchaseOrders)
      .values({
        supplier: "Dutch Flowers Co.",
        purchaseDate: "2025-05-15",
        notes: "High-quality plants for spring season",
      })
      .returning();

    console.log("Created purchase order:", order);

    // Add sample plants to the purchase order
    const plants = [
      {
        purchaseOrderId: order.id,
        plantName: "Monstera Deliciosa",
        quantity: 20,
        costPerUnit: 1500, // €15.00 in cents
        status: "Excellent" as const,
      },
      {
        purchaseOrderId: order.id,
        plantName: "Ficus Lyrata",
        quantity: 10,
        costPerUnit: 2500, // €25.00 in cents
        status: "Good" as const,
      },
    ];

    const createdPlants = await db
      .insert(purchasedPlants)
      .values(plants)
      .returning();

    console.log("Created plants:", createdPlants);
    console.log("Sample data seeded successfully!");

  } catch (error) {
    console.error("Error seeding purchase orders:", error);
  }
}

seedPurchaseOrders().then(() => process.exit(0));