import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  "Awaiting Processing": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
  Receipted: "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Processed in Accounting": "bg-violet-100 text-violet-800 border-violet-200",
  "Approved in Accounting": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Payment Confirmed": "bg-teal-100 text-teal-800 border-teal-200",
  "Returned to Submitter": "bg-orange-100 text-orange-800 border-orange-200",
  Duplicate: "bg-red-100 text-red-800 border-red-200",
  Completed: "bg-green-100 text-green-800 border-green-200",
};

interface InvoiceStatusBadgeProps {
  status: string;
  className?: string;
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-800 border-gray-200";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
        style,
        className
      )}
      data-testid={`status-badge-${status.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {status}
    </span>
  );
}
