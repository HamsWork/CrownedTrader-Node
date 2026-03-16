import { db } from "./db";
import { users } from "@shared/schema";
import { hashPassword } from "./auth";

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
}
