import { Switch, Route } from "wouter";
import { queryClient, getQueryFn } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-provider";
import { useAuth, useAcceptTos } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import SendSignal from "@/pages/send-signal";
import SendTA from "@/pages/send-ta";
import PositionManagement from "@/pages/position-management";
import SignalHistory from "@/pages/signal-history";
import DiscordTemplatesPage from "@/pages/discord-templates";
import UserManagement, { CreateUserPage, EditUserPage } from "@/pages/user-management";
import TradePlansPage from "@/pages/trade-plans";
import SystemAudit from "@/pages/system-audit";
import LoginPage from "@/pages/login";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Crown, ShieldCheck } from "lucide-react";
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
      <Route path="/positions" component={PositionManagement} />
      <Route path="/history" component={SignalHistory} />
      {isAdmin && <Route path="/discord-templates" component={DiscordTemplatesPage} />}
      {isAdmin && <Route path="/users" component={UserManagement} />}
      {isAdmin && <Route path="/users/create" component={CreateUserPage} />}
      {isAdmin && <Route path="/users/:id/edit">{(params) => <EditUserPage userId={Number(params.id)} />}</Route>}
      {isAdmin && <Route path="/audit" component={SystemAudit} />}
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

function TermsOfServiceScreen() {
  const acceptTos = useAcceptTos();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Crown className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Crowned Trader</h1>
          <p className="text-sm text-muted-foreground">Terms of Service</p>
        </div>
      </div>

      <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-5 w-5" />
          <h2 className="text-lg font-semibold" data-testid="text-tos-title">Terms of Service Agreement</h2>
        </div>

        <ScrollArea className="h-64 rounded-md border p-4 bg-muted/30">
          <div className="space-y-4 text-sm text-muted-foreground pr-4" data-testid="text-tos-content">
            <p className="font-semibold text-foreground">Welcome to Crowned Trader</p>
            <p>By using this platform, you agree to the following terms and conditions. Please read them carefully before proceeding.</p>

            <p className="font-semibold text-foreground">1. Disclaimer</p>
            <p>All signals, trade ideas, and technical analysis provided on this platform are for educational and informational purposes only. Nothing shared here constitutes financial advice, investment advice, or a recommendation to buy or sell any security or financial instrument.</p>

            <p className="font-semibold text-foreground">2. Risk Acknowledgement</p>
            <p>Trading stocks, options, ETFs, and cryptocurrencies involves substantial risk of loss and is not suitable for every investor. You acknowledge that you are solely responsible for your own trading decisions and any resulting gains or losses. Past performance does not guarantee future results.</p>

            <p className="font-semibold text-foreground">3. No Guarantees</p>
            <p>Crowned Trader makes no guarantees regarding the accuracy, completeness, or timeliness of the signals or information provided. Markets are unpredictable and signals may not perform as expected.</p>

            <p className="font-semibold text-foreground">4. Personal Responsibility</p>
            <p>You agree to conduct your own research and due diligence before entering any trade. You should consult with a licensed financial advisor if you are unsure about any investment decision.</p>

            <p className="font-semibold text-foreground">5. Confidentiality</p>
            <p>All content, signals, and strategies shared on this platform are proprietary and confidential. You agree not to reproduce, distribute, or share any content from this platform without explicit written permission.</p>

            <p className="font-semibold text-foreground">6. Account Usage</p>
            <p>Your account is for your personal use only. Sharing login credentials or allowing others to access your account is strictly prohibited and may result in account termination.</p>

            <p className="font-semibold text-foreground">7. Limitation of Liability</p>
            <p>Crowned Trader and its operators shall not be held liable for any financial losses, damages, or claims arising from the use of this platform or reliance on information provided herein.</p>

            <p className="font-semibold text-foreground">8. Modifications</p>
            <p>We reserve the right to modify these terms at any time. Continued use of the platform constitutes acceptance of any updated terms.</p>
          </div>
        </ScrollArea>

        <Button
          className="w-full"
          onClick={() => acceptTos.mutate()}
          disabled={acceptTos.isPending}
          data-testid="button-accept-tos"
        >
          {acceptTos.isPending ? "Accepting..." : "I Agree to the Terms of Service"}
        </Button>
      </div>
    </div>
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

  if (!user.tosAccepted) {
    return <TermsOfServiceScreen />;
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
