import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { Readable } from "stream";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { db } from "../lib/db";
import { invoiceAttachmentsTable, invoicesTable, usersTable } from "@workspace/db";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const VALID_OBJECT_PATH = /^\/objects\/[a-zA-Z0-9_\-./]+$/;

async function canAccessObjectPath(userId: number, role: string, objectPath: string): Promise<boolean> {
  if (role === "admin" || role === "accountant" || role === "approver" || role === "staff") {
    return true;
  }
  if (role === "vendor") {
    const [attachment] = await db
      .select({ invoiceId: invoiceAttachmentsTable.invoiceId })
      .from(invoiceAttachmentsTable)
      .where(eq(invoiceAttachmentsTable.objectPath, objectPath))
      .limit(1);
    if (!attachment) return false;
    const [invoice] = await db
      .select({ vendorID: invoicesTable.vendorID })
      .from(invoicesTable)
      .where(eq(invoicesTable.id, attachment.invoiceId))
      .limit(1);
    if (!invoice) return false;
    const [user] = await db
      .select({ linkedSupplierId: usersTable.linkedSupplierId })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    return !!(user?.linkedSupplierId && user.linkedSupplierId === invoice.vendorID);
  }
  return false;
}

router.post("/storage/upload-url", async (req: Request, res: Response) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { filename, contentType } = req.body;
    if (!filename) {
      res.status(400).json({ error: "filename is required" });
      return;
    }
    const uploadUrl = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadUrl);
    res.json({ uploadUrl, objectPath });
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

router.post("/storage/download-url", async (req: Request, res: Response) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { objectPath } = req.body;
    if (!objectPath || typeof objectPath !== "string") {
      res.status(400).json({ error: "objectPath is required" });
      return;
    }
    if (!VALID_OBJECT_PATH.test(objectPath)) {
      res.status(400).json({ error: "Invalid objectPath format" });
      return;
    }
    const allowed = await canAccessObjectPath(req.session.userId, req.session.role, objectPath);
    if (!allowed) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
    const privateDir = process.env.PRIVATE_OBJECT_DIR || "";
    const fullPath = `${privateDir}/${objectPath.replace(/^\/objects\//, "")}`;
    const pathParts = fullPath.replace(/^\//, "").split("/");
    const bucketName = pathParts[0];
    const objectName = pathParts.slice(1).join("/");
    const response = await fetch(
      `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket_name: bucketName,
          object_name: objectName,
          method: "GET",
          expires_at: new Date(Date.now() + 900 * 1000).toISOString(),
        }),
        signal: AbortSignal.timeout(30_000),
      }
    );
    if (!response.ok) {
      res.status(500).json({ error: "Failed to sign download URL" });
      return;
    }
    const { signed_url } = await response.json();
    res.json({ downloadUrl: signed_url });
  } catch (error) {
    req.log.error({ err: error }, "Error generating download URL");
    res.status(500).json({ error: "Failed to generate download URL" });
  }
});

router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const response = await objectStorageService.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;

    if (!VALID_OBJECT_PATH.test(objectPath)) {
      res.status(400).json({ error: "Invalid object path" });
      return;
    }

    const allowed = await canAccessObjectPath(req.session.userId, req.session.role, objectPath);
    if (!allowed) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
