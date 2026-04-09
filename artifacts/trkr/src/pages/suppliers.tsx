import { useState } from "react";
import { useListSuppliers, getListSuppliersQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded border px-1.5 py-0 text-[10px] font-medium bg-blue-100 text-blue-700 border-blue-200">
      {label}
    </span>
  );
}

export default function SuppliersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const { data: suppliers, isLoading } = useListSuppliers(
    { search: search || undefined, limit: 100 },
    { query: { queryKey: getListSuppliersQueryKey({ search: search || undefined, limit: 100 }) } }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  return (
    <AppLayout>
      <div className="px-6 py-5">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-foreground">Suppliers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Vendor reference data</p>
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
                  placeholder="Search by name or ID..."
                  className="pl-8 h-9 text-sm w-64"
                  data-testid="input-search-suppliers"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm" data-testid="button-search-suppliers">
                Search
              </Button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="suppliers-table">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Supplier ID
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    FI$Cal ID
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Certifications
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(4)].map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : !suppliers?.length ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No suppliers found
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-border/50 hover:bg-muted/20"
                      data-testid={`row-supplier-${s.id}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{s.supplierID}</td>
                      <td className="px-4 py-3 font-medium">{s.supplierName}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{s.fiCalID ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {s.sb && <Badge label="SB" />}
                          {s.mb && <Badge label="MB" />}
                          {s.dvbe && <Badge label="DVBE" />}
                        </div>
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
