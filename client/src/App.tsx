import { Switch, Route } from "wouter";
import { queryClient, getQueryFn } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import SendSignal from "@/pages/send-signal";
import SendTA from "@/pages/send-ta";
import SignalHistory from "@/pages/signal-history";
import DiscordTemplatesPage from "@/pages/discord-templates";
import UserManagement, { CreateUserPage, EditUserPage } from "@/pages/user-management";
import TradePlansPage from "@/pages/trade-plans";
import LoginPage from "@/pages/login";
import { Skeleton } from "@/components/ui/skeleton";
import type { SafeUser } from "@shared/schema";

function Router() {
  const { data: user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/send" component={SendSignal} />
      <Route path="/send-ta" component={SendTA} />
      <Route path="/trade-plans" component={TradePlansPage} />
      <Route path="/history" component={SignalHistory} />
      {isAdmin && <Route path="/discord-templates" component={DiscordTemplatesPage} />}
      {isAdmin && <Route path="/users" component={UserManagement} />}
      {isAdmin && <Route path="/users/create" component={CreateUserPage} />}
      {isAdmin && <Route path="/users/:id/edit">{(params) => <EditUserPage userId={Number(params.id)} />}</Route>}
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-1 p-2 border-b sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { data: user, isLoading, error } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
