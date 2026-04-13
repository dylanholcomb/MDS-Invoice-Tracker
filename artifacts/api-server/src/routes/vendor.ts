import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../lib/db";
import {
  usersTable,
  invoicesTable,
  suppliersTable,
  invoiceAttachmentsTable,
  type InsertInvoiceAttachment,
} from "@workspace/db";
import { randomUUID } from "crypto";

const router: IRouter = Router();

function requireVendor(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (req.session.role !== "vendor") {
    res.status(403).json({ error: "Vendor access required" });
    return;
  }
  next();
}

router.get("/vendor/me", async (req, res) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId))
    .limit(1);
  if (!user || user.role !== "vendor") {
    res.status(401).json({ error: "Not authenticated as vendor" });
    return;
  }
  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    linkedSupplierId: user.linkedSupplierId,
  });
});

async function buildSubmission(invoice: any) {
  const attachments = await db
    .select()
    .from(invoiceAttachmentsTable)
    .where(eq(invoiceAttachmentsTable.invoiceId, invoice.id));

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate ?? "",
    invoiceAmount: parseFloat(invoice.invoiceAmount ?? "0"),
    submissionReference: invoice.submissionReference ?? null,
    status: invoice.invoiceStatus,
    contractNumber: invoice.contractPONumber ?? null,
    poNumber: invoice.fiscalPONumber ?? null,
    description: invoice.description ?? null,
    createdAt: invoice.createdAt?.toISOString() ?? new Date().toISOString(),
    attachments: attachments.map((a) => ({
      id: a.id,
      filename: a.filename,
      contentType: a.contentType ?? null,
      fileSize: a.fileSize ?? null,
      objectPath: a.objectPath,
      uploadedAt: a.uploadedAt?.toISOString() ?? new Date().toISOString(),
    })),
  };
}

router.get("/vendor/submissions", async (req, res) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId))
    .limit(1);
  if (!user || user.role !== "vendor") {
    res.status(403).json({ error: "Vendor access required" });
    return;
  }

  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.submitterUserId, user.id))
    .orderBy(invoicesTable.createdAt);

  const submissions = await Promise.all(invoices.map(buildSubmission));
  res.json(submissions.reverse());
});

router.post("/vendor/submissions", async (req, res) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId))
    .limit(1);
  if (!user || user.role !== "vendor") {
    res.status(403).json({ error: "Vendor access required" });
    return;
  }

  const { invoiceNumber, invoiceDate, invoiceAmount, contractNumber, poNumber, description, attachmentPaths } = req.body;

  if (!invoiceNumber || !invoiceDate || invoiceAmount === undefined) {
    res.status(400).json({ error: "invoiceNumber, invoiceDate, and invoiceAmount are required" });
    return;
  }

  const submissionReference = `REF-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;

  let supplierName = user.displayName;
  let vendorId = user.linkedSupplierId ?? null;
  if (user.linkedSupplierId) {
    const [supplier] = await db
      .select()
      .from(suppliersTable)
      .where(eq(suppliersTable.supplierID, user.linkedSupplierId))
      .limit(1);
    if (supplier) {
      supplierName = supplier.supplierName;
    }
  }

  const [invoice] = await db
    .insert(invoicesTable)
    .values({
      invoiceNumber,
      invoiceDate,
      invoiceAmount: String(invoiceAmount),
      invoiceStatus: "Awaiting Processing",
      vendorID: vendorId,
      vendorName: supplierName,
      submitterUserId: user.id,
      submitterName: supplierName,
      submitterEmail: user.email ?? null,
      submissionReference,
      contractPONumber: contractNumber ?? undefined,
      description: description ?? undefined,
    })
    .returning();

  const VALID_OBJECT_PATH = /^\/objects\/[a-zA-Z0-9_\-./]+$/;
  if (attachmentPaths && Array.isArray(attachmentPaths) && attachmentPaths.length > 0) {
    const validPaths = (attachmentPaths as unknown[]).filter(
      (p): p is string => typeof p === "string" && VALID_OBJECT_PATH.test(p)
    );
    if (validPaths.length > 0) {
      await db.insert(invoiceAttachmentsTable).values(
        validPaths.map((path) => ({
          invoiceId: invoice.id,
          filename: path.split("/").pop() ?? path,
          objectPath: path,
          uploadedBy: user.username,
        }))
      );
    }
  }

  const submission = await buildSubmission(invoice);
  res.status(201).json(submission);
});

router.put("/vendor/submissions/:id", async (req, res) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId))
    .limit(1);
  if (!user || user.role !== "vendor") {
    res.status(403).json({ error: "Vendor access required" });
    return;
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.submitterUserId, user.id)))
    .limit(1);

  if (!invoice) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  if (invoice.invoiceStatus !== "Awaiting Processing") {
    res.status(409).json({ error: "This submission can no longer be edited because it has already been picked up for processing." });
    return;
  }

  const { invoiceNumber, invoiceDate, invoiceAmount, contractNumber, poNumber, description } = req.body;

  if (!invoiceNumber || !invoiceDate || invoiceAmount === undefined) {
    res.status(400).json({ error: "invoiceNumber, invoiceDate, and invoiceAmount are required" });
    return;
  }

  const [updated] = await db
    .update(invoicesTable)
    .set({
      invoiceNumber,
      invoiceDate,
      invoiceAmount: String(invoiceAmount),
      contractPONumber: contractNumber ?? undefined,
      description: description ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(invoicesTable.id, id))
    .returning();

  const submission = await buildSubmission(updated);
  res.json(submission);
});

router.get("/vendor/submissions/:id", async (req, res) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId))
    .limit(1);
  if (!user || user.role !== "vendor") {
    res.status(403).json({ error: "Vendor access required" });
    return;
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [invoice] = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.submitterUserId, user.id)))
    .limit(1);

  if (!invoice) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  const submission = await buildSubmission(invoice);
  res.json(submission);
});

export default router;
