import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle, Clock, ArrowRight } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "") || "";

interface Handoff {
  id: number;
  invoiceId: number;
  invoiceNumber: string;
  requestedByName: string;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  newAssigneeName: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface InternalUser {
  id: number;
  username: string;
  displayName: string;
  role: string;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="h-3 w-3" />
        Pending
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 border border-green-200">
        <CheckCircle2 className="h-3 w-3" />
        Approved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 border border-red-200">
      <XCircle className="h-3 w-3" />
      Rejected
    </span>
  );
}

export default function HandoffsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [approving, setApproving] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<Record<number, string>>({});

  const canReview = user?.role === "admin" || user?.role === "approver";

  const load = useCallback(() => {
    setLoading(true);
    const params = tab === "pending" ? "?status=pending" : "";
    fetch(`${BASE}/api/handoffs${params}`)
      .then((r) => r.ok ? r.json() : [])
      .then(setHandoffs)
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch(`${BASE}/api/users/internal`)
      .then((r) => r.ok ? r.json() : [])
      .then(setUsers);
  }, []);

  const handleApprove = async (handoff: Handoff) => {
    const assigneeId = selectedAssignee[handoff.id];
    if (!assigneeId) {
      toast({ title: "Select a new assignee first", variant: "destructive" });
      return;
    }
    setApproving(handoff.id);
    try {
      const res = await fetch(`${BASE}/api/handoffs/${handoff.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newAssigneeUserId: parseInt(assigneeId) }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      toast({ title: "Handoff approved", description: `Invoice routed to new assignee.` });
      queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (handoff: Handoff) => {
    setRejecting(handoff.id);
    try {
      const res = await fetch(`${BASE}/api/handoffs/${handoff.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      toast({ title: "Handoff rejected", description: "Request has been rejected." });
      queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setRejecting(null);
    }
  };

  return (
    <AppLayout>
      <div className="px-6 py-5">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-foreground">Handoff Requests</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Invoice reassignment requests from staff awaiting your review
          </p>
        </div>

        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setTab("pending")}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              tab === "pending"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setTab("all")}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              tab === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Requests
          </button>
        </div>

        <div className="bg-card border border-card-border rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : handoffs.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {tab === "pending" ? "No pending handoff requests." : "No handoff requests found."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-medium">Invoice</th>
                  <th className="px-4 py-3 text-left font-medium">Requested By</th>
                  <th className="px-4 py-3 text-left font-medium">Notes</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  {canReview && tab === "pending" && (
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {handoffs.map((h) => (
                  <tr key={h.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/invoices/${h.invoiceId}`}>
                        <a className="font-medium text-primary hover:underline">
                          {h.invoiceNumber}
                        </a>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{h.requestedByName}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                      {h.notes ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={h.status} />
                      {h.status === "approved" && h.newAssigneeName && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" />
                          {h.newAssigneeName}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(h.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    {canReview && tab === "pending" && (
                      <td className="px-4 py-3">
                        {h.status === "pending" && (
                          <div className="flex items-center gap-2">
                            <Select
                              value={selectedAssignee[h.id] ?? ""}
                              onValueChange={(v) =>
                                setSelectedAssignee((prev) => ({ ...prev, [h.id]: v }))
                              }
                            >
                              <SelectTrigger className="h-7 w-44 text-xs">
                                <SelectValue placeholder="Assign to..." />
                              </SelectTrigger>
                              <SelectContent>
                                {users
                                  .filter((u) => u.role !== "vendor")
                                  .map((u) => (
                                    <SelectItem key={u.id} value={String(u.id)}>
                                      {u.displayName}
                                      <span className="text-muted-foreground ml-1 text-xs">
                                        ({u.role})
                                      </span>
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleApprove(h)}
                              disabled={approving === h.id || !selectedAssignee[h.id]}
                            >
                              {approving === h.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Approve"
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => handleReject(h)}
                              disabled={rejecting === h.id}
                            >
                              {rejecting === h.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Reject"
                              )}
                            </Button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
