import { sql } from "drizzle-orm";
import { db } from "../server/db";

/**
 * This script migrates data from the old plants table to the new
 * plant_base and plant_inventory tables.
 */
async function migrate() {
  try {
    console.log("Starting database migration...");

    // Check if plant_base table exists, create if not
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS plant_base (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        scientific_name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("Verified plant_base table");

    // Check if plant_inventory table exists, create if not
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS plant_inventory (
        id SERIAL PRIMARY KEY,
        plant_id INTEGER NOT NULL REFERENCES plant_base(id) ON DELETE CASCADE,
        planting_year INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        location TEXT,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("Verified plant_inventory table");

    // Check if plants table exists for migration
    const plantsTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'plants'
      );
    `);

    if (plantsTableExists.rows[0].exists) {
      // Count records in the tables
      const plantBaseCount = await db.execute(sql`SELECT COUNT(*) FROM plant_base;`);
      const plantInventoryCount = await db.execute(sql`SELECT COUNT(*) FROM plant_inventory;`);
      const plantsCount = await db.execute(sql`SELECT COUNT(*) FROM plants;`);
      
      console.log(`Current record counts:
        - plant_base: ${plantBaseCount.rows[0].count}
        - plant_inventory: ${plantInventoryCount.rows[0].count}
        - plants (legacy): ${plantsCount.rows[0].count}
      `);
      
      // Only migrate if the new tables are empty
      if (parseInt(plantBaseCount.rows[0].count) === 0 && parseInt(plantInventoryCount.rows[0].count) === 0) {
        console.log("Migrating data from plants table to the new schema...");
        
        // Step 1: Insert unique plant entries into plant_base
        await db.execute(sql`
          INSERT INTO plant_base (name, scientific_name, created_at, updated_at)
          SELECT DISTINCT name, scientific_name, MIN(created_at), MIN(updated_at)
          FROM plants
          GROUP BY name, scientific_name;
        `);
        
        // Step 2: Insert inventory entries based on the plant_base records
        await db.execute(sql`
          INSERT INTO plant_inventory (plant_id, planting_year, quantity, created_at, updated_at)
          SELECT pb.id, p.planting_year, p.quantity, p.created_at, p.updated_at
          FROM plants p
          JOIN plant_base pb ON p.name = pb.name AND p.scientific_name = pb.scientific_name;
        `);
        
        // Count records after migration
        const newPlantBaseCount = await db.execute(sql`SELECT COUNT(*) FROM plant_base;`);
        const newPlantInventoryCount = await db.execute(sql`SELECT COUNT(*) FROM plant_inventory;`);
        
        console.log(`Migration completed:
          - plant_base: ${newPlantBaseCount.rows[0].count} records created
          - plant_inventory: ${newPlantInventoryCount.rows[0].count} records created
        `);
      } else {
        console.log("The new tables already contain data. Migration skipped to prevent duplication.");
      }
    } else {
      console.log("No legacy plants table found, skipping data migration.");
    }

    console.log("Migration process completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run the migration script
migrate()
  .then(() => {
    console.log("Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });