import { Link } from "wouter";
import {
  useGetAgingReport,
  getGetAgingReportQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";

function AgingBadge({ days }: { days: number | null | undefined }) {
  if (days == null) return <span className="text-muted-foreground text-xs">—</span>;
  const cls =
    days >= 30
      ? "text-red-600 font-semibold"
      : days >= 15
        ? "text-orange-600 font-medium"
        : "text-foreground";
  return <span className={`text-xs tabular-nums ${cls}`}>{days}d</span>;
}

export default function AgingPage() {
  const { data: aging, isLoading } = useGetAgingReport({
    query: { queryKey: getGetAgingReportQueryKey() },
  });

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const sorted = aging
    ? [...aging].sort((a, b) => (b.daysSinceModified ?? 0) - (a.daysSinceModified ?? 0))
    : [];

  return (
    <AppLayout>
      <div className="px-6 py-5">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-foreground">Aging Report</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Active invoices sorted by days outstanding. Red = 30+ days, Orange = 15+ days.
          </p>
        </div>

        <div className="bg-card border border-card-border rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="aging-table">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Invoice #
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Vendor
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Staff
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Unit
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    Days Active
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    Since CDO
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    Since Acct.
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(9)].map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : !sorted.length ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-sm text-muted-foreground"
                    >
                      No active invoices
                    </td>
                  </tr>
                ) : (
                  sorted.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                      data-testid={`aging-row-${inv.id}`}
                    >
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {inv.expedite && (
                            <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                          )}
                          <Link href={`/invoices/${inv.id}`}>
                            <a className="text-primary hover:underline">{inv.invoiceNumber}</a>
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <InvoiceStatusBadge status={inv.invoiceStatus} />
                      </td>
                      <td className="px-4 py-3 text-foreground/80 max-w-[160px] truncate text-xs">
                        {inv.vendorName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                        {formatCurrency(inv.invoiceAmount)}
                      </td>
                      <td className="px-4 py-3 text-foreground/70 text-xs whitespace-nowrap">
                        {inv.staffName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground/70 text-xs">
                        {inv.unit ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <AgingBadge days={inv.daysSinceModified} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <AgingBadge days={inv.daysSinceCdoReceived} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <AgingBadge days={inv.daysSinceAccountingReceived} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
