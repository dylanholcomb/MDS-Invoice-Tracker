import { Router, type IRouter } from "express";
import { sql, ne, desc } from "drizzle-orm";
import { db } from "../lib/db";
import { invoicesTable, invoiceActivityTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/dashboard/stats", async (req, res) => {
  const [totals, byStatus, byUnit, byFiscalYear, flags] = await Promise.all([
    db
      .select({
        totalInvoices: sql<number>`count(*)`,
        totalAmount: sql<number>`sum(invoice_amount::numeric)`,
      })
      .from(invoicesTable),

    db
      .select({
        status: invoicesTable.invoiceStatus,
        count: sql<number>`count(*)`,
      })
      .from(invoicesTable)
      .groupBy(invoicesTable.invoiceStatus),

    db
      .select({
        unit: invoicesTable.unit,
        count: sql<number>`count(*)`,
      })
      .from(invoicesTable)
      .groupBy(invoicesTable.unit)
      .orderBy(sql`count(*) desc`)
      .limit(10),

    db
      .select({
        fiscalYear: invoicesTable.fiscalYear,
        count: sql<number>`count(*)`,
        totalAmount: sql<number>`sum(invoice_amount::numeric)`,
      })
      .from(invoicesTable)
      .groupBy(invoicesTable.fiscalYear)
      .orderBy(sql`count(*) desc`)
      .limit(10),

    db
      .select({
        expediteCount: sql<number>`sum(case when expedite then 1 else 0 end)`,
        cashHoldCount: sql<number>`sum(case when cash_hold then 1 else 0 end)`,
        returnedCount: sql<number>`sum(case when invoice_status = 'Returned to Submitter' then 1 else 0 end)`,
        duplicateCount: sql<number>`sum(case when invoice_status = 'Duplicate' then 1 else 0 end)`,
      })
      .from(invoicesTable),
  ]);

  const total = totals[0] ?? { totalInvoices: 0, totalAmount: 0 };
  const f = flags[0] ?? { expediteCount: 0, cashHoldCount: 0, returnedCount: 0, duplicateCount: 0 };

  res.json({
    totalInvoices: Number(total.totalInvoices),
    totalAmount: Number(total.totalAmount ?? 0),
    byStatus: byStatus.map((s) => ({ status: s.status, count: Number(s.count) })),
    expediteCount: Number(f.expediteCount ?? 0),
    cashHoldCount: Number(f.cashHoldCount ?? 0),
    returnedCount: Number(f.returnedCount ?? 0),
    duplicateCount: Number(f.duplicateCount ?? 0),
    byUnit: byUnit
      .filter((u) => u.unit)
      .map((u) => ({ unit: u.unit!, count: Number(u.count) })),
    byFiscalYear: byFiscalYear
      .filter((y) => y.fiscalYear)
      .map((y) => ({
        fiscalYear: y.fiscalYear!,
        count: Number(y.count),
        totalAmount: Number(y.totalAmount ?? 0),
      })),
    avgProcessingDays: null,
  });
});

router.get("/dashboard/aging", async (req, res) => {
  const activeStatuses = [
    "Awaiting Processing",
    "In Progress",
    "Receipted",
    "Processed in Accounting",
    "Approved in Accounting",
  ];

  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(sql`invoice_status = ANY(${activeStatuses})`)
    .orderBy(desc(invoicesTable.updatedAt))
    .limit(200);

  const now = new Date();
  const aging = invoices.map((inv) => {
    const daysSinceModified = Math.floor(
      (now.getTime() - inv.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const cdoDate = inv.programReceivedDate ? new Date(inv.programReceivedDate) : null;
    const acctDate = inv.accountingReceivedDate ? new Date(inv.accountingReceivedDate) : null;
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceStatus: inv.invoiceStatus,
      invoiceAmount: Number(inv.invoiceAmount),
      vendorName: inv.vendorName,
      staffName: inv.staffName,
      unit: inv.unit,
      supervisor: inv.supervisor,
      programReceivedDate: inv.programReceivedDate,
      accountingReceivedDate: inv.accountingReceivedDate,
      daysSinceModified,
      daysSinceCdoReceived: cdoDate
        ? Math.floor((now.getTime() - cdoDate.getTime()) / (1000 * 60 * 60 * 24))
        : null,
      daysSinceAccountingReceived: acctDate
        ? Math.floor((now.getTime() - acctDate.getTime()) / (1000 * 60 * 60 * 24))
        : null,
      expedite: inv.expedite,
    };
  });

  res.json(aging);
});

router.get("/dashboard/activity", async (req, res) => {
  const { limit = "20" } = req.query as Record<string, string>;
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const activity = await db
    .select()
    .from(invoiceActivityTable)
    .orderBy(desc(invoiceActivityTable.changedAt))
    .limit(limitNum);

  res.json(
    activity.map((a) => ({
      ...a,
      changedAt: a.changedAt.toISOString(),
    }))
  );
});

export default router;
