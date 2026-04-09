import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Upload, Pencil, Trash2, Loader2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

interface Speedchart {
  id: number;
  speedchart: string;
  description: string | null;
  sequence: string | null;
  appropRef: string | null;
  fund: string | null;
  eny: string | null;
  program: string | null;
  pcBusinessUnit: string | null;
  projectID: string | null;
  activityID: string | null;
  svcLoc: string | null;
  updatedAt: string;
}

interface SpeedchartForm {
  speedchart: string;
  description: string;
  sequence: string;
  appropRef: string;
  fund: string;
  eny: string;
  program: string;
  pcBusinessUnit: string;
  projectID: string;
  activityID: string;
  svcLoc: string;
}

const EMPTY_FORM: SpeedchartForm = {
  speedchart: "", description: "", sequence: "", appropRef: "",
  fund: "", eny: "", program: "", pcBusinessUnit: "", projectID: "", activityID: "", svcLoc: "",
};

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

function FormField({ label, name, value, onChange, span }: {
  label: string; name: keyof SpeedchartForm; value: string;
  onChange: (name: keyof SpeedchartForm, val: string) => void; span?: boolean;
}) {
  return (
    <div className={span ? "col-span-2" : ""}>
      <Label className="text-xs mb-1 block">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="h-8 text-sm"
        placeholder={label}
      />
    </div>
  );
}

