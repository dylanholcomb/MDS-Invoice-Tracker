import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { api, type Submission } from "@/lib/api";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, ClipboardList, PlusCircle } from "lucide-react";

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return s;
  }
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function ConfirmationPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api.getSubmission(id)
      .then(setSubmission)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : submission ? (
          <div className="space-y-6">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h1 className="text-xl font-semibold text-green-900 mb-1">Invoice Submitted</h1>
                <p className="text-sm text-green-700 mb-4">
                  Your invoice has been received and is pending review.
                </p>
                {submission.submissionReference && (
                  <div className="bg-white border border-green-200 rounded-md py-3 px-6 inline-block">
                    <p className="text-xs text-muted-foreground mb-0.5 uppercase tracking-wider">Reference Number</p>
                    <p className="text-lg font-mono font-bold text-foreground tracking-wider">
                      {submission.submissionReference}
                    </p>
                  </div>
                )}
                <p className="text-xs text-green-700/70 mt-4">
                  Save this reference number for your records. You can track your submission status in the portal.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-5 px-5 space-y-3">
                <h2 className="text-sm font-semibold text-foreground mb-3">Submission Summary</h2>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Invoice Number</p>
                    <p className="font-medium">{submission.invoiceNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Invoice Date</p>
                    <p className="font-medium">{formatDate(submission.invoiceDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="font-medium">{formatCurrency(submission.invoiceAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="font-medium">{submission.status}</p>
                  </div>
                  {submission.contractNumber && (
                    <div>
                      <p className="text-xs text-muted-foreground">Contract</p>
                      <p className="font-medium">{submission.contractNumber}</p>
                    </div>
                  )}
                  {submission.poNumber && (
                    <div>
                      <p className="text-xs text-muted-foreground">PO Number</p>
                      <p className="font-medium">{submission.poNumber}</p>
                    </div>
                  )}
                  {submission.attachments.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Attachments</p>
                      <p className="font-medium">{submission.attachments.length} file(s) uploaded</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Link href="/">
                <Button variant="outline" className="flex-1 gap-2">
                  <ClipboardList className="h-4 w-4" />
                  My Submissions
                </Button>
              </Link>
              <Link href="/submit">
                <Button className="flex-1 gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Submit Another
                </Button>
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
