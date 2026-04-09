import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { api, type Submission } from "@/lib/api";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ChevronLeft, Paperclip, ExternalLink, Pencil, Lock, X, Check } from "lucide-react";

const EDITABLE_STATUS = "Awaiting Processing";

function statusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "Completed":
    case "SCO Warrant Issued":
      return "default";
    case "Returned to Submitter":
    case "Duplicate":
      return "destructive";
    case "Awaiting Processing":
      return "secondary";
    default:
      return "outline";
  }
}

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return s;
  }
}

function toInputDate(s: string) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toISOString().slice(0, 10);
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function FieldRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export default function SubmissionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadLoading, setDownloadLoading] = useState<number | null>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState({
    invoiceNumber: "",
    invoiceDate: "",
    invoiceAmount: "",
    contractNumber: "",
    description: "",
  });

  useEffect(() => {
    if (!id) return;
    api.getSubmission(id)
      .then((s) => {
        setSubmission(s);
        setForm({
          invoiceNumber: s.invoiceNumber,
          invoiceDate: toInputDate(s.invoiceDate),
          invoiceAmount: String(s.invoiceAmount),
          contractNumber: s.contractNumber ?? "",
          description: s.description ?? "",
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = async (attachment: Submission["attachments"][0], idx: number) => {
    if (!("objectPath" in attachment)) return;
    setDownloadLoading(idx);
    try {
      const { downloadUrl } = await api.getDownloadUrl((attachment as any).objectPath);
      window.open(downloadUrl, "_blank");
    } catch {
      alert("Could not retrieve download link.");
    } finally {
      setDownloadLoading(null);
    }
  };

  const handleSave = async () => {
    if (!submission) return;
    setSaveError("");
    setSaving(true);
    try {
      const updated = await api.updateSubmission(submission.id, {
        invoiceNumber: form.invoiceNumber.trim(),
        invoiceDate: form.invoiceDate,
        invoiceAmount: parseFloat(form.invoiceAmount),
        contractNumber: form.contractNumber.trim() || undefined,
        description: form.description.trim() || undefined,
      });
      setSubmission(updated);
      setEditing(false);
    } catch (err: any) {
      setSaveError(err.message ?? "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (!submission) return;
    setForm({
      invoiceNumber: submission.invoiceNumber,
      invoiceDate: toInputDate(submission.invoiceDate),
      invoiceAmount: String(submission.invoiceAmount),
      contractNumber: submission.contractNumber ?? "",
      description: submission.description ?? "",
    });
    setSaveError("");
    setEditing(false);
  };

  const canEdit = submission?.status === EDITABLE_STATUS;

  return (
    <Layout>
      <div className="mb-4">
        <Link href="/">
          <a className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Back to Submissions
          </a>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : submission ? (
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground">{submission.invoiceNumber}</h1>
              {submission.submissionReference && (
                <p className="text-xs font-mono text-muted-foreground mt-0.5">{submission.submissionReference}</p>
              )}
            </div>
            <Badge variant={statusBadgeVariant(submission.status)} className="mt-0.5">
              {submission.status}
            </Badge>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Invoice Details</CardTitle>
                {canEdit && !editing && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1.5"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                )}
                {!canEdit && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    Locked
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="invoiceNumber" className="text-xs">Invoice Number <span className="text-destructive">*</span></Label>
                      <Input
                        id="invoiceNumber"
                        value={form.invoiceNumber}
                        onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="invoiceDate" className="text-xs">Invoice Date <span className="text-destructive">*</span></Label>
                      <Input
                        id="invoiceDate"
                        type="date"
                        value={form.invoiceDate}
                        onChange={(e) => setForm((f) => ({ ...f, invoiceDate: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="invoiceAmount" className="text-xs">Invoice Amount (USD) <span className="text-destructive">*</span></Label>
                      <Input
                        id="invoiceAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.invoiceAmount}
                        onChange={(e) => setForm((f) => ({ ...f, invoiceAmount: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contractNumber" className="text-xs">Contract Number</Label>
                      <Input
                        id="contractNumber"
                        value={form.contractNumber}
                        onChange={(e) => setForm((f) => ({ ...f, contractNumber: e.target.value }))}
                        className="h-8 text-sm"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="text-xs">Description / Notes</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      className="text-sm resize-none"
                      rows={3}
                      placeholder="Optional"
                    />
                  </div>
                  {saveError && (
                    <p className="text-xs text-destructive">{saveError}</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs gap-1.5"
                      onClick={handleSave}
                      disabled={saving || !form.invoiceNumber.trim() || !form.invoiceDate || !form.invoiceAmount}
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs gap-1.5"
                      onClick={handleCancelEdit}
                      disabled={saving}
                    >
                      <X className="h-3 w-3" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                    <FieldRow label="Invoice Number" value={submission.invoiceNumber} />
                    <FieldRow label="Invoice Date" value={formatDate(submission.invoiceDate)} />
                    <FieldRow label="Invoice Amount" value={formatCurrency(submission.invoiceAmount)} />
                    <FieldRow label="Status" value={submission.status} />
                    <FieldRow label="Contract Number" value={submission.contractNumber} />
                    <FieldRow label="PO Number" value={submission.poNumber} />
                    <FieldRow label="Submitted On" value={formatDate(submission.createdAt)} />
                    {submission.submissionReference && (
                      <FieldRow label="Reference Number" value={submission.submissionReference} />
                    )}
                  </div>
                  {submission.description && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{submission.description}</p>
                    </div>
                  )}
                  {!canEdit && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        This submission is locked for editing. Your invoice has been received and is being processed.
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {submission.attachments.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {submission.attachments.map((att, idx) => (
                    <li key={att.id} className="flex items-center gap-3 bg-muted/40 rounded px-3 py-2">
                      <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{att.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {att.contentType ?? "Unknown type"}
                          {att.fileSize ? ` · ${(att.fileSize / 1024).toFixed(1)} KB` : ""}
                        </p>
                      </div>
                      {(att as any).objectPath && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 h-7 px-2 text-xs gap-1"
                          onClick={() => handleDownload(att, idx)}
                          disabled={downloadLoading === idx}
                        >
                          {downloadLoading === idx ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ExternalLink className="h-3 w-3" />
                          )}
                          View
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card className="bg-muted/30">
            <CardContent className="py-4 px-4">
              <p className="text-xs text-muted-foreground">
                Invoice processing is handled by Mosaic Data Solutions accounting staff. For questions about your submission, 
                reference number <span className="font-mono font-medium">{submission.submissionReference ?? "N/A"}</span> in 
                all correspondence with your contract administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </Layout>
  );
}
