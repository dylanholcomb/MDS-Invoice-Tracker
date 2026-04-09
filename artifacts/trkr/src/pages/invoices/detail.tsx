import { useState } from "react";
import { useParams, Link } from "wouter";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Edit, X, Check, AlertTriangle, CheckCircle2, Circle } from "lucide-react";

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
  const [editingStage, setEditingStage] = useState<number | null>(null);
  const [stageFields, setStageFields] = useState<Record<string, string>>({});

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

  const handleFiscalStageUpdate = async () => {
    try {
      const data: Record<string, string | null> = {};
      for (const [key, val] of Object.entries(stageFields)) {
        data[key] = val.trim() || null;
      }
      const result = await updateInvoice.mutateAsync({ id, data });
      await queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(id) });
      await queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      const statusMsg = result.invoiceStatus !== invoice?.invoiceStatus
        ? ` Status advanced to "${result.invoiceStatus}".`
        : "";
      toast({ title: "Saved", description: `Fi\$Cal information updated.${statusMsg}` });
      setEditingStage(null);
      setStageFields({});
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
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

        <div className="bg-card border border-card-border rounded-lg p-5 mb-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Routing</h2>
          <dl className="grid grid-cols-3 gap-3">
            <DetailField label="Reporting Structure" value={invoice.reportingStructure} />
            <DetailField label="Staff Name" value={invoice.staffName} />
            <DetailField label="Supervisor" value={invoice.supervisor} />
            <DetailField label="Unit" value={invoice.unit} />
            <DetailField label="Branch" value={invoice.branch} />
            <DetailField label="Section" value={invoice.section} />
          </dl>
        </div>

        {/* Fi$Cal Accounting Workflow */}
        <div className="bg-card border border-card-border rounded-lg p-5 mb-4" data-testid="fiscal-workflow">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">Fi$Cal Accounting Workflow</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Completing each stage automatically advances the invoice status.
            </p>
          </div>

          <div className="space-y-0 divide-y divide-border">
            {/* Stage 1: Fi$Cal Receipt */}
            {(() => {
              const stageNum = 1;
              const isComplete = !!invoice.receiptId;
              const isEditing = editingStage === stageNum;
              return (
                <div className="py-4 flex gap-4 items-start" data-testid="fiscal-stage-1">
                  <div className="flex-shrink-0 mt-0.5">
                    {isComplete
                      ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                      : <Circle className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Stage 1 — Fi$Cal Receipt</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Accountant creates a receipt in Fi$Cal against the purchase order. Advances status to{" "}
                          <span className="font-medium">Receipted</span>.
                        </p>
                      </div>
                      {!isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0"
                          data-testid="button-edit-stage-1"
                          onClick={() => {
                            setEditingStage(stageNum);
                            setStageFields({ receiptId: invoice.receiptId ?? "" });
                          }}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          {isComplete ? "Edit" : "Enter"}
                        </Button>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="mt-3 flex items-end gap-2 max-w-sm">
                        <div className="flex-1">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Fi$Cal Receipt ID
                          </label>
                          <Input
                            value={stageFields.receiptId ?? ""}
                            onChange={(e) => setStageFields((f) => ({ ...f, receiptId: e.target.value }))}
                            className="mt-1 text-sm"
                            placeholder="e.g. RCP-2024-00123"
                            data-testid="input-receipt-id"
                          />
                        </div>
                        <Button size="sm" onClick={handleFiscalStageUpdate} disabled={updateInvoice.isPending} data-testid="button-save-stage-1">
                          {updateInvoice.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                          Save
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEditingStage(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : isComplete ? (
                      <p className="mt-1.5 text-sm font-mono text-foreground">{invoice.receiptId}</p>
                    ) : (
                      <p className="mt-1.5 text-xs text-muted-foreground italic">Not yet entered</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Stage 2: Fi$Cal Voucher */}
            {(() => {
              const stageNum = 2;
              const isComplete = !!invoice.voucherID;
              const isEditing = editingStage === stageNum;
              return (
                <div className="py-4 flex gap-4 items-start" data-testid="fiscal-stage-2">
                  <div className="flex-shrink-0 mt-0.5">
                    {isComplete
                      ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                      : <Circle className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Stage 2 — Payment Voucher</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Accountant creates a payment voucher in Fi$Cal after verifying the invoice. Advances status to{" "}
                          <span className="font-medium">Processed in Accounting</span>.
                        </p>
                      </div>
                      {!isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0"
                          data-testid="button-edit-stage-2"
                          onClick={() => {
                            setEditingStage(stageNum);
                            setStageFields({ voucherID: invoice.voucherID ?? "" });
                          }}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          {isComplete ? "Edit" : "Enter"}
                        </Button>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="mt-3 flex items-end gap-2 max-w-sm">
                        <div className="flex-1">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Fi$Cal Voucher Number
                          </label>
                          <Input
                            value={stageFields.voucherID ?? ""}
                            onChange={(e) => setStageFields((f) => ({ ...f, voucherID: e.target.value }))}
                            className="mt-1 text-sm"
                            placeholder="e.g. VCH-2024-00456"
                            data-testid="input-voucher-id"
                          />
                        </div>
                        <Button size="sm" onClick={handleFiscalStageUpdate} disabled={updateInvoice.isPending} data-testid="button-save-stage-2">
                          {updateInvoice.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                          Save
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEditingStage(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : isComplete ? (
                      <p className="mt-1.5 text-sm font-mono text-foreground">{invoice.voucherID}</p>
                    ) : (
                      <p className="mt-1.5 text-xs text-muted-foreground italic">Not yet entered</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Stage 3: Supervisor Approval */}
            {(() => {
              const stageNum = 3;
              const isComplete = !!(invoice.approvalDate && invoice.approvalManager);
              const isEditing = editingStage === stageNum;
              return (
                <div className="py-4 flex gap-4 items-start" data-testid="fiscal-stage-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {isComplete
                      ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                      : <Circle className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Stage 3 — Supervisor Approval</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Accounting supervisor approves the voucher in Fi$Cal. Approval date and manager name
                          come from the daily Fi$Cal report. Advances status to{" "}
                          <span className="font-medium">Approved in Accounting</span>.
                        </p>
                      </div>
                      {!isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0"
                          data-testid="button-edit-stage-3"
                          onClick={() => {
                            setEditingStage(stageNum);
                            setStageFields({
                              approvalDate: invoice.approvalDate ?? "",
                              approvalManager: invoice.approvalManager ?? "",
                            });
                          }}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          {isComplete ? "Edit" : "Enter"}
                        </Button>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="mt-3 space-y-2 max-w-sm">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Approval Date
                          </label>
                          <Input
                            type="date"
                            value={stageFields.approvalDate ?? ""}
                            onChange={(e) => setStageFields((f) => ({ ...f, approvalDate: e.target.value }))}
                            className="mt-1 text-sm"
                            data-testid="input-approval-date"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Approval Manager
                          </label>
                          <Input
                            value={stageFields.approvalManager ?? ""}
                            onChange={(e) => setStageFields((f) => ({ ...f, approvalManager: e.target.value }))}
                            className="mt-1 text-sm"
                            placeholder="Manager name from Fi$Cal report"
                            data-testid="input-approval-manager"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" onClick={handleFiscalStageUpdate} disabled={updateInvoice.isPending} data-testid="button-save-stage-3">
                            {updateInvoice.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                            Save
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingStage(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : isComplete ? (
                      <div className="mt-1.5 flex gap-6">
                        <div>
                          <dt className="text-xs text-muted-foreground">Approval Date</dt>
                          <dd className="text-sm text-foreground">{invoice.approvalDate}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Approval Manager</dt>
                          <dd className="text-sm text-foreground">{invoice.approvalManager}</dd>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1.5 text-xs text-muted-foreground italic">Not yet entered</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Stage 4: SCO Warrant */}
            {(() => {
              const stageNum = 4;
              const isComplete = !!(invoice.warrantNumber && invoice.warrantDate);
              const isEditing = editingStage === stageNum;
              return (
                <div className="py-4 flex gap-4 items-start" data-testid="fiscal-stage-4">
                  <div className="flex-shrink-0 mt-0.5">
                    {isComplete
                      ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                      : <Circle className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Stage 4 — SCO Warrant</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          The State Controller's Office issues a payment warrant. Warrant number and date come
                          from the daily Fi$Cal report. Advances status to{" "}
                          <span className="font-medium">SCO Warrant Issued</span>.
                        </p>
                      </div>
                      {!isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0"
                          data-testid="button-edit-stage-4"
                          onClick={() => {
                            setEditingStage(stageNum);
                            setStageFields({
                              warrantNumber: invoice.warrantNumber ?? "",
                              warrantDate: invoice.warrantDate ?? "",
                            });
                          }}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          {isComplete ? "Edit" : "Enter"}
                        </Button>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="mt-3 space-y-2 max-w-sm">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Warrant Number
                          </label>
                          <Input
                            value={stageFields.warrantNumber ?? ""}
                            onChange={(e) => setStageFields((f) => ({ ...f, warrantNumber: e.target.value }))}
                            className="mt-1 text-sm"
                            placeholder="e.g. WRT-2024-00789"
                            data-testid="input-warrant-number"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Warrant Date
                          </label>
                          <Input
                            type="date"
                            value={stageFields.warrantDate ?? ""}
                            onChange={(e) => setStageFields((f) => ({ ...f, warrantDate: e.target.value }))}
                            className="mt-1 text-sm"
                            data-testid="input-warrant-date"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" onClick={handleFiscalStageUpdate} disabled={updateInvoice.isPending} data-testid="button-save-stage-4">
                            {updateInvoice.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                            Save
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingStage(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : isComplete ? (
                      <div className="mt-1.5 flex gap-6">
                        <div>
                          <dt className="text-xs text-muted-foreground">Warrant Number</dt>
                          <dd className="text-sm text-foreground font-mono">{invoice.warrantNumber}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Warrant Date</dt>
                          <dd className="text-sm text-foreground">{invoice.warrantDate}</dd>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1.5 text-xs text-muted-foreground italic">Not yet entered</p>
                    )}
                  </div>
                </div>
              );
            })()}
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
