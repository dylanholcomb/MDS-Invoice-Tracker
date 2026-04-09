import { useState } from "react";
import { useParams, Link } from "wouter";
import { useForm } from "react-hook-form";
import {
  useGetInvoice,
  useUpdateInvoice,
  getGetInvoiceQueryKey,
  getListInvoicesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Edit, X, Check, AlertTriangle } from "lucide-react";

const STATUSES = [
  "Awaiting Processing",
  "In Progress",
  "Receipted",
  "Processed in Accounting",
  "Approved in Accounting",
  "SCO Warrant Issued",
  "Returned to Submitter",
  "Duplicate",
  "Completed",
];

const FLAG_FIELDS = [
  { name: "expedite", label: "Expedite" },
  { name: "cashHold", label: "Cash Hold" },
  { name: "localHealth", label: "Local Health" },
  { name: "specialHandling", label: "Special Handling" },
  { name: "dvbeSbCmia", label: "DVBE/SB/CMIA" },
  { name: "revolvingFund", label: "Revolving Fund" },
  { name: "snapNurse", label: "SNAP/NURSE" },
  { name: "calVaxGrant", label: "CalVax Grant" },
  { name: "schoolsGrant", label: "Schools Grant" },
  { name: "airQualityCmp", label: "Air Quality CMP" },
  { name: "advancePayment", label: "Advance Payment" },
  { name: "drill2", label: "Drill 2" },
];

