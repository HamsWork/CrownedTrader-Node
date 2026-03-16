import { db } from "./db";
import { signalTypes, users } from "@shared/schema";
import { hashPassword } from "./auth";
import { DEFAULT_TEMPLATES } from "@shared/template-definitions";
import { and, eq } from "drizzle-orm";

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

  for (const tmpl of DEFAULT_TEMPLATES) {
    const existing = await db.select().from(signalTypes)
      .where(and(eq(signalTypes.slug, tmpl.slug), eq(signalTypes.category, tmpl.category)));

    if (existing.length > 1) {
      const sorted = existing.sort((a, b) => a.id - b.id);
      for (let i = 1; i < sorted.length; i++) {
        await db.delete(signalTypes).where(eq(signalTypes.id, sorted[i].id));
        console.log(`Deleted duplicate template id=${sorted[i].id}: ${tmpl.name} (${tmpl.category})`);
      }
      const row = sorted[0];
      await db.update(signalTypes).set(tmpl).where(eq(signalTypes.id, row.id));
      console.log(`Updated template: ${tmpl.name} (${tmpl.category})`);
    } else if (existing.length === 1) {
      const row = existing[0];
      const needsUpdate =
        JSON.stringify(row.fieldsTemplate) !== JSON.stringify(tmpl.fieldsTemplate) ||
        row.descriptionTemplate !== tmpl.descriptionTemplate ||
        row.titleTemplate !== tmpl.titleTemplate ||
        row.footerTemplate !== tmpl.footerTemplate ||
        row.color !== tmpl.color ||
        row.name !== tmpl.name ||
        row.showTitleDefault !== tmpl.showTitleDefault ||
        row.showDescriptionDefault !== tmpl.showDescriptionDefault ||
        JSON.stringify(row.variables) !== JSON.stringify(tmpl.variables);
      if (needsUpdate) {
        await db.update(signalTypes).set(tmpl).where(eq(signalTypes.id, row.id));
        console.log(`Updated template: ${tmpl.name} (${tmpl.category})`);
      }
    } else {
      await db.insert(signalTypes).values(tmpl);
      console.log(`Inserted template: ${tmpl.name} (${tmpl.category})`);
    }
  }
}
