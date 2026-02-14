import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Files from "@/pages/files";
import DocEntry from "@/pages/doc-entry";
import Scanner from "@/pages/scanner";
import Export from "@/pages/export";
import Help from "@/pages/help";
import Edit from "@/pages/edit";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Account from "@/pages/account";
import AuthCallback from "@/pages/auth-callback";
import { ScanProvider } from "@/lib/scan-context";
import { AuthProvider } from "@/lib/auth/auth-context";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/files" component={Files} />
      <Route path="/doc/:id" component={DocEntry} />
      <Route path="/doc/:id/review" component={Scanner} />
      <Route path="/doc/:id/camera" component={Scanner} />
      <Route path="/doc/:id/edit" component={Edit} />
      <Route path="/doc/:id/export" component={Export} />
      <Route path="/scan" component={Scanner} />
      <Route path="/scan/*" component={Scanner} />
      <Route path="/export" component={Export} />
      <Route path="/edit" component={Edit} />
      <Route path="/help" component={Help} />
      <Route path="/account" component={Account} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ScanProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ScanProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
