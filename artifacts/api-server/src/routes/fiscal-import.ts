import { Router, type IRouter } from "express";
import { eq, ilike } from "drizzle-orm";
import multer from "multer";
import * as XLSX from "xlsx";
import { db } from "../lib/db";
import { invoicesTable, invoiceActivityTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.use(requireAuth);

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/[\s_\-\.]+/g, "");
}

const HEADER_MAP: Record<string, string> = {
  "invoicenumber": "invoiceNumber",
  "invoice": "invoiceNumber",
  "invoicenum": "invoiceNumber",
  "inv": "invoiceNumber",
  "voucherid": "erpVoucherRef",
  "voucher": "erpVoucherRef",
  "vouchernum": "erpVoucherRef",
  "erpvoucherref": "erpVoucherRef",
  "documentnumber": "erpVoucherRef",
  "billpaymentnumber": "erpVoucherRef",
  "paymentref": "erpPaymentRef",
  "erpPaymentRef": "erpPaymentRef",
  "warrantnumber": "erpPaymentRef",
  "warrant": "erpPaymentRef",
  "warrantnum": "erpPaymentRef",
  "checkeftreference": "erpPaymentRef",
  "checknumber": "erpPaymentRef",
  "eftnumber": "erpPaymentRef",
  "warrantdate": "erpPaymentDate",
  "paymentdate": "erpPaymentDate",
  "erppaymentdate": "erpPaymentDate",
  "approvaldate": "approvalDate",
  "approveddate": "approvalDate",
  "approvalmanager": "approvalManager",
  "approvedby": "approvalManager",
  "manager": "approvalManager",
  "receiptid": "erpReceiptRef",
  "receipt": "erpReceiptRef",
  "erpreceiptref": "erpReceiptRef",
  "documentreference": "erpReceiptRef",
};

const FISCAL_STATUS_FIELDS: Record<string, string> = {
  erpVoucherRef: "Processed in Accounting",
  erpPaymentRef: "Payment Confirmed",
  approvalDate: "Approved in Accounting",
  erpReceiptRef: "Receipted",
};

const STATUS_ORDER = [
  "Awaiting Processing",
  "In Progress",
  "Receipted",
  "Processed in Accounting",
  "Approved in Accounting",
  "Payment Confirmed",
  "Returned to Submitter",
  "Duplicate",
  "Completed",
];

function advanceStatus(current: string, proposed: string): string {
  const ci = STATUS_ORDER.indexOf(current);
  const pi = STATUS_ORDER.indexOf(proposed);
  if (pi > ci) return proposed;
  return current;
}

function computeNewStatus(current: string, updates: Record<string, string | null>): string {
  let status = current;
  if (updates.erpReceiptRef) status = advanceStatus(status, "Receipted");
  if (updates.erpVoucherRef) status = advanceStatus(status, "Processed in Accounting");
  if (updates.approvalDate && updates.approvalManager) status = advanceStatus(status, "Approved in Accounting");
  if (updates.erpPaymentRef && updates.erpPaymentDate) status = advanceStatus(status, "Payment Confirmed");
  return status;
}

export interface ImportPreviewRow {
  invoiceNumber: string;
  invoiceId: number | null;
  currentStatus: string | null;
  newStatus: string | null;
  erpVoucherRef: string | null;
  erpPaymentRef: string | null;
  erpPaymentDate: string | null;
  approvalDate: string | null;
  approvalManager: string | null;
  erpReceiptRef: string | null;
  matched: boolean;
}

router.post("/invoices/fiscal-import/preview", upload.single("file"), async (req, res) => {
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

  const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];

  if (rawRows.length === 0) { res.status(400).json({ error: "File contains no data rows" }); return; }

  const previews: ImportPreviewRow[] = [];

  for (const rawRow of rawRows) {
    const row: Record<string, string | null> = {};
    for (const [col, val] of Object.entries(rawRow)) {
      const mapped = HEADER_MAP[normalizeHeader(col)];
      if (mapped) row[mapped] = val != null && String(val).trim() !== "" ? String(val).trim() : null;
    }

    if (!row["invoiceNumber"]) continue;

    const [invoice] = await db
      .select()
      .from(invoicesTable)
      .where(ilike(invoicesTable.invoiceNumber, row["invoiceNumber"]!))
      .limit(1);

    const updates = {
      erpVoucherRef: row["erpVoucherRef"] ?? null,
      erpPaymentRef: row["erpPaymentRef"] ?? null,
      erpPaymentDate: row["erpPaymentDate"] ?? null,
      approvalDate: row["approvalDate"] ?? null,
      approvalManager: row["approvalManager"] ?? null,
      erpReceiptRef: row["erpReceiptRef"] ?? null,
    };

    if (invoice) {
      const newStatus = computeNewStatus(invoice.invoiceStatus, updates);
      previews.push({
        invoiceNumber: row["invoiceNumber"]!,
        invoiceId: invoice.id,
        currentStatus: invoice.invoiceStatus,
        newStatus,
        ...updates,
        matched: true,
      });
    } else {
      previews.push({
        invoiceNumber: row["invoiceNumber"]!,
        invoiceId: null,
        currentStatus: null,
        newStatus: null,
        ...updates,
        matched: false,
      });
    }
  }

  res.json({ rows: previews, total: rawRows.length });
});

router.post("/invoices/fiscal-import/execute", async (req, res) => {
  const { rows, changedBy } = req.body as {
    rows: ImportPreviewRow[];
    changedBy?: string;
  };

  if (!Array.isArray(rows)) { res.status(400).json({ error: "rows array required" }); return; }

  let applied = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.matched || !row.invoiceId) continue;

    const [existing] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, row.invoiceId))
      .limit(1);

    if (!existing) {
      errors.push(`Invoice ${row.invoiceNumber} not found — skipped`);
      continue;
    }

    const updateData: Partial<typeof invoicesTable.$inferInsert> = { updatedAt: new Date() };
    if (row.erpVoucherRef) updateData.erpVoucherRef = row.erpVoucherRef;
    if (row.erpPaymentRef) updateData.erpPaymentRef = row.erpPaymentRef;
    if (row.erpPaymentDate) updateData.erpPaymentDate = row.erpPaymentDate;
    if (row.approvalDate) updateData.approvalDate = row.approvalDate;
    if (row.approvalManager) updateData.approvalManager = row.approvalManager;
    if (row.erpReceiptRef) updateData.erpReceiptRef = row.erpReceiptRef;

    const prevStatus = existing.invoiceStatus;
    const newStatus = row.newStatus ?? prevStatus;
    if (newStatus !== prevStatus) updateData.invoiceStatus = newStatus;

    await db.update(invoicesTable).set(updateData).where(eq(invoicesTable.id, row.invoiceId));

    if (newStatus !== prevStatus) {
      await db.insert(invoiceActivityTable).values({
        invoiceId: row.invoiceId,
        invoiceNumber: row.invoiceNumber,
        action: "ERP Import",
        statusFrom: prevStatus,
        statusTo: newStatus,
        changedBy: changedBy ?? "system",
        notes: "Updated via ERP flat-file import",
      });
    }

    applied++;
  }

  res.json({ applied, errors, total: rows.filter((r) => r.matched).length });
});

export default router;
