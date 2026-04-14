import { Link } from "wouter";
import {
  useGetDashboardStats,
  useGetRecentActivity,
  getGetDashboardStatsQueryKey,
  getGetRecentActivityQueryKey,
} from "@workspace/api-client-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AppLayout } from "@/components/layout/app-layout";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { FileText, AlertTriangle, Clock, CheckCircle, ArrowLeftRight } from "lucide-react";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  testId,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof FileText;
  color: string;
  testId: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-lg p-4" data-testid={testId}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isManager = user?.role === "admin" || user?.role === "approver";
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() },
  });
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity(
    { limit: 15 },
    { query: { queryKey: getGetRecentActivityQueryKey({ limit: 15 }) } }
  );

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <AppLayout>
      <div className="px-6 py-5">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Invoice tracking overview</p>
        </div>

        {!statsLoading && (stats as any)?.staleCount > 0 && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3" data-testid="alert-stale-invoices">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{(stats as any).staleCount} invoice{(stats as any).staleCount !== 1 ? "s" : ""}</span> have not advanced status in {45}+ days.{" "}
              <Link href="/aging" className="underline font-medium">Review in Aging Report</Link>
            </p>
          </div>
        )}

        {isManager && !statsLoading && (stats as any)?.pendingHandoffs > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3" data-testid="alert-pending-handoffs">
            <ArrowLeftRight className="h-4 w-4 text-blue-600 shrink-0" />
            <p className="text-sm text-blue-800">
              <span className="font-semibold">{(stats as any).pendingHandoffs} handoff request{(stats as any).pendingHandoffs !== 1 ? "s" : ""}</span> pending your review.{" "}
              <Link href="/handoffs" className="underline font-medium">Review now</Link>
            </p>
          </div>
        )}

        {statsLoading ? (
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Total Invoices"
              value={stats?.totalInvoices ?? 0}
              sub={formatCurrency(stats?.totalAmount ?? 0) + " total"}
              icon={FileText}
              color="bg-blue-500/10 text-blue-600"
              testId="stat-total-invoices"
            />
            <StatCard
              label="Expedite"
              value={stats?.expediteCount ?? 0}
              sub="Priority processing"
              icon={AlertTriangle}
              color="bg-orange-500/10 text-orange-600"
              testId="stat-expedite"
            />
            <StatCard
              label="Returned"
              value={stats?.returnedCount ?? 0}
              sub="Need correction"
              icon={Clock}
              color="bg-red-500/10 text-red-600"
              testId="stat-returned"
            />
            <StatCard
              label="Duplicates"
              value={stats?.duplicateCount ?? 0}
              sub="Flagged entries"
              icon={CheckCircle}
              color="bg-gray-500/10 text-gray-600"
              testId="stat-duplicates"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-card border border-card-border rounded-lg p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Invoices by Status</h2>
            {statsLoading ? (
              <Skeleton className="h-48" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.byStatus ?? []} margin={{ top: 0, right: 0, left: -10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="status"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card border border-card-border rounded-lg p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">By Fiscal Year</h2>
            {statsLoading ? (
              <Skeleton className="h-48" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.byFiscalYear ?? []} margin={{ top: 0, right: 0, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="fiscalYear"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
            <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
            <Link href="/invoices">
              <a className="text-xs text-primary hover:underline" data-testid="link-view-all-invoices">
                View all invoices
              </a>
            </Link>
          </div>
          <div className="divide-y divide-border">
            {activityLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : !activity?.length ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No recent activity
              </div>
            ) : (
              activity.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                  data-testid={`activity-entry-${entry.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="min-w-0">
                      <Link href={`/invoices/${entry.invoiceId}`}>
                        <a className="text-sm font-medium text-primary hover:underline">
                          {entry.invoiceNumber}
                        </a>
                      </Link>
                      <p className="text-xs text-muted-foreground capitalize">
                        {entry.action.replace(/_/g, " ")}
                        {entry.statusTo ? ` → ${entry.statusTo}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    {entry.statusTo && (
                      <InvoiceStatusBadge status={entry.statusTo} />
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {new Date(entry.changedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
