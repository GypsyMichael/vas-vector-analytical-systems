import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth-page";
import AppShell from "@/components/app-shell";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/dashboard" component={() => <AppShell page="dashboard" />} />
      <Route path="/ad-engine" component={() => <AppShell page="ad-engine" />} />
      <Route path="/humor-screener" component={() => <AppShell page="humor-screener" />} />
      <Route path="/copy-assistant" component={() => <AppShell page="copy-assistant" />} />
      <Route path="/research" component={() => <AppShell page="research" />} />
      <Route path="/knowledge" component={() => <AppShell page="knowledge" />} />
      <Route path="/settings" component={() => <AppShell page="settings" />} />
      <Route path="/intelligence" component={() => <AppShell page="intelligence" />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
