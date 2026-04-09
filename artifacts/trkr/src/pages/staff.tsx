import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListStaff,
  useCreateStaff,
  useDeleteStaff,
  getListStaffQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2 } from "lucide-react";

const schema = z.object({
  reportingStructure: z.string().min(1, "Required"),
  accountant: z.string().min(1, "Required"),
  invoiceType: z.string().optional(),
  supervisor: z.string().optional(),
  unit: z.string().optional(),
  branch: z.string().optional(),
  section: z.string().optional(),
  group: z.string().optional(),
  divisionCenter: z.string().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function StaffPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: staff, isLoading } = useListStaff({
    query: { queryKey: getListStaffQueryKey() },
  });

  const createStaff = useCreateStaff();
  const deleteStaff = useDeleteStaff();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      reportingStructure: "",
      accountant: "",
    },
  });

  const onSubmit = async (values: FormData) => {
    try {
      await createStaff.mutateAsync({ data: values });
      await queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
      toast({ title: "Created", description: "Staff routing rule added" });
      form.reset();
      setShowForm(false);
    } catch {
      toast({ title: "Error", description: "Failed to create entry", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteStaff.mutateAsync({ id });
      await queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
      toast({ title: "Deleted", description: "Staff entry removed" });
    } catch {
      toast({ title: "Error", description: "Failed to delete entry", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="px-6 py-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-foreground">Staff Routing</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure automatic invoice routing rules
            </p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            data-testid="button-add-staff-rule"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>

        {showForm && (
          <div className="bg-card border border-card-border rounded-lg p-5 mb-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">New Routing Rule</h2>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="reportingStructure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reporting Structure *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-reporting-structure" placeholder="e.g. CDO-A" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="accountant"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Accountant *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-accountant" placeholder="Full name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="supervisor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supervisor</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-supervisor" placeholder="Supervisor name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-unit" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="branch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-branch" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={createStaff.isPending}
                    data-testid="button-save-staff-rule"
                  >
                    {createStaff.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Save Rule
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowForm(false); form.reset(); }}
                    data-testid="button-cancel-staff-rule"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        <div className="bg-card border border-card-border rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="staff-table">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Reporting Structure
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Accountant
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Supervisor
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Unit
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Branch
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Description
                  </th>
                  <th className="px-4 py-2.5 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(7)].map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : !staff?.length ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No routing rules configured
                    </td>
                  </tr>
                ) : (
                  staff.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-border/50 hover:bg-muted/20"
                      data-testid={`row-staff-${s.id}`}
                    >
                      <td className="px-4 py-3 font-medium text-xs font-mono">{s.reportingStructure}</td>
                      <td className="px-4 py-3 text-sm">{s.accountant}</td>
                      <td className="px-4 py-3 text-sm text-foreground/70">{s.supervisor ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{s.unit ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{s.branch ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{s.description ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId === s.id}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          data-testid={`button-delete-staff-${s.id}`}
                        >
                          {deletingId === s.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
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
