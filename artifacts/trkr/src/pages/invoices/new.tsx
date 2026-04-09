import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateInvoice,
  useListStaff,
  getListInvoicesQueryKey,
  getListStaffQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const INVOICE_TYPES = ["Standard", "Revolving Fund", "Advance Payment", "Local Health", "SNAP/NURSE", "CalVax Grant", "Schools Grant"];
const FISCAL_YEARS = ["2024-25", "2023-24", "2022-23"];
const PROCESSING_TYPES = ["Standard", "Expedited", "Rush"];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Speedchart {
  id: number;
  speedchart: string;
  description: string | null;
  fund: string | null;
  program: string | null;
  pcBusinessUnit: string | null;
  projectID: string | null;
  activityID: string | null;
}

const schema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceAmount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  invoiceDate: z.string().optional(),
  invoiceType: z.string().optional(),
  fiscalYear: z.string().optional(),
  vendorID: z.string().optional(),
  vendorName: z.string().optional(),
  contractPONumber: z.string().optional(),
  fiscalPONumber: z.string().optional(),
  reportingStructure: z.string().optional(),
  submissionNotes: z.string().optional(),
  programReceivedDate: z.string().optional(),
  accountingReceivedDate: z.string().optional(),
  processingType: z.string().optional(),
  submitterName: z.string().optional(),
  submitterEmail: z.string().email().optional().or(z.literal("")),
  speedchartCode: z.string().optional(),
  expedite: z.boolean().default(false),
  cashHold: z.boolean().default(false),
  localHealth: z.boolean().default(false),
  specialHandling: z.boolean().default(false),
  dvbeSbCmia: z.boolean().default(false),
  revolvingFund: z.boolean().default(false),
  snapNurse: z.boolean().default(false),
  calVaxGrant: z.boolean().default(false),
  schoolsGrant: z.boolean().default(false),
  airQualityCmp: z.boolean().default(false),
  advancePayment: z.boolean().default(false),
  drill2: z.boolean().default(false),
});

type FormData = z.infer<typeof schema>;

const FLAG_FIELDS: Array<{ name: keyof FormData; label: string }> = [
  { name: "expedite", label: "Expedite" },
  { name: "cashHold", label: "Cash Hold" },
  { name: "localHealth", label: "Local Health" },
  { name: "specialHandling", label: "Special Handling" },
  { name: "dvbeSbCmia", label: "DVBE/SB/CMIA" },
  { name: "revolvingFund", label: "Revolving Fund" },
  { name: "snapNurse", label: "SNAP/NURSE" },
  { name: "calVaxGrant", label: "CalVax Grant" },
  { name: "schoolsGrant", label: "Schools Grant" },
  { name: "airQualityCmp", label: "Air Quality CMP" },
  { name: "advancePayment", label: "Advance Payment" },
  { name: "drill2", label: "Drill 2" },
];

