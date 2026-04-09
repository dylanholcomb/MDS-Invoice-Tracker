# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Project: TRKR — Invoice Tracking System

**Client**: Mosaic Data Solutions  
**Purpose**: Government invoice tracking and payment processing

### Artifacts

1. **TRKR Web App** (`artifacts/trkr`, `/`, port 19354)
   - Admin dashboard with Recharts stats
   - Invoice list, detail, new invoice
   - Suppliers, purchase orders, staff routing
   - Aging report
   - ERP 4-stage accounting workflow (Receipt Ref → Voucher Ref → Approval → Payment Ref)
   - Admin login: `admin` / `password`

2. **API Server** (`artifacts/api-server`, `/api`, port 8080)
   - Express 5 REST API
   - Auth: express-session (same-domain proxy)
   - Routes: auth, invoices, suppliers, purchase-orders, speedcharts, staff, dashboard, vendor, storage
   - Object storage: GCS via Replit sidecar (presigned URLs for uploads/downloads)
   - Attachments: `GET /api/invoices/:id/attachments`

3. **Vendor Portal** (`artifacts/vendor-portal`, `/vendor/`, port 19328)
   - Standalone vendor submission portal
   - Vendor login (role: `vendor`)
   - Submit invoices with PDF attachments (GCS object storage, presigned URL upload)
   - Confirmation page with reference number (REF-XXXX format)
   - My Submissions list + detail view
   - Vendor accounts: `acme_vendor` / `vendor123`, `tech_supply` / `vendor123`

### Database

- `users`: id, username, password_hash, display_name, role, linked_supplier_id, email
- `invoices`: full invoice lifecycle + submitter_user_id, submission_reference, erp_receipt_ref, erp_voucher_ref, erp_payment_ref, erp_payment_date
- `invoice_attachments`: id, invoice_id, filename, object_path, content_type, file_size, uploaded_by
- `erp_configs`: id, erp_name, receipt_ref_label, voucher_ref_label, payment_ref_label, payment_date_label, payment_confirmed_label, is_active
- `suppliers`, `purchase_orders`, `speedcharts`, `staff_routing`, `invoice_activity`

### Object Storage

- Provisioned GCS bucket (Replit managed)
- Env vars: `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`
- Lib: `lib/object-storage-web/` (client), `artifacts/api-server/src/lib/objectStorage.ts` (server)
- Upload flow: GET presigned PUT URL → PUT file directly → save objectPath to DB

### Invoice Statuses

"Awaiting Processing", "In Progress", "Receipted", "Processed in Accounting", 
"Approved in Accounting", "Payment Confirmed", "Returned to Submitter", "Duplicate", "Completed"

### ERP Auto-Status Logic

- erpReceiptRef filled → advance to "Receipted"
- erpVoucherRef filled → advance to "Processed in Accounting"
- approvalDate + approvalManager both filled → advance to "Approved in Accounting"
- erpPaymentRef + erpPaymentDate both filled → advance to "Payment Confirmed"
- Only advances forward, never retreats status
- Field aliases: accepts Fi$Cal (Receipt ID, Voucher ID, Warrant Number/Date) and SAP/NetSuite/QB equivalents in ERP Import

### ERP Integration Layer

- `erp_configs` table holds per-client ERP configuration and custom field labels
- ERP Import page accepts Excel/CSV from any ERP — column header aliases mapped in HEADER_MAP
- Gov version aliases: Receipt ID, Voucher ID, Warrant Number, Warrant Date
- Private/SAP aliases: Document Number, Check/EFT Reference, Payment Date
- Architecture ready for webhook/API connector as next integration slot
