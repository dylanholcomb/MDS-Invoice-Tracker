import { useState } from "react";
import { useListPurchaseOrders, getListPurchaseOrdersQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

export default function PurchaseOrdersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const { data: pos, isLoading } = useListPurchaseOrders(
    { search: search || undefined, limit: 100 },
    { query: { queryKey: getListPurchaseOrdersQueryKey({ search: search || undefined, limit: 100 }) } }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const formatCurrency = (n: number | null | undefined) =>
    n != null
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)
      : "—";

  return (
    <AppLayout>
      <div className="px-6 py-5">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-foreground">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Contract and PO reference data</p>
        </div>

        <div className="bg-card border border-card-border rounded-lg">
          <div className="flex items-center gap-3 p-3 border-b border-card-border">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by PO # or supplier..."
                  className="pl-8 h-9 text-sm w-72"
                  data-testid="input-search-pos"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm" data-testid="button-search-pos">
                Search
              </Button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="pos-table">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    PO Number
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Supplier
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Description
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Encumbered
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Remaining
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(6)].map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : !pos?.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No purchase orders found
                    </td>
                  </tr>
                ) : (
                  pos.map((po) => (
                    <tr
                      key={po.id}
                      className="border-b border-border/50 hover:bg-muted/20"
                      data-testid={`row-po-${po.id}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-medium">{po.poNumber}</td>
                      <td className="px-4 py-3 text-sm text-foreground/80">{po.supplierName ?? po.supplierID ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                        {po.lineItemDescription ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                            po.poStatus === "Closed"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {po.poStatus ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                        {formatCurrency(po.encumberedAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                        {formatCurrency(po.remainingEncumbrance)}
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
