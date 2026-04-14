import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db } from "../lib/db";
import { invoiceHandoffsTable, invoiceActivityTable, invoicesTable, usersTable } from "@workspace/db";
import { requireRole } from "../lib/auth";

const router: IRouter = Router();

const CAN_REVIEW = ["admin", "approver"];

function serialize(h: typeof invoiceHandoffsTable.$inferSelect) {
  return {
    ...h,
    createdAt: h.createdAt.toISOString(),
    reviewedAt: h.reviewedAt?.toISOString() ?? null,
  };
}

router.post("/invoices/:id/handoffs", requireRole("admin", "approver", "accountant", "staff"), async (req, res) => {
  const invoiceId = parseInt(req.params.id, 10);
  if (isNaN(invoiceId)) { res.status(400).json({ error: "Invalid invoice ID" }); return; }

  const [invoice] = await db
    .select({ id: invoicesTable.id, invoiceNumber: invoicesTable.invoiceNumber })
    .from(invoicesTable)
    .where(eq(invoicesTable.id, invoiceId))
    .limit(1);

  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }

  const existing = await db
    .select({ id: invoiceHandoffsTable.id })
    .from(invoiceHandoffsTable)
    .where(and(eq(invoiceHandoffsTable.invoiceId, invoiceId), eq(invoiceHandoffsTable.status, "pending")))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "A handoff request is already pending for this invoice" });
    return;
  }

  const [user] = await db
    .select({ id: usersTable.id, displayName: usersTable.displayName })
    .from(usersTable)
    .where(eq(usersTable.id, req.session!.userId))
    .limit(1);

  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { notes } = req.body as { notes?: string };

  const [handoff] = await db
    .insert(invoiceHandoffsTable)
    .values({
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      requestedByUserId: user.id,
      requestedByName: user.displayName,
      notes: notes ?? null,
      status: "pending",
    })
    .returning();

  await db.insert(invoiceActivityTable).values({
    invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    action: "handoff_requested",
    statusFrom: null,
    statusTo: null,
    changedBy: user.displayName,
    notes: notes ? `Handoff requested: ${notes}` : "Handoff requested",
  });

  res.status(201).json(serialize(handoff));
});

router.get("/handoffs", requireRole("admin", "approver"), async (req, res) => {
  const { status } = req.query as Record<string, string>;
  const where = status ? eq(invoiceHandoffsTable.status, status) : undefined;
  const handoffs = await db
    .select()
    .from(invoiceHandoffsTable)
    .where(where)
    .orderBy(desc(invoiceHandoffsTable.createdAt));
  res.json(handoffs.map(serialize));
});

router.post("/handoffs/:id/approve", requireRole(...CAN_REVIEW), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [handoff] = await db
    .select()
    .from(invoiceHandoffsTable)
    .where(eq(invoiceHandoffsTable.id, id))
    .limit(1);

  if (!handoff) { res.status(404).json({ error: "Handoff request not found" }); return; }
  if (handoff.status !== "pending") {
    res.status(409).json({ error: "This request has already been reviewed" });
    return;
  }

  const { newAssigneeUserId } = req.body as { newAssigneeUserId: number };
  if (!newAssigneeUserId) {
    res.status(400).json({ error: "newAssigneeUserId is required" });
    return;
  }

  const [newAssignee] = await db
    .select({ id: usersTable.id, displayName: usersTable.displayName })
    .from(usersTable)
    .where(eq(usersTable.id, newAssigneeUserId))
    .limit(1);

  if (!newAssignee) { res.status(404).json({ error: "Assignee user not found" }); return; }

  const reviewer = req.session!;

  const [updated] = await db
    .update(invoiceHandoffsTable)
    .set({
      status: "approved",
      newAssigneeUserId: newAssignee.id,
      newAssigneeName: newAssignee.displayName,
      reviewedByUserId: reviewer.userId,
      reviewedByName: reviewer.username,
      reviewedAt: new Date(),
    })
    .where(eq(invoiceHandoffsTable.id, id))
    .returning();

  await db
    .update(invoicesTable)
    .set({
      assignedToUserId: newAssignee.id,
      assignedToName: newAssignee.displayName,
      updatedAt: new Date(),
    })
    .where(eq(invoicesTable.id, handoff.invoiceId));

  await db.insert(invoiceActivityTable).values({
    invoiceId: handoff.invoiceId,
    invoiceNumber: handoff.invoiceNumber,
    action: "handoff_approved",
    statusFrom: null,
    statusTo: null,
    changedBy: reviewer.username,
    notes: `Reassigned to ${newAssignee.displayName}`,
  });

  res.json(serialize(updated));
});

router.post("/handoffs/:id/reject", requireRole(...CAN_REVIEW), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [handoff] = await db
    .select()
    .from(invoiceHandoffsTable)
    .where(eq(invoiceHandoffsTable.id, id))
    .limit(1);

  if (!handoff) { res.status(404).json({ error: "Handoff request not found" }); return; }
  if (handoff.status !== "pending") {
    res.status(409).json({ error: "This request has already been reviewed" });
    return;
  }

  const reviewer = req.session!;

  const [updated] = await db
    .update(invoiceHandoffsTable)
    .set({
      status: "rejected",
      reviewedByUserId: reviewer.userId,
      reviewedByName: reviewer.username,
      reviewedAt: new Date(),
    })
    .where(eq(invoiceHandoffsTable.id, id))
    .returning();

  await db.insert(invoiceActivityTable).values({
    invoiceId: handoff.invoiceId,
    invoiceNumber: handoff.invoiceNumber,
    action: "handoff_rejected",
    statusFrom: null,
    statusTo: null,
    changedBy: reviewer.username,
    notes: `Handoff request rejected`,
  });

  res.json(serialize(updated));
});

export default router;
