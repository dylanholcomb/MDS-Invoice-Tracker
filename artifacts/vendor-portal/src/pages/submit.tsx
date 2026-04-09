import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Paperclip, X, Upload } from "lucide-react";

interface UploadedFile {
  filename: string;
  objectPath: string;
  size: number;
}

export default function SubmitPage() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({
    invoiceNumber: "",
    invoiceDate: "",
    invoiceAmount: "",
    contractNumber: "",
    poNumber: "",
    description: "",
  });
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    setUploadError("");
    setUploading(true);
    try {
      for (const file of selected) {
        const { uploadUrl, objectPath } = await api.getUploadUrl(file.name, file.type);
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!putRes.ok) throw new Error("Upload failed");
        setFiles((prev) => [...prev, { filename: file.name, objectPath, size: file.size }]);
      }
    } catch (err: any) {
      setUploadError(err.message || "File upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.invoiceNumber || !form.invoiceDate || !form.invoiceAmount) {
      setError("Invoice number, date, and amount are required.");
      return;
    }
    const amount = parseFloat(form.invoiceAmount.replace(/,/g, ""));
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid invoice amount.");
      return;
    }
    setSubmitting(true);
    try {
      const submission = await api.createSubmission({
        invoiceNumber: form.invoiceNumber,
        invoiceDate: form.invoiceDate,
        invoiceAmount: amount,
        contractNumber: form.contractNumber || undefined,
        poNumber: form.poNumber || undefined,
        description: form.description || undefined,
        attachmentPaths: files.map((f) => f.objectPath),
      });
      setLocation(`/confirmation/${submission.id}`);
    } catch (err: any) {
      setError(err.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Submit Invoice</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Complete the form below to submit an invoice for payment processing.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Invoice Details</CardTitle>
                <CardDescription className="text-sm">Required invoice information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="invoiceNumber" className="text-sm font-medium">
                      Invoice Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="invoiceNumber"
                      name="invoiceNumber"
                      value={form.invoiceNumber}
                      onChange={handleChange}
                      required
                      className="h-9"
                      placeholder="INV-0001"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="invoiceDate" className="text-sm font-medium">
                      Invoice Date <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="invoiceDate"
                      name="invoiceDate"
                      type="date"
                      value={form.invoiceDate}
                      onChange={handleChange}
                      required
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invoiceAmount" className="text-sm font-medium">
                    Invoice Amount (USD) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="invoiceAmount"
                    name="invoiceAmount"
                    value={form.invoiceAmount}
                    onChange={handleChange}
                    required
                    className="h-9"
                    placeholder="0.00"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Contract Information</CardTitle>
                <CardDescription className="text-sm">Optional — provide if applicable</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="contractNumber" className="text-sm font-medium">Contract Number</Label>
                    <Input
                      id="contractNumber"
                      name="contractNumber"
                      value={form.contractNumber}
                      onChange={handleChange}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="poNumber" className="text-sm font-medium">PO Number</Label>
                    <Input
                      id="poNumber"
                      name="poNumber"
                      value={form.poNumber}
                      onChange={handleChange}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-sm font-medium">Description / Notes</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={3}
                    className="resize-none text-sm"
                    placeholder="Brief description of services or goods invoiced..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Attachments</CardTitle>
                <CardDescription className="text-sm">Upload invoice PDF and supporting documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {uploadError && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-xs">{uploadError}</AlertDescription>
                  </Alert>
                )}
                <div
                  className="border-2 border-dashed border-border rounded-md p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs font-medium text-foreground">Click to upload</p>
                  <p className="text-xs text-muted-foreground">PDF, DOC, XLS, PNG, JPG</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                {uploading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading...
                  </div>
                )}
                {files.length > 0 && (
                  <ul className="space-y-1.5">
                    {files.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 bg-muted/50 rounded px-2.5 py-1.5">
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{f.filename}</p>
                          <p className="text-xs text-muted-foreground">{formatSize(f.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={submitting || uploading}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Invoice
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              A reference number will be provided upon submission.
            </p>
          </div>
        </div>
      </form>
    </Layout>
  );
}
