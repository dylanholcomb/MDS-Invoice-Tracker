import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import InvoiceListPage from "@/pages/invoices/index";
import NewInvoicePage from "@/pages/invoices/new";
import InvoiceDetailPage from "@/pages/invoices/detail";
import SuppliersPage from "@/pages/suppliers";
import PurchaseOrdersPage from "@/pages/purchase-orders";
import StaffPage from "@/pages/staff";
import AgingPage from "@/pages/aging";
import SpeedchartsPage from "@/pages/speedcharts";
import FiscalImportPage from "@/pages/fiscal-import";
import HandoffsPage from "@/pages/handoffs";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
    },
  },
});

const INTERNAL_ROLES = ["admin", "accountant", "approver", "staff"];

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-6 w-6 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!INTERNAL_ROLES.includes(user.role)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-sm font-semibold text-foreground mb-1">Access Denied</p>
          <p className="text-xs text-muted-foreground mb-6">
            Your account does not have permission to access this system. Vendors should use the Vendor Portal.
          </p>
          <button
            onClick={() => logout()}
            className="text-xs text-primary underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        {() => (
          <AuthGate>
            <DashboardPage />
          </AuthGate>
        )}
      </Route>
      <Route path="/dashboard">
        {() => (
          <AuthGate>
            <DashboardPage />
          </AuthGate>
        )}
      </Route>
      <Route path="/invoices/new">
        {() => (
          <AuthGate>
            <NewInvoicePage />
          </AuthGate>
        )}
      </Route>
      <Route path="/invoices/:id">
        {() => (
          <AuthGate>
            <InvoiceDetailPage />
          </AuthGate>
        )}
      </Route>
      <Route path="/invoices">
        {() => (
          <AuthGate>
            <InvoiceListPage />
          </AuthGate>
        )}
      </Route>
      <Route path="/suppliers">
        {() => (
          <AuthGate>
            <SuppliersPage />
          </AuthGate>
        )}
      </Route>
      <Route path="/purchase-orders">
        {() => (
          <AuthGate>
            <PurchaseOrdersPage />
          </AuthGate>
        )}
      </Route>
      <Route path="/staff">
        {() => (
          <AuthGate>
            <StaffPage />
          </AuthGate>
        )}
      </Route>
      <Route path="/aging">
        {() => (
          <AuthGate>
            <AgingPage />
          </AuthGate>
        )}
      </Route>
      <Route path="/speedcharts">
        {() => (
          <AuthGate>
            <SpeedchartsPage />
          </AuthGate>
        )}
      </Route>
      <Route path="/fiscal-import">
        {() => (
          <AuthGate>
            <FiscalImportPage />
          </AuthGate>
        )}
      </Route>
      <Route path="/handoffs">
        {() => (
          <AuthGate>
            <HandoffsPage />
          </AuthGate>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
