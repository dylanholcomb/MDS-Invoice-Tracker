import {
  pgTable,
  serial,
  text,
  boolean,
  numeric,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("accountant"),
  linkedSupplierId: text("linked_supplier_id"),
  email: text("email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  invoiceStatus: text("invoice_status").notNull().default("Awaiting Processing"),
  invoiceAmount: numeric("invoice_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  invoiceDate: text("invoice_date"),
  invoiceType: text("invoice_type"),
  fiscalYear: text("fiscal_year"),
  vendorID: text("vendor_id"),
  vendorName: text("vendor_name"),
  contractPONumber: text("contract_po_number"),
  fiscalPONumber: text("fiscal_po_number"),
  erpReceiptRef: text("erp_receipt_ref"),
  erpVoucherRef: text("erp_voucher_ref"),
  erpPaymentRef: text("erp_payment_ref"),
  erpPaymentDate: text("erp_payment_date"),
  approvalDate: text("approval_date"),
  approvalManager: text("approval_manager"),
  staffName: text("staff_name"),
  supervisor: text("supervisor"),
  unit: text("unit"),
  group: text("group"),
  section: text("section"),
  branch: text("branch"),
  divisionCenter: text("division_center"),
  reportingStructure: text("reporting_structure"),
  statusNotes: text("status_notes"),
  submissionNotes: text("submission_notes"),
  programReceivedDate: text("program_received_date"),
  accountingReceivedDate: text("accounting_received_date"),
  invoiceReturnDate: text("invoice_return_date"),
  claimSchedule: text("claim_schedule"),
  processingType: text("processing_type"),
  expedite: boolean("expedite").notNull().default(false),
  cashHold: boolean("cash_hold").notNull().default(false),
  localHealth: boolean("local_health").notNull().default(false),
  specialHandling: boolean("special_handling").notNull().default(false),
  dvbeSbCmia: boolean("dvbe_sb_cmia").notNull().default(false),
  revolvingFund: boolean("revolving_fund").notNull().default(false),
  snapNurse: boolean("snap_nurse").notNull().default(false),
  calVaxGrant: boolean("cal_vax_grant").notNull().default(false),
  schoolsGrant: boolean("schools_grant").notNull().default(false),
  airQualityCmp: boolean("air_quality_cmp").notNull().default(false),
  advancePayment: boolean("advance_payment").notNull().default(false),
  drill2: boolean("drill_2").notNull().default(false),
  covid19Related: text("covid19_related"),
  speedchartCode: text("speedchart_code"),
  submitterName: text("submitter_name"),
  submitterEmail: text("submitter_email"),
  submitterUserId: integer("submitter_user_id"),
  submissionReference: text("submission_reference"),
  assignedToUserId: integer("assigned_to_user_id"),
  assignedToName: text("assigned_to_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;

export const suppliersTable = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  supplierID: text("supplier_id").notNull().unique(),
  supplierName: text("supplier_name").notNull(),
  fiCalID: text("fi_cal_id"),
  sb: boolean("sb").notNull().default(false),
  mb: boolean("mb").notNull().default(false),
  dvbe: boolean("dvbe").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSupplierSchema = createInsertSchema(suppliersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliersTable.$inferSelect;

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNumber: text("po_number").notNull().unique(),
  poDate: text("po_date"),
  poStatus: text("po_status"),
  supplierID: text("supplier_id"),
  supplierName: text("supplier_name"),
  lineItemDescription: text("line_item_description"),
  fund: text("fund"),
  program: text("program"),
  project: text("project"),
  encumberedAmount: numeric("encumbered_amount", { precision: 14, scale: 2 }),
  expensedAmount: numeric("expensed_amount", { precision: 14, scale: 2 }),
  remainingEncumbrance: numeric("remaining_encumbrance", { precision: 14, scale: 2 }),
  budgetStatus: text("budget_status"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrdersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;

export const speedchartsTable = pgTable("speedcharts", {
  id: serial("id").primaryKey(),
  speedchart: text("speedchart").notNull().unique(),
  description: text("description"),
  sequence: text("sequence"),
  appropRef: text("approp_ref"),
  fund: text("fund"),
  eny: text("eny"),
  program: text("program"),
  pcBusinessUnit: text("pc_business_unit"),
  projectID: text("project_id"),
  activityID: text("activity_id"),
  svcLoc: text("svc_loc"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSpeedchartSchema = createInsertSchema(speedchartsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSpeedchart = z.infer<typeof insertSpeedchartSchema>;
export type Speedchart = typeof speedchartsTable.$inferSelect;

export const staffRoutesTable = pgTable("staff_routes", {
  id: serial("id").primaryKey(),
  reportingStructure: text("reporting_structure").notNull(),
  invoiceType: text("invoice_type"),
  accountant: text("accountant").notNull(),
  supervisor: text("supervisor"),
  unit: text("unit"),
  branch: text("branch"),
  section: text("section"),
  group: text("group"),
  divisionCenter: text("division_center"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStaffRouteSchema = createInsertSchema(staffRoutesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertStaffRoute = z.infer<typeof insertStaffRouteSchema>;
export type StaffRoute = typeof staffRoutesTable.$inferSelect;

export const invoiceActivityTable = pgTable("invoice_activity", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoicesTable.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),
  action: text("action").notNull(),
  statusFrom: text("status_from"),
  statusTo: text("status_to"),
  changedBy: text("changed_by"),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
  notes: text("notes"),
});

export const insertInvoiceActivitySchema = createInsertSchema(invoiceActivityTable).omit({
  id: true,
  changedAt: true,
});
export type InsertInvoiceActivity = z.infer<typeof insertInvoiceActivitySchema>;
export type InvoiceActivity = typeof invoiceActivityTable.$inferSelect;

export const invoiceAttachmentsTable = pgTable("invoice_attachments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoicesTable.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  objectPath: text("object_path").notNull(),
  contentType: text("content_type"),
  fileSize: integer("file_size"),
  uploadedBy: text("uploaded_by"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const insertInvoiceAttachmentSchema = createInsertSchema(invoiceAttachmentsTable).omit({
  id: true,
  uploadedAt: true,
});
export type InsertInvoiceAttachment = z.infer<typeof insertInvoiceAttachmentSchema>;
export type InvoiceAttachment = typeof invoiceAttachmentsTable.$inferSelect;

export const invoiceHandoffsTable = pgTable("invoice_handoffs", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoicesTable.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),
  requestedByUserId: integer("requested_by_user_id").notNull(),
  requestedByName: text("requested_by_name").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  newAssigneeUserId: integer("new_assignee_user_id"),
  newAssigneeName: text("new_assignee_name"),
  reviewedByUserId: integer("reviewed_by_user_id"),
  reviewedByName: text("reviewed_by_name"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInvoiceHandoffSchema = createInsertSchema(invoiceHandoffsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertInvoiceHandoff = z.infer<typeof insertInvoiceHandoffSchema>;
export type InvoiceHandoff = typeof invoiceHandoffsTable.$inferSelect;

export const erpConfigsTable = pgTable("erp_configs", {
  id: serial("id").primaryKey(),
  erpName: text("erp_name").notNull(),
  receiptRefLabel: text("receipt_ref_label").notNull().default("Receipt Reference"),
  voucherRefLabel: text("voucher_ref_label").notNull().default("Voucher Reference"),
  paymentRefLabel: text("payment_ref_label").notNull().default("Payment Reference"),
  paymentDateLabel: text("payment_date_label").notNull().default("Payment Date"),
  paymentConfirmedLabel: text("payment_confirmed_label").notNull().default("Payment Confirmed"),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertErpConfigSchema = createInsertSchema(erpConfigsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertErpConfig = z.infer<typeof insertErpConfigSchema>;
export type ErpConfig = typeof erpConfigsTable.$inferSelect;