import { sql, inArray, and, lt, eq, isNotNull } from "drizzle-orm";
import { db } from "./db";
import { invoicesTable } from "@workspace/db";
import { sendReturnReminderEmail } from "./email";

const STALE_DAYS = 45;
const RETURN_REMINDER_DAYS = 14;

const ACTIVE_STATUSES = [
  "Awaiting Processing",
  "In Progress",
  "Receipted",
  "Processed in Accounting",
  "Approved in Accounting",
];

export async function runStaleCron(): Promise<void> {
  try {
    const staleThreshold = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);
    const reminderThreshold = new Date(Date.now() - RETURN_REMINDER_DAYS * 24 * 60 * 60 * 1000);

    const [staleInvoices, returnedPending] = await Promise.all([
      db
        .select({
          id: invoicesTable.id,
          invoiceNumber: invoicesTable.invoiceNumber,
          invoiceStatus: invoicesTable.invoiceStatus,
          daysSince: sql<number>`extract(day from now() - updated_at)`,
        })
        .from(invoicesTable)
        .where(and(
          inArray(invoicesTable.invoiceStatus, ACTIVE_STATUSES),
          lt(invoicesTable.updatedAt, staleThreshold)
        )),

      db
        .select({
          id: invoicesTable.id,
          invoiceNumber: invoicesTable.invoiceNumber,
          submitterName: invoicesTable.submitterName,
          submitterEmail: invoicesTable.submitterEmail,
          submissionReference: invoicesTable.submissionReference,
          daysSince: sql<number>`extract(day from now() - updated_at)`,
        })
        .from(invoicesTable)
        .where(and(
          eq(invoicesTable.invoiceStatus, "Returned to Submitter"),
          isNotNull(invoicesTable.submitterEmail),
          lt(invoicesTable.updatedAt, reminderThreshold)
        )),
    ]);

    if (staleInvoices.length > 0) {
      console.log(`[stale-check] ${staleInvoices.length} invoices have not moved in ${STALE_DAYS}+ days:`);
      staleInvoices.forEach((inv) => {
        console.log(`  [stale] #${inv.invoiceNumber} (${inv.invoiceStatus}) — ${inv.daysSince} days since last update`);
      });
    } else {
      console.log(`[stale-check] No stale invoices found (threshold: ${STALE_DAYS} days)`);
    }

    for (const inv of returnedPending) {
      if (!inv.submitterEmail) continue;
      await sendReturnReminderEmail({
        invoiceNumber: inv.invoiceNumber,
        submitterName: inv.submitterName,
        submitterEmail: inv.submitterEmail,
        submissionReference: inv.submissionReference ?? undefined,
        daysSinceReturn: Math.floor(Number(inv.daysSince)),
      }).catch((err) => console.error(`[stale-check] Reminder email failed for ${inv.invoiceNumber}:`, err));
    }
  } catch (err) {
    console.error("[stale-check] Cron failed:", err);
  }
}