function DetailField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value ?? "—"}</dd>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [editingVoucher, setEditingVoucher] = useState(false);
  const [voucherID, setVoucherID] = useState("");
  const [warrantNumber, setWarrantNumber] = useState("");

  const { data: invoice, isLoading } = useGetInvoice(id, {
    query: {
      queryKey: getGetInvoiceQueryKey(id),
      enabled: !!id,
    },
  });

  const updateInvoice = useUpdateInvoice();

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    try {
      await updateInvoice.mutateAsync({
        id,
        data: { invoiceStatus: newStatus, statusNotes: statusNotes || null },
      });
      await queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(id) });
      await queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      toast({ title: "Status updated", description: `Invoice moved to "${newStatus}"` });
      setEditingStatus(false);
      setStatusNotes("");
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const handleVoucherUpdate = async () => {
    try {
      await updateInvoice.mutateAsync({
        id,
        data: { voucherID: voucherID || null, warrantNumber: warrantNumber || null },
      });
      await queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(id) });
      toast({ title: "Updated", description: "Voucher information saved" });
      setEditingVoucher(false);
    } catch {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="px-6 py-5 max-w-4xl">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!invoice) {
    return (
      <AppLayout>
        <div className="px-6 py-5">
          <p className="text-sm text-muted-foreground">Invoice not found.</p>
          <Link href="/invoices">
            <a className="text-primary hover:underline text-sm">Back to invoices</a>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const activeFlags = FLAG_FIELDS.filter(
    (f) => invoice[f.name as keyof typeof invoice] === true
  );

  return (
    <AppLayout>
      <div className="px-6 py-5 max-w-4xl">
        <div className="flex items-start gap-3 mb-5">
          <Link href="/invoices">
            <a className="mt-1 text-muted-foreground hover:text-foreground" data-testid="link-back-invoices">
              <ArrowLeft className="h-4 w-4" />
            </a>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className="text-xl font-bold text-foreground"
                data-testid="text-invoice-number"
              >
                {invoice.invoiceNumber}
              </h1>
              <InvoiceStatusBadge status={invoice.invoiceStatus} />
              {invoice.expedite && (
                <span className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Expedite
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {formatCurrency(invoice.invoiceAmount)} &bull; {invoice.fiscalYear ?? "—"} &bull; Created{" "}
              {new Date(invoice.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-lg p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Status</h2>
            {!editingStatus && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewStatus(invoice.invoiceStatus);
                  setEditingStatus(true);
                }}
                data-testid="button-edit-status"
              >
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                Change Status
              </Button>
            )}
          </div>

          {editingStatus ? (
            <div className="space-y-3">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger data-testid="select-new-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Optional notes about this status change..."
                rows={2}
                className="resize-none text-sm"
                data-testid="textarea-status-notes"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleStatusUpdate}
                  disabled={updateInvoice.isPending || !newStatus}
                  data-testid="button-save-status"
                >
                  {updateInvoice.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingStatus(false)}
                  data-testid="button-cancel-status"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <DetailField label="Current Status" value={invoice.invoiceStatus} />
              {invoice.statusNotes && (
                <DetailField label="Status Notes" value={invoice.statusNotes} />
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-card border border-card-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Invoice Details</h2>
            <dl className="grid grid-cols-2 gap-3">
              <DetailField label="Invoice #" value={invoice.invoiceNumber} />
              <DetailField
                label="Amount"
                value={formatCurrency(invoice.invoiceAmount)}
              />
              <DetailField label="Invoice Date" value={invoice.invoiceDate} />
              <DetailField label="Invoice Type" value={invoice.invoiceType} />
              <DetailField label="Fiscal Year" value={invoice.fiscalYear} />
              <DetailField label="Processing Type" value={invoice.processingType} />
            </dl>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Vendor Information</h2>
            <dl className="grid grid-cols-2 gap-3">
              <DetailField label="Vendor ID" value={invoice.vendorID} />
              <DetailField label="Vendor Name" value={invoice.vendorName} />
              <DetailField label="Contract/PO #" value={invoice.contractPONumber} />
              <DetailField label="Fiscal PO #" value={invoice.fiscalPONumber} />
            </dl>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-card border border-card-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Routing</h2>
            <dl className="grid grid-cols-2 gap-3">
              <DetailField label="Reporting Structure" value={invoice.reportingStructure} />
              <DetailField label="Staff Name" value={invoice.staffName} />
              <DetailField label="Supervisor" value={invoice.supervisor} />
              <DetailField label="Unit" value={invoice.unit} />
              <DetailField label="Branch" value={invoice.branch} />
              <DetailField label="Section" value={invoice.section} />
            </dl>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Accounting</h2>
              {!editingVoucher && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setVoucherID(invoice.voucherID ?? "");
                    setWarrantNumber(invoice.warrantNumber ?? "");
                    setEditingVoucher(true);
                  }}
                  data-testid="button-edit-accounting"
                >
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
            {editingVoucher ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Voucher ID</label>
                  <Input
                    value={voucherID}
                    onChange={(e) => setVoucherID(e.target.value)}
                    className="mt-1 text-sm"
                    data-testid="input-voucher-id"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Warrant Number</label>
                  <Input
                    value={warrantNumber}
                    onChange={(e) => setWarrantNumber(e.target.value)}
                    className="mt-1 text-sm"
                    data-testid="input-warrant-number"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleVoucherUpdate} disabled={updateInvoice.isPending} data-testid="button-save-accounting">
                    {updateInvoice.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingVoucher(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-3">
                <DetailField label="Voucher ID" value={invoice.voucherID} />
                <DetailField label="Warrant #" value={invoice.warrantNumber} />
                <DetailField label="Warrant Date" value={invoice.warrantDate} />
                <DetailField label="Approval Date" value={invoice.approvalDate} />
              </dl>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-card border border-card-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Dates</h2>
            <dl className="grid grid-cols-2 gap-3">
              <DetailField label="Program Received" value={invoice.programReceivedDate} />
              <DetailField label="Accounting Received" value={invoice.accountingReceivedDate} />
              <DetailField label="Return Date" value={invoice.invoiceReturnDate} />
              <DetailField label="Claim Schedule" value={invoice.claimSchedule} />
            </dl>
          </div>

          {activeFlags.length > 0 && (
            <div className="bg-card border border-card-border rounded-lg p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Active Flags</h2>
              <div className="flex flex-wrap gap-2">
                {activeFlags.map((f) => (
                  <span
                    key={f.name}
                    className="inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 border-orange-200"
                    data-testid={`active-flag-${f.name}`}
                  >
                    {f.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {(invoice.submissionNotes || invoice.statusNotes) && (
          <div className="bg-card border border-card-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Notes</h2>
            <dl className="space-y-3">
              {invoice.submissionNotes && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Submission Notes</dt>
                  <dd className="mt-1 text-sm text-foreground whitespace-pre-wrap">{invoice.submissionNotes}</dd>
                </div>
              )}
              {invoice.statusNotes && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status Notes</dt>
                  <dd className="mt-1 text-sm text-foreground whitespace-pre-wrap">{invoice.statusNotes}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
