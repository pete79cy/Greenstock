import { sql } from "drizzle-orm";
import { db } from "../server/db";

async function createInitialSchema() {
  try {
    console.log("Starting database migration...");

    // Create plant_base table
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
    console.log("Created plant_base table");

    // Create plant_inventory table
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
    console.log("Created plant_inventory table");

    // Migrate existing data from plants table if it exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'plants'
      );
    `);

    if (tableExists.rows[0].exists) {
      console.log("Migrating data from existing plants table...");
      
      // Migrate to the new schema
      await db.execute(sql`
        WITH inserted_plants AS (
          INSERT INTO plant_base (name, scientific_name, created_at, updated_at)
          SELECT DISTINCT name, scientific_name, created_at, updated_at FROM plants
          RETURNING id, name, scientific_name
        )
        INSERT INTO plant_inventory (plant_id, planting_year, quantity, created_at, updated_at)
        SELECT ip.id, p.planting_year, p.quantity, p.created_at, p.updated_at
        FROM plants p
        JOIN inserted_plants ip ON p.name = ip.name AND p.scientific_name = ip.scientific_name;
      `);
      
      console.log("Data migration completed");
    } else {
      console.log("No existing plants table found, skipping data migration");
    }

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

createInitialSchema()
  .then(() => {
    console.log("Migration script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });