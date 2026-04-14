import bcrypt from "bcryptjs";
import { db } from "./db";
import { usersTable } from "@workspace/db";
import { logger } from "./logger";

const DEFAULT_USERS = [
  { username: "admin", password: "password", displayName: "Administrator", role: "admin" },
  { username: "acme_vendor", password: "vendor123", displayName: "ACME Corp", role: "vendor", linkedSupplierId: null as string | null },
  { username: "tech_supply", password: "vendor123", displayName: "Tech Supply Inc", role: "vendor", linkedSupplierId: null as string | null },
];

export async function seedDefaultUsers(): Promise<void> {
  try {
    const existing = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
    if (existing.length > 0) {
      return;
    }

    logger.info("No users found — seeding default accounts");

    for (const u of DEFAULT_USERS) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      await db.insert(usersTable).values({
        username: u.username,
        passwordHash,
        displayName: u.displayName,
        role: u.role,
        linkedSupplierId: u.linkedSupplierId ?? undefined,
      });
    }

    logger.info("Default accounts seeded successfully");
  } catch (err) {
    logger.error({ err }, "Failed to seed default users");
  }
}
