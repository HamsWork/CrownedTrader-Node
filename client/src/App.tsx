import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import SendSignal from "@/pages/send-signal";
import SignalHistory from "@/pages/signal-history";
import SignalTypesPage from "@/pages/signal-types";
import DiscordChannelsPage from "@/pages/discord-channels";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/send" component={SendSignal} />
      <Route path="/history" component={SignalHistory} />
      <Route path="/signal-types" component={SignalTypesPage} />
      <Route path="/discord" component={DiscordChannelsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
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
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