export default function NewInvoicePage() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createInvoice = useCreateInvoice();

  const { data: staffList } = useListStaff({
    query: { queryKey: getListStaffQueryKey() },
  });

  const [scSearch, setScSearch] = useState("");
  const [scOptions, setScOptions] = useState<Speedchart[]>([]);
  const [scSelected, setScSelected] = useState<Speedchart | null>(null);
  const [scOpen, setScOpen] = useState(false);
  const scRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scSearch.trim()) { setScOptions([]); return; }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`${BASE}/api/speedcharts?search=${encodeURIComponent(scSearch)}&limit=15`);
        if (res.ok) setScOptions(await res.json());
      } catch { /* ignore */ }
    }, 200);
    return () => clearTimeout(timeout);
  }, [scSearch]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (scRef.current && !scRef.current.contains(e.target as Node)) setScOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      invoiceNumber: "",
      invoiceAmount: 0,
      expedite: false,
      cashHold: false,
      localHealth: false,
      specialHandling: false,
      dvbeSbCmia: false,
      revolvingFund: false,
      snapNurse: false,
      calVaxGrant: false,
      schoolsGrant: false,
      airQualityCmp: false,
      advancePayment: false,
      drill2: false,
    },
  });

  const onSubmit = async (values: FormData) => {
    try {
      const invoice = await createInvoice.mutateAsync({ data: values as Parameters<typeof createInvoice.mutateAsync>[0]["data"] });
      await queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      toast({ title: "Invoice submitted", description: `Invoice ${invoice.invoiceNumber} has been created.` });
      setLocation(`/invoices/${invoice.id}`);
    } catch (err: unknown) {
      const apiErr = err as { status?: number; data?: { isDuplicate?: boolean; existingInvoiceNumber?: string } };
      if (apiErr?.status === 409) {
        toast({
          title: "Duplicate invoice",
          description: `Invoice ${apiErr.data?.existingInvoiceNumber ?? ""} already exists with the same number, vendor, and fiscal year.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: "Failed to create invoice.", variant: "destructive" });
      }
    }
  };

  const reportingOptions = staffList
    ? [...new Set(staffList.map((s) => s.reportingStructure))]
    : [];

  return (
    <AppLayout>
      <div className="px-6 py-5 max-w-4xl">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/invoices">
            <a className="text-muted-foreground hover:text-foreground" data-testid="link-back-invoices">
              <ArrowLeft className="h-4 w-4" />
            </a>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Submit Invoice</h1>
            <p className="text-sm text-muted-foreground">Create a new invoice record</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="bg-card border border-card-border rounded-lg p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Invoice Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-invoice-number" placeholder="INV-2024-XXXX" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="invoiceAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" min="0" data-testid="input-invoice-amount" placeholder="0.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="invoiceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-invoice-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="invoiceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-invoice-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INVOICE_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fiscalYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fiscal Year</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-fiscal-year">
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FISCAL_YEARS.map((y) => (
                            <SelectItem key={y} value={y}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="processingType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Processing Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-processing-type">
                            <SelectValue placeholder="Select processing" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROCESSING_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="bg-card border border-card-border rounded-lg p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Vendor Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vendorID"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor ID</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-vendor-id" placeholder="V0001234" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vendorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-vendor-name" placeholder="Vendor name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contractPONumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract/PO Number</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-contract-po" placeholder="PO-2024-XXX" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fiscalPONumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fiscal PO Number</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-fiscal-po" placeholder="Fiscal PO" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="bg-card border border-card-border rounded-lg p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Fund Coding (Speedchart)</h2>
              <FormField
                control={form.control}
                name="speedchartCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Speedchart Code</FormLabel>
                    <div ref={scRef} className="relative">
                      <FormControl>
                        <Input
                          value={scSelected ? scSelected.speedchart : scSearch}
                          onChange={(e) => {
                            setScSelected(null);
                            field.onChange("");
                            setScSearch(e.target.value);
                            setScOpen(true);
                          }}
                          onFocus={() => { if (scOptions.length) setScOpen(true); }}
                          placeholder="Type to search speedchart..."
                          data-testid="input-speedchart-code"
                          className="font-mono"
                        />
                      </FormControl>
                      {scOpen && scOptions.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
                          {scOptions.map((sc) => (
                            <button
                              key={sc.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                              onClick={() => {
                                setScSelected(sc);
                                field.onChange(sc.speedchart);
                                setScSearch("");
                                setScOpen(false);
                              }}
                            >
                              <span className="font-mono font-medium">{sc.speedchart}</span>
                              {sc.description && <span className="text-muted-foreground ml-2 text-xs">{sc.description}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {scSelected && (
                      <div className="mt-2 grid grid-cols-3 gap-x-4 gap-y-1 bg-muted/30 rounded px-3 py-2">
                        {[
                          ["Fund", scSelected.fund],
                          ["Program", scSelected.program],
                          ["PC Bus. Unit", scSelected.pcBusinessUnit],
                          ["Project ID", scSelected.projectID],
                          ["Activity ID", scSelected.activityID],
                        ].filter(([, v]) => v).map(([label, value]) => (
                          <div key={label as string}>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                            <p className="text-xs font-mono font-medium">{value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-card border border-card-border rounded-lg p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Routing Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="reportingStructure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reporting Structure</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-reporting-structure">
                            <SelectValue placeholder="Select structure" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {reportingOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="programReceivedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program Received Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-program-received-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accountingReceivedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accounting Received Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-accounting-received-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="submitterName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Submitter Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-submitter-name" placeholder="Full name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="submitterEmail"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Submitter Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" data-testid="input-submitter-email" placeholder="email@dept.ca.gov" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="bg-card border border-card-border rounded-lg p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Special Handling Flags</h2>
              <div className="grid grid-cols-3 gap-3">
                {FLAG_FIELDS.map(({ name, label }) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={Boolean(field.value)}
                            onCheckedChange={field.onChange}
                            data-testid={`checkbox-${name}`}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal cursor-pointer">{label}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="bg-card border border-card-border rounded-lg p-5">
              <FormField
                control={form.control}
                name="submissionNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Submission Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        data-testid="textarea-submission-notes"
                        placeholder="Additional notes for this invoice..."
                        className="resize-none"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Link href="/invoices">
                <Button type="button" variant="outline" data-testid="button-cancel-new-invoice">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={createInvoice.isPending}
                data-testid="button-submit-invoice"
              >
                {createInvoice.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Invoice"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}
