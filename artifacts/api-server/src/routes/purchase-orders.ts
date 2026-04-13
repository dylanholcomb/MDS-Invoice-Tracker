import { Router, type IRouter } from "express";
import { eq, ilike, or } from "drizzle-orm";
import { db } from "../lib/db";
import { purchaseOrdersTable } from "@workspace/db";
import { requireRole } from "../lib/auth";

const router: IRouter = Router();

router.use("/purchase-orders", requireRole("admin", "accountant", "approver", "staff"));

router.get("/purchase-orders", async (req, res) => {
  const { search, supplierID, limit = "50" } = req.query as Record<string, string>;
  const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10)));

  let where;
  if (supplierID) {
    where = eq(purchaseOrdersTable.supplierID, supplierID);
  } else if (search) {
    where = or(
      ilike(purchaseOrdersTable.poNumber, `%${search}%`),
      ilike(purchaseOrdersTable.supplierName, `%${search}%`),
      ilike(purchaseOrdersTable.lineItemDescription, `%${search}%`)
    );
  }

  const results = await db
    .select()
    .from(purchaseOrdersTable)
    .where(where)
    .limit(limitNum)
    .orderBy(purchaseOrdersTable.poNumber);

  res.json(results.map(serializePO));
});

router.get("/purchase-orders/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [po] = await db
    .select()
    .from(purchaseOrdersTable)
    .where(eq(purchaseOrdersTable.id, id))
    .limit(1);

  if (!po) {
    res.status(404).json({ error: "Purchase order not found" });
    return;
  }

  res.json(serializePO(po));
});

function serializePO(po: typeof purchaseOrdersTable.$inferSelect) {
  return {
    ...po,
    encumberedAmount: po.encumberedAmount ? Number(po.encumberedAmount) : null,
    expensedAmount: po.expensedAmount ? Number(po.expensedAmount) : null,
    remainingEncumbrance: po.remainingEncumbrance ? Number(po.remainingEncumbrance) : null,
    createdAt: po.createdAt.toISOString(),
  };
}

export default router;
