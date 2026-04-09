import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Upload, Loader2, CheckCircle, AlertCircle, X, ArrowRight } from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

interface PreviewRow {
  invoiceNumber: string;
  invoiceId: number | null;
  currentStatus: string | null;
  newStatus: string | null;
  erpVoucherRef: string | null;
  erpPaymentRef: string | null;
  erpPaymentDate: string | null;
  approvalDate: string | null;
  approvalManager: string | null;
  erpReceiptRef: string | null;
  matched: boolean;
}

async function apiRequest(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {},
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

function StatusChange({ from, to }: { from: string | null; to: string | null }) {
  if (!from) return <span className="text-xs text-muted-foreground">—</span>;
  if (from === to) return <span className="text-xs text-muted-foreground">{from}</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className="text-muted-foreground">{from}</span>
      <ArrowRight className="h-3 w-3 text-muted-foreground" />
      <span className="font-medium text-green-700">{to}</span>
    </span>
  );
}

export default function FiscalImportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [previewing, setPreviewing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [previewData, setPreviewData] = useState<{ rows: PreviewRow[]; total: number } | null>(null);
  const [result, setResult] = useState<{ applied: number; errors: string[]; total: number } | null>(null);

  const matchedRows = previewData?.rows.filter((r) => r.matched) ?? [];
  const unmatchedRows = previewData?.rows.filter((r) => !r.matched) ?? [];
  const statusChangeRows = matchedRows.filter((r) => r.currentStatus !== r.newStatus);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setPreviewing(true);
    setPreviewData(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await apiRequest("POST", "/invoices/fiscal-import/preview", fd);
      setPreviewData(data);
    } catch (err: any) {
      toast({ title: "Preview failed", description: err.message, variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  };

  const handleExecute = async () => {
    if (!previewData) return;
    setExecuting(true);
    try {
      const res = await apiRequest("POST", "/invoices/fiscal-import/execute", {
        rows: previewData.rows,
        changedBy: user?.username ?? "admin",
      });
      setResult(res);
      setPreviewData(null);
      toast({
        title: "Import applied",
        description: `${res.applied} invoice${res.applied !== 1 ? "s" : ""} updated`,
      });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <AppLayout>
      <div className="px-6 py-5 max-w-5xl">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-foreground">ERP Data Import</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload an ERP flat-file export to automatically update payment, voucher, receipt, and approval data on matching invoices.
          </p>
        </div>

        <div className="bg-card border border-card-border rounded-lg p-5 mb-4">
          <h2 className="text-sm font-semibold text-foreground mb-2">Upload ERP Export File</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Accepts Excel (.xlsx, .xls) or CSV. Expected columns: <span className="font-mono">Invoice Number, ERP Voucher Ref, ERP Payment Ref, Payment Date, Approval Date, Approval Manager, ERP Receipt Ref</span> — also accepts Fi$Cal aliases (Voucher ID, Warrant Number, Warrant Date, Receipt ID) and SAP/NetSuite equivalents (Document Number, Check/EFT Reference).
          </p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={previewing || executing}
            data-testid="button-upload-fiscal"
          >
            {previewing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            {previewing ? "Reading file..." : "Choose File"}
          </Button>
        </div>

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">Import complete</p>
                <p className="text-xs text-green-700 mt-0.5">{result.applied} of {result.total} matched invoices updated</p>
                {result.errors.length > 0 && (
                  <ul className="mt-1 text-xs text-amber-700 space-y-0.5">
                    {result.errors.map((e, i) => <li key={i}>— {e}</li>)}
                  </ul>
                )}
              </div>
            </div>
            <button onClick={() => setResult(null)} className="text-green-600 hover:text-green-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {previewData && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-card border border-card-border rounded-lg px-4 py-3">
                <p className="text-xs text-muted-foreground">Total Rows</p>
                <p className="text-2xl font-bold text-foreground">{previewData.total}</p>
              </div>
              <div className="bg-card border border-card-border rounded-lg px-4 py-3">
                <p className="text-xs text-muted-foreground">Matched Invoices</p>
                <p className="text-2xl font-bold text-green-700">{matchedRows.length}</p>
              </div>
              <div className="bg-card border border-card-border rounded-lg px-4 py-3">
                <p className="text-xs text-muted-foreground">Status Changes</p>
                <p className="text-2xl font-bold text-blue-700">{statusChangeRows.length}</p>
              </div>
            </div>

            {unmatchedRows.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">
                  {unmatchedRows.length} row{unmatchedRows.length !== 1 ? "s" : ""} could not be matched to an invoice in the system:{" "}
                  {unmatchedRows.slice(0, 5).map((r) => r.invoiceNumber).join(", ")}
                  {unmatchedRows.length > 5 ? ` and ${unmatchedRows.length - 5} more` : ""}.
                  These will be skipped.
                </p>
              </div>
            )}

            <div className="bg-card border border-card-border rounded-lg mb-4">
              <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
                <h2 className="text-sm font-semibold text-foreground">Preview — Matched Invoices</h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPreviewData(null)}>Cancel</Button>
                  <Button
                    size="sm"
                    onClick={handleExecute}
                    disabled={executing || matchedRows.length === 0}
                    data-testid="button-execute-import"
                  >
                    {executing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Apply {matchedRows.length} Update{matchedRows.length !== 1 ? "s" : ""}
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["Invoice #", "Status", "Voucher Ref", "Receipt Ref", "Payment Ref", "Payment Date", "Approval Date", "Approval By"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matchedRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">No matching invoices found in this file</td>
                      </tr>
                    ) : (
                      matchedRows.map((row, i) => (
                        <tr key={i} className={`border-b border-border/50 ${row.currentStatus !== row.newStatus ? "bg-blue-50/40" : ""}`}>
                          <td className="px-3 py-2 font-mono text-xs font-medium">{row.invoiceNumber}</td>
                          <td className="px-3 py-2"><StatusChange from={row.currentStatus} to={row.newStatus} /></td>
                          <td className="px-3 py-2 font-mono text-xs">{row.erpVoucherRef || <span className="text-muted-foreground/40">—</span>}</td>
                          <td className="px-3 py-2 font-mono text-xs">{row.erpReceiptRef || <span className="text-muted-foreground/40">—</span>}</td>
                          <td className="px-3 py-2 font-mono text-xs">{row.erpPaymentRef || <span className="text-muted-foreground/40">—</span>}</td>
                          <td className="px-3 py-2 text-xs">{row.erpPaymentDate || <span className="text-muted-foreground/40">—</span>}</td>
                          <td className="px-3 py-2 text-xs">{row.approvalDate || <span className="text-muted-foreground/40">—</span>}</td>
                          <td className="px-3 py-2 text-xs">{row.approvalManager || <span className="text-muted-foreground/40">—</span>}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!previewData && !result && !previewing && (
          <div className="bg-card border border-card-border rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Upload an ERP export to get started</p>
            <p className="text-xs text-muted-foreground">
              The file will be previewed before any changes are applied. Only invoices with a matching invoice number in TRKR will be updated.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
