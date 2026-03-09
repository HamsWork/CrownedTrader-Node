import { db } from "./db";
import { signalTypes, users } from "@shared/schema";
import { hashPassword } from "./auth";
import { DEFAULT_TEMPLATES } from "@shared/template-definitions";

export async function seedDatabase() {
  const existingUsers = await db.select().from(users);
  if (existingUsers.length === 0) {
    const adminPassword = await hashPassword("admin123");
    await db.insert(users).values({
      username: "admin",
      password: adminPassword,
      role: "admin",
    });

    const userPassword = await hashPassword("user123");
    await db.insert(users).values({
      username: "trader1",
      password: userPassword,
      role: "user",
    });

    console.log("Seeded users (admin/admin123, trader1/user123)");
  }

  const existingTypes = await db.select().from(signalTypes);
  if (existingTypes.length > 0) return;

  await db.insert(signalTypes).values(DEFAULT_TEMPLATES);
  console.log(`Seeded ${DEFAULT_TEMPLATES.length} discord templates: ${DEFAULT_TEMPLATES.map(t => t.name).join(", ")}`);
}
