import { Router, type IRouter } from "express";
import { eq, ilike, or } from "drizzle-orm";
import multer from "multer";
import * as XLSX from "xlsx";
import { db } from "../lib/db";
import { speedchartsTable } from "@workspace/db";
import { requireRole } from "../lib/auth";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use("/speedcharts", requireRole("admin", "accountant", "approver", "staff"));

function serialize(s: typeof speedchartsTable.$inferSelect) {
  return { ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() };
}

router.get("/speedcharts", async (req, res) => {
  const { search, limit = "200" } = req.query as Record<string, string>;
  const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10)));

  const where = search
    ? or(
        ilike(speedchartsTable.speedchart, `%${search}%`),
        ilike(speedchartsTable.description, `%${search}%`),
        ilike(speedchartsTable.fund, `%${search}%`),
        ilike(speedchartsTable.program, `%${search}%`)
      )
    : undefined;

  const results = await db
    .select()
    .from(speedchartsTable)
    .where(where)
    .limit(limitNum)
    .orderBy(speedchartsTable.speedchart);

  res.json(results.map(serialize));
});

router.get("/speedcharts/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [sc] = await db.select().from(speedchartsTable).where(eq(speedchartsTable.id, id)).limit(1);
  if (!sc) { res.status(404).json({ error: "Speedchart not found" }); return; }
  res.json(serialize(sc));
});

router.post("/speedcharts", async (req, res) => {
  const body = req.body as Record<string, string>;
  if (!body.speedchart) { res.status(400).json({ error: "speedchart code is required" }); return; }

  const [sc] = await db
    .insert(speedchartsTable)
    .values({
      speedchart: body.speedchart.trim().toUpperCase(),
      description: body.description || null,
      sequence: body.sequence || null,
      appropRef: body.appropRef || null,
      fund: body.fund || null,
      eny: body.eny || null,
      program: body.program || null,
      pcBusinessUnit: body.pcBusinessUnit || null,
      projectID: body.projectID || null,
      activityID: body.activityID || null,
      svcLoc: body.svcLoc || null,
    })
    .returning();

  res.status(201).json(serialize(sc));
});

router.put("/speedcharts/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const body = req.body as Record<string, string>;
  const [sc] = await db
    .update(speedchartsTable)
    .set({
      speedchart: body.speedchart?.trim().toUpperCase(),
      description: body.description ?? undefined,
      sequence: body.sequence ?? undefined,
      appropRef: body.appropRef ?? undefined,
      fund: body.fund ?? undefined,
      eny: body.eny ?? undefined,
      program: body.program ?? undefined,
      pcBusinessUnit: body.pcBusinessUnit ?? undefined,
      projectID: body.projectID ?? undefined,
      activityID: body.activityID ?? undefined,
      svcLoc: body.svcLoc ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(speedchartsTable.id, id))
    .returning();

  if (!sc) { res.status(404).json({ error: "Speedchart not found" }); return; }
  res.json(serialize(sc));
});

router.delete("/speedcharts/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [deleted] = await db.delete(speedchartsTable).where(eq(speedchartsTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Speedchart not found" }); return; }
  res.json({ success: true });
});

const COLUMN_MAP: Record<string, keyof typeof speedchartsTable.$inferInsert> = {
  "speedchart": "speedchart",
  "speedchart code": "speedchart",
  "code": "speedchart",
  "description": "description",
  "sequence": "sequence",
  "appropref": "appropRef",
  "approp ref": "appropRef",
  "approp_ref": "appropRef",
  "fund": "fund",
  "eny": "eny",
  "program": "program",
  "pc business unit": "pcBusinessUnit",
  "pc_business_unit": "pcBusinessUnit",
  "pcbusinessunit": "pcBusinessUnit",
  "project id": "projectID",
  "project_id": "projectID",
  "projectid": "projectID",
  "activity id": "activityID",
  "activity_id": "activityID",
  "activityid": "activityID",
  "service location": "svcLoc",
  "svc loc": "svcLoc",
  "svc_loc": "svcLoc",
  "svcloc": "svcLoc",
};

router.post("/speedcharts/import", upload.single("file"), async (req, res) => {
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

  const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];

  if (rows.length === 0) { res.status(400).json({ error: "File contains no data rows" }); return; }

  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const [rowIdx, row] of rows.entries()) {
    const record: Record<string, string | null> = {};
    for (const [col, val] of Object.entries(row)) {
      const mapped = COLUMN_MAP[col.trim().toLowerCase()];
      if (mapped) record[mapped] = val != null && String(val).trim() !== "" ? String(val).trim() : null;
    }

    if (!record["speedchart"]) {
      errors.push(`Row ${rowIdx + 2}: missing SpeedChart code — skipped`);
      continue;
    }

    const code = (record["speedchart"] as string).toUpperCase();

    const existing = await db
      .select({ id: speedchartsTable.id })
      .from(speedchartsTable)
      .where(eq(speedchartsTable.speedchart, code))
      .limit(1);

    if (existing.length > 0) {
      await db.update(speedchartsTable).set({
        description: record["description"] ?? undefined,
        sequence: record["sequence"] ?? undefined,
        appropRef: record["appropRef"] ?? undefined,
        fund: record["fund"] ?? undefined,
        eny: record["eny"] ?? undefined,
        program: record["program"] ?? undefined,
        pcBusinessUnit: record["pcBusinessUnit"] ?? undefined,
        projectID: record["projectID"] ?? undefined,
        activityID: record["activityID"] ?? undefined,
        svcLoc: record["svcLoc"] ?? undefined,
        updatedAt: new Date(),
      }).where(eq(speedchartsTable.id, existing[0].id));
      updated++;
    } else {
      await db.insert(speedchartsTable).values({
        speedchart: code,
        description: record["description"] ?? null,
        sequence: record["sequence"] ?? null,
        appropRef: record["appropRef"] ?? null,
        fund: record["fund"] ?? null,
        eny: record["eny"] ?? null,
        program: record["program"] ?? null,
        pcBusinessUnit: record["pcBusinessUnit"] ?? null,
        projectID: record["projectID"] ?? null,
        activityID: record["activityID"] ?? null,
        svcLoc: record["svcLoc"] ?? null,
      });
      inserted++;
    }
  }

  res.json({ inserted, updated, errors, total: rows.length });
});

export default router;
