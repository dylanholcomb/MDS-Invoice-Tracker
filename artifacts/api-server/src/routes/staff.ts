import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { staffRoutesTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/staff", async (req, res) => {
  const results = await db
    .select()
    .from(staffRoutesTable)
    .orderBy(staffRoutesTable.reportingStructure);

  res.json(results.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

router.post("/staff", async (req, res) => {
  const body = req.body as {
    reportingStructure: string;
    invoiceType?: string;
    accountant: string;
    supervisor?: string;
    unit?: string;
    branch?: string;
    section?: string;
    group?: string;
    divisionCenter?: string;
    description?: string;
  };

  const [entry] = await db
    .insert(staffRoutesTable)
    .values({
      reportingStructure: body.reportingStructure,
      invoiceType: body.invoiceType,
      accountant: body.accountant,
      supervisor: body.supervisor,
      unit: body.unit,
      branch: body.branch,
      section: body.section,
      group: body.group,
      divisionCenter: body.divisionCenter,
      description: body.description,
    })
    .returning();

  res.status(201).json({ ...entry, createdAt: entry.createdAt.toISOString() });
});

router.patch("/staff/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const body = req.body as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  for (const field of [
    "reportingStructure",
    "invoiceType",
    "accountant",
    "supervisor",
    "unit",
    "branch",
    "section",
    "group",
    "divisionCenter",
    "description",
  ]) {
    if (field in body) update[field] = body[field];
  }

  const [updated] = await db
    .update(staffRoutesTable)
    .set(update as Parameters<typeof db.update>[0] extends unknown ? typeof update : never)
    .where(eq(staffRoutesTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Staff entry not found" });
    return;
  }

  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

router.delete("/staff/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await db.delete(staffRoutesTable).where(eq(staffRoutesTable.id, id));
  res.json({ message: "Staff entry deleted" });
});

export default router;