export default function SpeedchartsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Speedchart | null>(null);
  const [form, setForm] = useState<SpeedchartForm>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<Speedchart | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; updated: number; errors: string[] } | null>(null);

  const { data: speedcharts, isLoading } = useQuery<Speedchart[]>({
    queryKey: ["speedcharts", search],
    queryFn: () => apiRequest("GET", `/speedcharts${search ? `?search=${encodeURIComponent(search)}&limit=500` : "?limit=500"}`),
  });

  const saveMutation = useMutation({
    mutationFn: (data: SpeedchartForm) =>
      editing
        ? apiRequest("PUT", `/speedcharts/${editing.id}`, data)
        : apiRequest("POST", "/speedcharts", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["speedcharts"] });
      toast({ title: editing ? "Speedchart updated" : "Speedchart created" });
      setDialogOpen(false);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/speedcharts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["speedcharts"] });
      toast({ title: "Speedchart deleted" });
      setDeleteConfirm(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (sc: Speedchart) => {
    setEditing(sc);
    setForm({
      speedchart: sc.speedchart,
      description: sc.description ?? "",
      sequence: sc.sequence ?? "",
      appropRef: sc.appropRef ?? "",
      fund: sc.fund ?? "",
      eny: sc.eny ?? "",
      program: sc.program ?? "",
      pcBusinessUnit: sc.pcBusinessUnit ?? "",
      projectID: sc.projectID ?? "",
      activityID: sc.activityID ?? "",
      svcLoc: sc.svcLoc ?? "",
    });
    setDialogOpen(true);
  };

  const handleFormChange = (name: keyof SpeedchartForm, val: string) => setForm((f) => ({ ...f, [name]: val }));

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await apiRequest("POST", "/speedcharts/import", fd);
      setImportResult(result);
      qc.invalidateQueries({ queryKey: ["speedcharts"] });
      toast({
        title: "Import complete",
        description: `${result.inserted} inserted, ${result.updated} updated${result.errors.length ? `, ${result.errors.length} skipped` : ""}`,
      });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const COLS: Array<{ key: keyof Speedchart; label: string; mono?: boolean }> = [
    { key: "speedchart", label: "Code", mono: true },
    { key: "description", label: "Description" },
    { key: "fund", label: "Fund" },
    { key: "program", label: "Program" },
    { key: "pcBusinessUnit", label: "PC Bus. Unit" },
    { key: "projectID", label: "Project ID", mono: true },
    { key: "activityID", label: "Activity ID", mono: true },
    { key: "appropRef", label: "Approp. Ref" },
    { key: "eny", label: "ENY" },
    { key: "svcLoc", label: "Svc Loc" },
  ];

  return (
    <AppLayout>
      <div className="px-6 py-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-foreground">Speedcharts</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Fund / program coding reference — links invoices to appropriation data</p>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              data-testid="button-import-speedcharts"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Upload className="h-4 w-4 mr-1.5" />}
              Import Excel / CSV
            </Button>
            <Button size="sm" onClick={openAdd} data-testid="button-add-speedchart">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Speedchart
            </Button>
          </div>
        </div>

        {importResult && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md px-4 py-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-green-800">Import complete</p>
              <p className="text-xs text-green-700 mt-0.5">
                {importResult.inserted} records inserted · {importResult.updated} records updated
                {importResult.errors.length > 0 && ` · ${importResult.errors.length} rows skipped`}
              </p>
              {importResult.errors.length > 0 && (
                <ul className="mt-1 text-xs text-amber-700 space-y-0.5">
                  {importResult.errors.slice(0, 5).map((e, i) => <li key={i}>— {e}</li>)}
                  {importResult.errors.length > 5 && <li>... and {importResult.errors.length - 5} more</li>}
                </ul>
              )}
            </div>
            <button onClick={() => setImportResult(null)} className="text-green-600 hover:text-green-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="bg-card border border-card-border rounded-lg">
          <div className="flex items-center gap-3 p-3 border-b border-card-border">
            <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }} className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search code, description, fund, program..."
                  className="pl-8 h-9 text-sm w-72"
                  data-testid="input-search-speedcharts"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm">Search</Button>
              {search && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setSearch(""); setSearchInput(""); }}>
                  Clear
                </Button>
              )}
            </form>
            <span className="ml-auto text-xs text-muted-foreground">
              {speedcharts?.length ?? 0} speedchart{speedcharts?.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="speedcharts-table">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {COLS.map((c) => (
                    <th key={c.key} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(COLS.length + 1)].map((__, j) => (
                        <td key={j} className="px-3 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : !speedcharts?.length ? (
                  <tr>
                    <td colSpan={COLS.length + 1} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {search ? "No speedcharts match your search" : "No speedcharts yet — add one manually or import from Excel"}
                    </td>
                  </tr>
                ) : (
                  speedcharts.map((sc) => (
                    <tr key={sc.id} className="border-b border-border/50 hover:bg-muted/20" data-testid={`row-speedchart-${sc.id}`}>
                      {COLS.map((c) => (
                        <td key={c.key} className={`px-3 py-2.5 ${c.mono ? "font-mono text-xs" : "text-sm"} text-foreground max-w-[150px] truncate`}>
                          {(sc[c.key] as string) || <span className="text-muted-foreground/40">—</span>}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(sc)} data-testid={`button-edit-${sc.id}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(sc)} data-testid={`button-delete-${sc.id}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Speedchart" : "Add Speedchart"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <FormField label="SpeedChart Code *" name="speedchart" value={form.speedchart} onChange={handleFormChange} />
            <FormField label="Description" name="description" value={form.description} onChange={handleFormChange} />
            <FormField label="Sequence" name="sequence" value={form.sequence} onChange={handleFormChange} />
            <FormField label="Approp. Ref" name="appropRef" value={form.appropRef} onChange={handleFormChange} />
            <FormField label="Fund" name="fund" value={form.fund} onChange={handleFormChange} />
            <FormField label="ENY" name="eny" value={form.eny} onChange={handleFormChange} />
            <FormField label="Program" name="program" value={form.program} onChange={handleFormChange} />
            <FormField label="PC Business Unit" name="pcBusinessUnit" value={form.pcBusinessUnit} onChange={handleFormChange} />
            <FormField label="Project ID" name="projectID" value={form.projectID} onChange={handleFormChange} />
            <FormField label="Activity ID" name="activityID" value={form.activityID} onChange={handleFormChange} />
            <FormField label="Service Location" name="svcLoc" value={form.svcLoc} onChange={handleFormChange} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.speedchart.trim()}
              data-testid="button-save-speedchart"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? "Save Changes" : "Create Speedchart"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Speedchart</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Delete speedchart <span className="font-mono font-medium">{deleteConfirm?.speedchart}</span>?
            This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-speedchart"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
