import { useState, useEffect } from "react";
import { Link } from "wouter";
import { api, type Submission } from "@/lib/api";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, FileText, ChevronRight, Paperclip } from "lucide-react";

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
    return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return s;
  }
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listSubmissions()
      .then(setSubmissions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">My Submissions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track all invoices you have submitted for payment.</p>
        </div>
        <Link href="/submit">
          <Button size="sm" className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Submit Invoice
          </Button>
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
      ) : submissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No submissions yet</p>
            <p className="text-sm text-muted-foreground mt-1">Submit your first invoice to get started.</p>
            <Link href="/submit">
              <Button size="sm" className="mt-4 gap-2">
                <PlusCircle className="h-4 w-4" />
                Submit Invoice
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {submissions.map((s) => (
            <Link key={s.id} href={`/submissions/${s.id}`}>
              <a className="block">
                <Card className="border-border hover:border-primary/40 transition-colors cursor-pointer">
                  <CardContent className="py-3.5 px-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1">
                          <span className="font-medium text-sm text-foreground truncate">
                            {s.invoiceNumber}
                          </span>
                          <Badge variant={statusBadgeVariant(s.status)} className="text-xs shrink-0">
                            {s.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Date: {formatDate(s.invoiceDate)}</span>
                          <span>Amount: {formatCurrency(s.invoiceAmount)}</span>
                          {s.submissionReference && (
                            <span className="font-mono">{s.submissionReference}</span>
                          )}
                          {s.attachments.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Paperclip className="h-3 w-3" />
                              {s.attachments.length}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </a>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
