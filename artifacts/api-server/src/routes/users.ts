import { Router, type IRouter } from "express";
import { eq, ne } from "drizzle-orm";
import { db } from "../lib/db";
import { usersTable } from "@workspace/db";
import { requireRole } from "../lib/auth";

const router: IRouter = Router();

router.get(
  "/users/internal",
  requireRole("admin", "approver", "accountant", "staff"),
  async (req, res) => {
    const users = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(ne(usersTable.role, "vendor"))
      .orderBy(usersTable.displayName);

    res.json(users);
  }
);

export default router;
