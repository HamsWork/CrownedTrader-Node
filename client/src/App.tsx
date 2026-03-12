import { Switch, Route, useLocation } from "wouter";
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
import HelpPage from "@/pages/help";
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
      <Route path="/help" component={HelpPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/send": "Send Signal",
  "/send-ta": "Send TA",
  "/trade-plans": "Trade Plans",
  "/positions": "Position Management",
  "/history": "Signal History",
  "/help": "Help",
  "/discord-templates": "Discord Templates",
  "/users": "User Management",
  "/audit": "System Audit",
};

function AuthenticatedApp() {
  const [location] = useLocation();
  const pageTitle = PAGE_TITLES[location] || "";

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
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <span className="text-sm font-semibold truncate" data-testid="text-page-title">{pageTitle}</span>
            </div>
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
            <p className="font-semibold text-foreground">SWJ Crown Trader and Scout Rules (Simple Agreement)</p>
            <p>
              Welcome to SWJ. By holding a Crown Trader or Scout role and continuing to use this platform,
              you agree to the following simple terms. If you do not agree, you may not hold these roles.
            </p>

            <p className="font-semibold text-foreground">Crown Traders (Featured Traders)</p>
            <p>
              Crown Traders are official featured traders inside SWJ. SWJ may spotlight, rank, promote, and
              highlight your results and activity. To make this possible, you agree that your trade ideas and alerts
              will be posted through the SWJ system so performance and impact can be tracked.
            </p>
            <p>
              As a Crown Trader, you agree to contribute to the main SWJ community by posting at least once per week
              in the shared Crown Trader area so all members can learn from you.
            </p>

            <p className="font-semibold text-foreground">Crown Trader Private Communities</p>
            <p>
              Crown Traders may have their own private experience inside the SWJ Discord, but it must live within the
              SWJ server. SWJ will create and manage private, role-based channels for your upgraded members so you do
              not need to run a separate server. SWJ handles roles, access, support tickets, and backend organization;
              you focus on alerts, education, and delivering value.
            </p>

            <p className="font-semibold text-foreground">No Outside Discord Promotion While a Crown Trader</p>
            <p>
              If you choose to operate a separate paid community outside SWJ, you cannot remain a Crown Trader inside SWJ.
              While holding the Crown Trader role, you may not create, run, or promote any separate Discord server or paid
              community outside SWJ. You may not promote outside communities anywhere in SWJ, including posting links,
              mentioning or hinting at them, sharing screenshots, asking members to DM you for access, or direct-messaging
              members to pitch outside offers.
            </p>
            <p>
              All premium access for Crown Traders must run through the SWJ upgrade system. SWJ will provide each Crown
              Trader with a Whop store link that unlocks their premium access inside SWJ. That link may include the
              specific offers and pricing you choose, subject to SWJ approval, and it will also provide an option for
              members to upgrade into the full SWJ package.
            </p>

            <p className="font-semibold text-foreground">Scouts (Community Traders)</p>
            <p>
              Scouts are respected community traders but are not listed as featured Crown Traders. Scouts may still
              contribute and post, but they are not ranked, highlighted, or promoted at the same level as Crown Traders.
            </p>
            <p>
              Scouts may not advertise any personal brand, services, or outside communities inside SWJ. The only link a
              Scout may share is an SWJ-approved upgrade or affiliate link, if they are part of the official SWJ
              affiliate system.
            </p>

            <p className="font-semibold text-foreground">No Guaranteed Wins or Profit Promises</p>
            <p>
              As a Crown Trader or Scout, you agree to keep communication professional and responsible. You may not make
              misleading promises, guarantee profits, or imply that trading is risk-free. Trading is risky and every
              member is responsible for their own decisions and results.
            </p>

            <p className="font-semibold text-foreground">Role-Based Access and Changes</p>
            <p>
              Crown Trader and Scout roles are privileges, not permanent entitlements. SWJ can adjust roles,
              permissions, and access at any time to protect the community and maintain quality. If someone is not
              aligned with these rules, SWJ may remove the role and adjust access immediately.
            </p>

            <p className="font-semibold text-foreground">Agreement Confirmation</p>
            <p>
              By continuing to hold a Crown Trader or Scout role inside SWJ and by using this platform, you confirm that
              you understand and agree to these rules. If you do not agree, you must not continue to hold the role.
            </p>
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
