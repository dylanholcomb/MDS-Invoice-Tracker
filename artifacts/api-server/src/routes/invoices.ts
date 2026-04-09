import { Router, type IRouter } from "express";
import { eq, and, ilike, or, sql, desc, asc } from "drizzle-orm";
import { db } from "../lib/db";
import { invoicesTable, invoiceActivityTable, invoiceAttachmentsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/invoices", async (req, res) => {
  const {
    status,
    unit,
    staffName,
    fiscalYear,
    expedite,
    cashHold,
    search,
    page = "1",
    limit = "50",
    sortBy = "createdAt",
    sortDir = "desc",
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: ReturnType<typeof eq>[] = [];

  if (status) conditions.push(eq(invoicesTable.invoiceStatus, status));
  if (unit) conditions.push(eq(invoicesTable.unit, unit));
  if (staffName) conditions.push(eq(invoicesTable.staffName, staffName));
  if (fiscalYear) conditions.push(eq(invoicesTable.fiscalYear, fiscalYear));
  if (expedite === "true") conditions.push(eq(invoicesTable.expedite, true));
  if (cashHold === "true") conditions.push(eq(invoicesTable.cashHold, true));
  if (search) {
    conditions.push(
      or(
        ilike(invoicesTable.invoiceNumber, `%${search}%`),
        ilike(invoicesTable.vendorName, `%${search}%`),
        ilike(invoicesTable.vendorID, `%${search}%`),
        ilike(invoicesTable.contractPONumber, `%${search}%`),
      ) as ReturnType<typeof eq>
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const orderCol =
    sortBy === "invoiceAmount"
      ? invoicesTable.invoiceAmount
      : sortBy === "invoiceDate"
        ? invoicesTable.invoiceDate
        : sortBy === "updatedAt"
          ? invoicesTable.updatedAt
          : invoicesTable.createdAt;

  const order = sortDir === "asc" ? asc(orderCol) : desc(orderCol);

  const [countResult, invoices] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(invoicesTable)
      .where(where),
    db.select().from(invoicesTable).where(where).orderBy(order).limit(limitNum).offset(offset),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  res.json({
    invoices: invoices.map(serializeInvoice),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

router.post("/invoices/check-duplicate", async (req, res) => {
  const { invoiceNumber, invoiceAmount, fiscalYear, vendorID, excludeId } = req.body as {
    invoiceNumber: string;
    invoiceAmount: number;
    fiscalYear: string;
    vendorID: string;
    excludeId?: number;
  };

  const conditions = [
    eq(invoicesTable.invoiceNumber, invoiceNumber),
    eq(invoicesTable.vendorID, vendorID),
    eq(invoicesTable.fiscalYear, fiscalYear),
  ];

  const results = await db
    .select({ id: invoicesTable.id, invoiceNumber: invoicesTable.invoiceNumber })
    .from(invoicesTable)
    .where(and(...conditions))
    .limit(5);

  const filtered = excludeId ? results.filter((r) => r.id !== excludeId) : results;

  if (filtered.length > 0) {
    res.json({
      isDuplicate: true,
      existingId: filtered[0].id,
      existingInvoiceNumber: filtered[0].invoiceNumber,
    });
  } else {
    res.json({ isDuplicate: false, existingId: null, existingInvoiceNumber: null });
  }
});

router.post("/invoices", async (req, res) => {
  const body = req.body as {
    invoiceNumber: string;
    invoiceAmount: number;
    fiscalYear?: string;
    vendorID?: string;
    [key: string]: unknown;
  };

  if (body.fiscalYear && body.vendorID) {
    const dupes = await db
      .select({ id: invoicesTable.id, invoiceNumber: invoicesTable.invoiceNumber })
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.invoiceNumber, body.invoiceNumber),
          eq(invoicesTable.vendorID, body.vendorID),
          eq(invoicesTable.fiscalYear, body.fiscalYear),
        )
      )
      .limit(1);

    if (dupes.length > 0) {
      res.status(409).json({
        isDuplicate: true,
        existingId: dupes[0].id,
        existingInvoiceNumber: dupes[0].invoiceNumber,
      });
      return;
    }
  }

  const [invoice] = await db
    .insert(invoicesTable)
    .values({
      invoiceNumber: body.invoiceNumber,
      invoiceAmount: String(body.invoiceAmount),
      invoiceDate: body.invoiceDate as string | undefined,
      invoiceType: body.invoiceType as string | undefined,
      fiscalYear: body.fiscalYear,
      vendorID: body.vendorID,
      vendorName: body.vendorName as string | undefined,
      contractPONumber: body.contractPONumber as string | undefined,
      fiscalPONumber: body.fiscalPONumber as string | undefined,
      reportingStructure: body.reportingStructure as string | undefined,
      submissionNotes: body.submissionNotes as string | undefined,
      programReceivedDate: body.programReceivedDate as string | undefined,
      accountingReceivedDate: body.accountingReceivedDate as string | undefined,
      processingType: body.processingType as string | undefined,
      expedite: Boolean(body.expedite),
      cashHold: Boolean(body.cashHold),
      localHealth: Boolean(body.localHealth),
      specialHandling: Boolean(body.specialHandling),
      dvbeSbCmia: Boolean(body.dvbeSbCmia),
      revolvingFund: Boolean(body.revolvingFund),
      snapNurse: Boolean(body.snapNurse),
      calVaxGrant: Boolean(body.calVaxGrant),
      schoolsGrant: Boolean(body.schoolsGrant),
      airQualityCmp: Boolean(body.airQualityCmp),
      advancePayment: Boolean(body.advancePayment),
      drill2: Boolean(body.drill2),
      covid19Related: body.covid19Related as string | undefined,
      submitterName: body.submitterName as string | undefined,
      submitterEmail: body.submitterEmail as string | undefined,
    })
    .returning();

  await db.insert(invoiceActivityTable).values({
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    action: "created",
    statusFrom: null,
    statusTo: invoice.invoiceStatus,
    changedBy: req.session?.username,
  });

  res.status(201).json(serializeInvoice(invoice));
});

router.get("/invoices/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, id))
    .limit(1);

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  res.json(serializeInvoice(invoice));
});

router.patch("/invoices/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const body = req.body as Record<string, unknown>;

  const [existing] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  const allowedFields = [
    "invoiceStatus",
    "invoiceAmount",
    "invoiceDate",
    "invoiceType",
    "fiscalYear",
    "vendorID",
    "vendorName",
    "contractPONumber",
    "fiscalPONumber",
    "receiptId",
    "voucherID",
    "warrantNumber",
    "warrantDate",
    "approvalDate",
    "approvalManager",
    "staffName",
    "supervisor",
    "unit",
    "group",
    "section",
    "branch",
    "divisionCenter",
    "reportingStructure",
    "statusNotes",
    "submissionNotes",
    "programReceivedDate",
    "accountingReceivedDate",
    "invoiceReturnDate",
    "claimSchedule",
    "processingType",
    "expedite",
    "cashHold",
    "localHealth",
    "specialHandling",
    "dvbeSbCmia",
    "revolvingFund",
    "snapNurse",
    "calVaxGrant",
    "schoolsGrant",
    "airQualityCmp",
    "advancePayment",
    "drill2",
    "covid19Related",
  ];

  for (const field of allowedFields) {
    if (field in body && body[field] !== undefined) {
      if (field === "invoiceAmount") {
        updateData[field] = String(body[field]);
      } else {
        updateData[field] = body[field];
      }
    }
  }

  let [updated] = await db
    .update(invoicesTable)
    .set(updateData as Parameters<typeof db.update>[0] extends unknown ? typeof updateData : never)
    .where(eq(invoicesTable.id, id))
    .returning();

  const autoStatus = computeFiscalAutoStatus(updated);
  const statusBeforeAuto = updated.invoiceStatus;

  if (autoStatus && autoStatus !== updated.invoiceStatus) {
    [updated] = await db
      .update(invoicesTable)
      .set({ invoiceStatus: autoStatus, updatedAt: new Date() } as Parameters<typeof db.update>[0] extends unknown ? typeof updateData : never)
      .where(eq(invoicesTable.id, id))
      .returning();
  }

  const finalStatus = updated.invoiceStatus;
  const requestedStatus = body.invoiceStatus as string | undefined;

  if (requestedStatus && requestedStatus !== existing.invoiceStatus) {
    await db.insert(invoiceActivityTable).values({
      invoiceId: id,
      invoiceNumber: existing.invoiceNumber,
      action: "status_changed",
      statusFrom: existing.invoiceStatus,
      statusTo: requestedStatus,
      changedBy: req.session?.username,
      notes: (body.statusNotes as string) ?? null,
    });
  } else if (autoStatus && autoStatus !== statusBeforeAuto) {
    await db.insert(invoiceActivityTable).values({
      invoiceId: id,
      invoiceNumber: existing.invoiceNumber,
      action: "status_changed",
      statusFrom: existing.invoiceStatus,
      statusTo: finalStatus,
      changedBy: req.session?.username,
      notes: "Status auto-advanced based on Fi\$Cal field completion",
    });
  } else {
    await db.insert(invoiceActivityTable).values({
      invoiceId: id,
      invoiceNumber: existing.invoiceNumber,
      action: "updated",
      statusFrom: existing.invoiceStatus,
      statusTo: existing.invoiceStatus,
      changedBy: req.session?.username,
    });
  }

  res.json(serializeInvoice(updated));
});

router.delete("/invoices/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [existing] = await db
    .select({ id: invoicesTable.id })
    .from(invoicesTable)
    .where(eq(invoicesTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  await db.delete(invoicesTable).where(eq(invoicesTable.id, id));
  res.json({ message: "Invoice deleted" });
});

const FISCAL_WORKFLOW_ORDER = [
  "Awaiting Processing",
  "In Progress",
  "Receipted",
  "Processed in Accounting",
  "Approved in Accounting",
  "SCO Warrant Issued",
];

function computeFiscalAutoStatus(inv: typeof invoicesTable.$inferSelect): string | null {
  const currentRank = FISCAL_WORKFLOW_ORDER.indexOf(inv.invoiceStatus);
  if (currentRank === -1) return null;

  let earnedStatus: string | null = null;

  if (inv.warrantNumber && inv.warrantDate) {
    earnedStatus = "SCO Warrant Issued";
  } else if (inv.approvalDate && inv.approvalManager) {
    earnedStatus = "Approved in Accounting";
  } else if (inv.voucherID) {
    earnedStatus = "Processed in Accounting";
  } else if (inv.receiptId) {
    earnedStatus = "Receipted";
  }

  if (!earnedStatus) return null;

  const earnedRank = FISCAL_WORKFLOW_ORDER.indexOf(earnedStatus);
  if (earnedRank > currentRank) return earnedStatus;
  return null;
}

function serializeInvoice(inv: typeof invoicesTable.$inferSelect) {
  return {
    ...inv,
    invoiceAmount: Number(inv.invoiceAmount),
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
  };
}

router.get("/invoices/:id/attachments", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid invoice ID" });
    return;
  }
  const attachments = await db
    .select()
    .from(invoiceAttachmentsTable)
    .where(eq(invoiceAttachmentsTable.invoiceId, id));
  res.json(
    attachments.map((a) => ({
      id: a.id,
      filename: a.filename,
      contentType: a.contentType,
      fileSize: a.fileSize,
      objectPath: a.objectPath,
      uploadedBy: a.uploadedBy,
      uploadedAt: a.uploadedAt.toISOString(),
    }))
  );
});

export default router;
