import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool } from "../server/db";
import { users } from "../shared/schema";

const username = process.env.ADMIN_USERNAME || "admin";
const password = process.env.ADMIN_PASSWORD;
const email = process.env.ADMIN_EMAIL || null;
const firstName = process.env.ADMIN_FIRST_NAME || "Admin";
const lastName = process.env.ADMIN_LAST_NAME || "User";

if (!password || password.length < 8) {
  console.error("ADMIN_PASSWORD must be set and at least 8 characters long.");
  process.exit(1);
}

const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1);

if (existingUser.length > 0) {
  console.log(`User "${username}" already exists. No changes made.`);
  await pool.end();
  process.exit(0);
}

const hashedPassword = await bcrypt.hash(password, 10);

await db.insert(users).values({
  username,
  password: hashedPassword,
  email,
  firstName,
  lastName,
  role: "admin",
});

console.log(`Admin user "${username}" created.`);
await pool.end();
