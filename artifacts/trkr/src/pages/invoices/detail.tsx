import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import {
  useGetInvoice,
  useUpdateInvoice,
  getGetInvoiceQueryKey,
  getListInvoicesQueryKey,
  getGetDashboardStatsQueryKey,
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
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ArrowLeft, Edit, X, Check, AlertTriangle, CheckCircle2, Circle, Paperclip, ExternalLink, ArrowLeftRight } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "") || "";

interface InternalUser {
  id: number;
  username: string;
  displayName: string;
  role: string;
}

function HandoffSection({ invoiceId, assignedToName }: { invoiceId: number; assignedToName?: string | null }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [internalUsers, setInternalUsers] = useState<InternalUser[]>([]);
  const [requesting, setRequesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [directAssignee, setDirectAssignee] = useState("");
  const [saving, setSaving] = useState(false);

  const isManager = user?.role === "admin" || user?.role === "approver";

  useEffect(() => {
    fetch(`${BASE_URL}/api/users/internal`)
      .then((r) => r.ok ? r.json() : [])
      .then(setInternalUsers);
  }, []);

  const handleRequestHandoff = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/invoices/${invoiceId}/handoffs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast({ title: "Handoff requested", description: "A manager will review your request." });
      queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      setRequesting(false);
      setNotes("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectAssign = async () => {
    if (!directAssignee) return;
    setSaving(true);
    try {
      const assignee = internalUsers.find((u) => String(u.id) === directAssignee);
      const res = await fetch(`${BASE_URL}/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedToUserId: parseInt(directAssignee),
          assignedToName: assignee?.displayName ?? null,
        }),
      });
      if (!res.ok) throw new Error("Failed to reassign");
      toast({ title: "Reassigned", description: `Invoice assigned to ${assignee?.displayName}.` });
      queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(invoiceId) });
      setDirectAssignee("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-card-border rounded-lg p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
        Assignment
      </h2>
      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Currently Assigned To</p>
          <p className="mt-0.5 text-sm text-foreground">{assignedToName ?? "Unassigned"}</p>
        </div>

        {isManager ? (
          <div className="flex items-center gap-2 pt-1">
            <Select value={directAssignee} onValueChange={setDirectAssignee}>
              <SelectTrigger className="h-8 w-52 text-xs">
                <SelectValue placeholder="Reassign to..." />
              </SelectTrigger>
              <SelectContent>
                {internalUsers.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.displayName}
                    <span className="text-muted-foreground ml-1 text-xs">({u.role})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-8 px-3 text-xs"
              disabled={!directAssignee || saving}
              onClick={handleDirectAssign}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Assign"}
            </Button>
          </div>
        ) : (
          <div>
            {!requesting ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setRequesting(true)}
              >
                Request Handoff
              </Button>
            ) : (
              <div className="space-y-2">
                <Textarea
                  placeholder="Optional: reason for handoff request..."
                  className="text-xs h-16 resize-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 px-3 text-xs" onClick={handleRequestHandoff} disabled={submitting}>
                    {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Submit Request"}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-3 text-xs" onClick={() => { setRequesting(false); setNotes(""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface InvoiceAttachment {
  id: number;
  filename: string;
  contentType?: string | null;
  fileSize?: number | null;
  objectPath: string;
  uploadedBy?: string | null;
  uploadedAt: string;
}

function AttachmentsSection({ invoiceId }: { invoiceId: number }) {
  const [attachments, setAttachments] = useState<InvoiceAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dlLoading, setDlLoading] = useState<number | null>(null);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "") || "";

  useEffect(() => {
    fetch(`${BASE}/api/invoices/${invoiceId}/attachments`)
      .then(r => r.ok ? r.json() : [])
      .then(setAttachments)
      .catch(() => setAttachments([]))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  if (loading) return null;
  if (attachments.length === 0) return null;

  const handleView = async (att: InvoiceAttachment, idx: number) => {
    setDlLoading(idx);
    try {
      const res = await fetch(`${BASE}/api/storage/download-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath: att.objectPath }),
      });
      if (res.ok) {
        const { downloadUrl } = await res.json();
        window.open(downloadUrl, "_blank");
      }
    } finally {
      setDlLoading(null);
    }
  };

  return (
    <div className="bg-card border border-card-border rounded-lg p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        Vendor Attachments ({attachments.length})
      </h2>
      <ul className="space-y-2">
        {attachments.map((att, idx) => (
          <li key={att.id} className="flex items-center gap-3 bg-muted/40 border border-border rounded px-3 py-2">
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{att.filename}</p>
              <p className="text-xs text-muted-foreground">
                {att.uploadedBy ? `Uploaded by ${att.uploadedBy}` : "Vendor upload"}
                {att.fileSize ? ` · ${(att.fileSize / 1024).toFixed(1)} KB` : ""}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 h-7 px-2 text-xs gap-1"
              onClick={() => handleView(att, idx)}
              disabled={dlLoading === idx}
            >
              {dlLoading === idx ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ExternalLink className="h-3 w-3" />
              )}
              View
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATUSES = [
  "Awaiting Processing",
  "In Progress",
  "Receipted",
  "Processed in Accounting",
  "Approved in Accounting",
  "Payment Confirmed",
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
      toast({ title: "Saved", description: `ERP information updated.${statusMsg}` });
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

        {/* ERP Accounting Workflow */}
        <div className="bg-card border border-card-border rounded-lg p-5 mb-4" data-testid="fiscal-workflow">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">ERP Accounting Workflow</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Completing each stage automatically advances the invoice status.
            </p>
          </div>

          <div className="space-y-0 divide-y divide-border">
            {/* Stage 1: Receipt Reference */}
            {(() => {
              const stageNum = 1;
              const isComplete = !!invoice.erpReceiptRef;
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
                        <p className="text-sm font-medium text-foreground">Stage 1 — Receipt Reference</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Accountant records the ERP receipt reference after goods/services are confirmed. Advances status to{" "}
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
                            setStageFields({ erpReceiptRef: invoice.erpReceiptRef ?? "" });
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
                            ERP Receipt Reference
                          </label>
                          <Input
                            value={stageFields.erpReceiptRef ?? ""}
                            onChange={(e) => setStageFields((f) => ({ ...f, erpReceiptRef: e.target.value }))}
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
                      <p className="mt-1.5 text-sm font-mono text-foreground">{invoice.erpReceiptRef}</p>
                    ) : (
                      <p className="mt-1.5 text-xs text-muted-foreground italic">Not yet entered</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Stage 2: Voucher Reference */}
            {(() => {
              const stageNum = 2;
              const isComplete = !!invoice.erpVoucherRef;
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
                        <p className="text-sm font-medium text-foreground">Stage 2 — Voucher Reference</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Accountant records the ERP voucher or document number after verifying the invoice. Advances status to{" "}
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
                            setStageFields({ erpVoucherRef: invoice.erpVoucherRef ?? "" });
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
                            ERP Voucher / Document Number
                          </label>
                          <Input
                            value={stageFields.erpVoucherRef ?? ""}
                            onChange={(e) => setStageFields((f) => ({ ...f, erpVoucherRef: e.target.value }))}
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
                      <p className="mt-1.5 text-sm font-mono text-foreground">{invoice.erpVoucherRef}</p>
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

            {/* Stage 4: Payment Reference */}
            {(() => {
              const stageNum = 4;
              const isComplete = !!(invoice.erpPaymentRef && invoice.erpPaymentDate);
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
                        <p className="text-sm font-medium text-foreground">Stage 4 — Payment Reference</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Payment is confirmed by the ERP system. Record the payment reference and date to advance status to{" "}
                          <span className="font-medium">Payment Confirmed</span>.
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
                              erpPaymentRef: invoice.erpPaymentRef ?? "",
                              erpPaymentDate: invoice.erpPaymentDate ?? "",
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
                            Payment Reference
                          </label>
                          <Input
                            value={stageFields.erpPaymentRef ?? ""}
                            onChange={(e) => setStageFields((f) => ({ ...f, erpPaymentRef: e.target.value }))}
                            className="mt-1 text-sm"
                            placeholder="e.g. CHK-2024-00789 or EFT-00456"
                            data-testid="input-warrant-number"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Payment Date
                          </label>
                          <Input
                            type="date"
                            value={stageFields.erpPaymentDate ?? ""}
                            onChange={(e) => setStageFields((f) => ({ ...f, erpPaymentDate: e.target.value }))}
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
                          <dt className="text-xs text-muted-foreground">Payment Reference</dt>
                          <dd className="text-sm text-foreground font-mono">{invoice.erpPaymentRef}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Payment Date</dt>
                          <dd className="text-sm text-foreground">{invoice.erpPaymentDate}</dd>
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

        <HandoffSection invoiceId={invoice.id} assignedToName={(invoice as any).assignedToName} />

        <AttachmentsSection invoiceId={invoice.id} />

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
