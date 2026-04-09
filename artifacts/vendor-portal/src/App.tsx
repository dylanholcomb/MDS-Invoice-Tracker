import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContext, useAuthProvider, useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import LoginPage from "@/pages/login";
import SubmissionsPage from "@/pages/submissions";
import SubmitPage from "@/pages/submit";
import ConfirmationPage from "@/pages/confirmation";
import SubmissionDetailPage from "@/pages/submission-detail";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const auth = useAuthProvider();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        <RequireAuth><SubmissionsPage /></RequireAuth>
      </Route>
      <Route path="/submit">
        <RequireAuth><SubmitPage /></RequireAuth>
      </Route>
      <Route path="/confirmation/:id">
        {(params) => <RequireAuth><ConfirmationPage /></RequireAuth>}
      </Route>
      <Route path="/submissions/:id">
        {(params) => <RequireAuth><SubmissionDetailPage /></RequireAuth>}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthWrapper>
            <Router />
          </AuthWrapper>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
