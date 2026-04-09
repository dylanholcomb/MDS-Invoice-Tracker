import { useState } from "react";
import { Link } from "wouter";
import {
  useListInvoices,
  getListInvoicesQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

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

const FISCAL_YEARS = ["2024-25", "2023-24", "2022-23", "2021-22"];

export default function InvoiceListPage() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<string>("");
  const [fiscalYear, setFiscalYear] = useState<string>("");
  const [page, setPage] = useState(1);

  const params = {
    search: search || undefined,
    status: status || undefined,
    fiscalYear: fiscalYear || undefined,
    page,
    limit: 25,
  };

  const { data, isLoading } = useListInvoices(params, {
    query: { queryKey: getListInvoicesQueryKey(params) },
  });

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(n);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatus(val === "all" ? "" : val);
    setPage(1);
  };

  const handleFiscalYearChange = (val: string) => {
    setFiscalYear(val === "all" ? "" : val);
    setPage(1);
  };

  return (
    <AppLayout>
      <div className="px-6 py-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-foreground">Invoices</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {data?.total !== undefined ? `${data.total} total records` : "Loading..."}
            </p>
          </div>
          <Link href="/invoices/new">
            <Button data-testid="button-new-invoice">
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </Link>
        </div>

        <div className="bg-card border border-card-border rounded-lg mb-4">
          <div className="flex items-center gap-3 p-3 border-b border-card-border flex-wrap">
            <form onSubmit={handleSearch} className="flex-1 min-w-0 flex items-center gap-2">
              <div className="relative flex-1 min-w-0 max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search invoice #, vendor..."
                  className="pl-8 h-9 text-sm"
                  data-testid="input-search-invoices"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm" data-testid="button-search">
                Search
              </Button>
            </form>

            <Select value={status || "all"} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-44 h-9 text-sm" data-testid="select-status-filter">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={fiscalYear || "all"} onValueChange={handleFiscalYearChange}>
              <SelectTrigger className="w-36 h-9 text-sm" data-testid="select-fiscal-year-filter">
                <SelectValue placeholder="Fiscal year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {FISCAL_YEARS.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(status || fiscalYear || search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatus("");
                  setFiscalYear("");
                  setSearch("");
                  setSearchInput("");
                  setPage(1);
                }}
                data-testid="button-clear-filters"
              >
                Clear filters
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="invoices-table">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
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
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    Fiscal Year
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Staff
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Unit
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Flags
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(8)].map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : !data?.invoices?.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                      No invoices found
                    </td>
                  </tr>
                ) : (
                  data.invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                      data-testid={`row-invoice-${inv.id}`}
                    >
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        <Link href={`/invoices/${inv.id}`}>
                          <a className="text-primary hover:underline" data-testid={`link-invoice-${inv.id}`}>
                            {inv.invoiceNumber}
                          </a>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <InvoiceStatusBadge status={inv.invoiceStatus} />
                      </td>
                      <td className="px-4 py-3 text-foreground/80 max-w-[200px] truncate">
                        {inv.vendorName ?? inv.vendorID ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                        {formatCurrency(inv.invoiceAmount)}
                      </td>
                      <td className="px-4 py-3 text-foreground/70 text-xs">
                        {inv.fiscalYear ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground/70 text-xs whitespace-nowrap">
                        {inv.staffName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground/70 text-xs">
                        {inv.unit ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {inv.expedite && (
                            <span
                              title="Expedite"
                              className="text-orange-500"
                              data-testid={`flag-expedite-${inv.id}`}
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {inv.cashHold && (
                            <span
                              className="inline-block px-1 py-0 rounded text-[10px] bg-purple-100 text-purple-700"
                              title="Cash Hold"
                              data-testid={`flag-cash-hold-${inv.id}`}
                            >
                              CH
                            </span>
                          )}
                          {inv.specialHandling && (
                            <span
                              className="inline-block px-1 py-0 rounded text-[10px] bg-pink-100 text-pink-700"
                              title="Special Handling"
                            >
                              SH
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Page {data.page} of {data.totalPages} ({data.total} records)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.totalPages}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
