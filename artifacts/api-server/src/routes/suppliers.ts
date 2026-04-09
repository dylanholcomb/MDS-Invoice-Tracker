import { Router, type IRouter } from "express";
import { eq, ilike, or } from "drizzle-orm";
import { db } from "../lib/db";
import { suppliersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/suppliers", async (req, res) => {
  const { search, limit = "50" } = req.query as Record<string, string>;
  const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10)));

  const where = search
    ? or(
        ilike(suppliersTable.supplierName, `%${search}%`),
        ilike(suppliersTable.supplierID, `%${search}%`)
      )
    : undefined;

  const results = await db
    .select()
    .from(suppliersTable)
    .where(where)
    .limit(limitNum)
    .orderBy(suppliersTable.supplierName);

  res.json(results.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

router.post("/suppliers", async (req, res) => {
  const body = req.body as {
    supplierID: string;
    supplierName: string;
    fiCalID?: string;
    sb?: boolean;
    mb?: boolean;
    dvbe?: boolean;
  };

  const [supplier] = await db
    .insert(suppliersTable)
    .values({
      supplierID: body.supplierID,
      supplierName: body.supplierName,
      fiCalID: body.fiCalID,
      sb: Boolean(body.sb),
      mb: Boolean(body.mb),
      dvbe: Boolean(body.dvbe),
    })
    .returning();

  res.status(201).json({ ...supplier, createdAt: supplier.createdAt.toISOString() });
});

router.get("/suppliers/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [supplier] = await db
    .select()
    .from(suppliersTable)
    .where(eq(suppliersTable.id, id))
    .limit(1);

  if (!supplier) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  res.json({ ...supplier, createdAt: supplier.createdAt.toISOString() });
});

router.patch("/suppliers/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const body = req.body as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  for (const field of ["supplierName", "fiCalID", "sb", "mb", "dvbe"]) {
    if (field in body) update[field] = body[field];
  }

  const [updated] = await db
    .update(suppliersTable)
    .set(update as Parameters<typeof db.update>[0] extends unknown ? typeof update : never)
    .where(eq(suppliersTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

export default router;
