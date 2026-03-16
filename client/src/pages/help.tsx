import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Crown,
  LayoutDashboard,
  Send,
  TrendingUp,
  ClipboardList,
  Briefcase,
  History,
  MessageSquare,
  Users,
  ShieldCheck,
  LogIn,
  FileText,
  ChevronRight,
  Target,
  BarChart3,
  Bell,
  Eye,
  Settings,
  Shield,
  UserPlus,
  Lock,
  Rocket,
  CircleDollarSign,
  ArrowRightLeft,
  LineChart,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface HelpSection {
  id: string;
  title: string;
  icon: typeof LayoutDashboard;
  route?: string;
  adminOnly?: boolean;
  color: string;
  summary: string;
  screenshot: string;
  details: string[];
  features: { label: string; description: string }[];
}

const HELP_SECTIONS: HelpSection[] = [
  {
    id: "login",
    title: "Login",
    icon: LogIn,
    color: "bg-amber-500",
    screenshot: "/help/login.png",
    summary: "Secure login screen — no public registration. Only admins can create user accounts.",
    details: [
      "Enter your username and password to sign in.",
      "There is no self-registration. Your admin will create your account and provide credentials.",
      "After logging in for the first time, you'll be shown a Terms of Service agreement that must be accepted before accessing the platform.",
    ],
    features: [
      { label: "Username & Password", description: "Standard credential-based authentication" },
      { label: "Session-based Auth", description: "Your session persists until you log out" },
      { label: "Role-based Access", description: "Admin users see additional management pages" },
    ],
  },
  {
    id: "tos",
    title: "Terms of Service",
    icon: FileText,
    color: "bg-indigo-500",
    screenshot: "/help/tos.png",
    summary: "One-time agreement screen shown on first login, covering disclaimers and platform rules.",
    details: [
      "On your very first login, a Terms of Service screen will appear before you can access the dashboard.",
      "The agreement covers: disclaimers, risk acknowledgement, no guarantees, personal responsibility, confidentiality, account usage, liability limitations, and modification rights.",
      "Once you accept, it won't appear again on future logins.",
    ],
    features: [
      { label: "One-time Acceptance", description: "Only shown once per account, stored in your profile" },
      { label: "Full Terms", description: "Scrollable area with all 8 sections of the agreement" },
      { label: "Required", description: "Must be accepted before accessing any part of the platform" },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    route: "/",
    color: "bg-emerald-500",
    screenshot: "/help/dashboard.png",
    summary: "Your home screen with the trading leaderboard and platform overview.",
    details: [
      "The Dashboard is the first page you see after logging in. It provides a quick overview of the platform activity.",
      "The Leaderboard section displays trader rankings and performance metrics.",
      "Use the sidebar on the left to navigate to other sections of the platform.",
    ],
    features: [
      { label: "Leaderboard", description: "Rankings showing trader performance and win rates" },
      { label: "Quick Navigation", description: "Sidebar with links to all platform features" },
      { label: "Theme Toggle", description: "Switch between light and dark mode from the header" },
    ],
  },
  {
    id: "send-signal",
    title: "Send Signal",
    icon: Send,
    route: "/send",
    color: "bg-green-500",
    screenshot: "/help/send-signal.png",
    summary: "The unified form for creating and sending trading signals to Discord channels.",
    details: [
      "This is the main page for creating trading signals. Select a category (Options, Shares, LETF, LETF Option, or Crypto) and fill out the trade details.",
      "The form includes real-time price fetching from Polygon API — just enter a ticker and prices update automatically every 15 seconds.",
      "For Options trades, the system suggests the best option contract based on your trade type (Scalp, Swing, or Leap) using smart delta-based selection.",
      "A live Discord preview on the right side shows exactly how your signal will look when posted to Discord.",
      "After filling out the form, you can send the signal to one or more Discord channels via webhook.",
    ],
    features: [
      { label: "Category Selection", description: "Options, Shares, LETF, LETF Option, Crypto — each with tailored form fields" },
      { label: "Real-time Pricing", description: "Live price data with 15-second polling from Polygon API" },
      { label: "Best Option Finder", description: "Automatic option contract suggestion based on delta, expiration, and trade type" },
      { label: "Discord Preview", description: "Live preview of the exact Discord embed that will be sent" },
      { label: "Multi-channel Send", description: "Send to multiple Discord channels simultaneously via webhooks" },
      { label: "Trade Type", description: "Scalp, Swing, or Leap — each uses different option selection criteria" },
      { label: "TradeSync Integration", description: "Optionally forward signals to TradeSync for automated trade execution" },
    ],
  },
  {
    id: "send-ta",
    title: "Send TA",
    icon: TrendingUp,
    route: "/send-ta",
    color: "bg-cyan-500",
    screenshot: "/help/send-ta.png",
    summary: "Send Technical Analysis posts with chart images to Discord channels.",
    details: [
      "Use this page to share technical analysis with your community.",
      "Upload chart images or screenshots, add your analysis notes, and post them directly to Discord.",
      "Great for sharing market outlook, key levels, and trade setups before sending actual trade signals.",
    ],
    features: [
      { label: "Image Upload", description: "Attach chart screenshots and technical analysis images" },
      { label: "Analysis Notes", description: "Add your written analysis and commentary" },
      { label: "Discord Posting", description: "Send directly to Discord channels via webhook" },
    ],
  },
  {
    id: "trade-plans",
    title: "Trade Plans",
    icon: ClipboardList,
    route: "/trade-plans",
    color: "bg-amber-500",
    screenshot: "/help/trade-plans.png",
    summary: "Create and manage your trading plans before entering trades.",
    details: [
      "Trade Plans let you document your trading strategy before executing.",
      "Write out your thesis, entry/exit criteria, risk management rules, and target levels.",
      "Plans can be created, edited, and deleted. Each plan is tied to your user account.",
      "Having a written plan helps maintain discipline and provides a reference when managing positions.",
    ],
    features: [
      { label: "Plan Creation", description: "Document your trade thesis, targets, and risk levels" },
      { label: "Edit & Delete", description: "Update plans as market conditions change" },
      { label: "Personal Plans", description: "Each user manages their own set of trade plans" },
    ],
  },
  {
    id: "positions",
    title: "Position Management",
    icon: Briefcase,
    route: "/positions",
    color: "bg-orange-500",
    screenshot: "/help/positions.png",
    summary: "Track open positions and manage exits with live pricing and Discord notifications.",
    details: [
      "Position Management shows all your open and closed trading positions as cards.",
      "Each position card displays the ticker, entry price, current price, stop loss, and take profit levels.",
      "Use the Partial Exit button to take profits on part of your position (e.g., TP1) while keeping the rest open. This also lets you raise the stop loss on the remaining position.",
      "Use the Full Exit button to close the entire position. Choose the exit reason: Take Profit, Stop Loss, or Trailing Stop.",
      "Both exit dialogs include a live Discord preview showing exactly what notification will be posted.",
      "Real-time price polling updates the current price every 15 seconds, with a pulsing green indicator.",
    ],
    features: [
      { label: "Position Cards", description: "Visual cards for each open position with key metrics" },
      { label: "Partial Exit", description: "Close part of a position at TP1, then raise the stop loss on the remainder" },
      { label: "Full Exit", description: "Close the entire position with reason: Take Profit, Stop Loss, or Trailing Stop" },
      { label: "Live Price", description: "15-second polling with green pulsing indicator and timestamp" },
      { label: "Discord Preview", description: "See the exact Discord embed before sending exit notifications" },
      { label: "Exit Reasons", description: "Take Profit shows 🎯, Stop Loss shows 🛑 with Discipline Matters section" },
    ],
  },
  {
    id: "signal-history",
    title: "Signal History",
    icon: History,
    route: "/history",
    color: "bg-purple-500",
    screenshot: "/help/signal-history.png",
    summary: "View all past signals with full Discord preview for each signal lifecycle stage.",
    details: [
      "Signal History shows a table of all signals that have been sent, with filtering and search capabilities.",
      "Click 'Discord Preview' on any signal to see a 5-tab modal showing how each stage of the signal looks in Discord:",
      "• Entry Signal — the original alert posted when entering the trade",
      "• TP1 Hit — the notification when the first take profit target is reached",
      "• TP2 Hit — the notification when the second take profit target is reached",
      "• SL Raised — the notification when stop loss is moved up after TP1",
      "• Stop Loss Hit — the notification when the stop loss is triggered",
      "Each tab shows the exact Discord embed format with proper emojis, field labels, and formatting.",
    ],
    features: [
      { label: "Signal Table", description: "Searchable, sortable list of all past signals" },
      { label: "5-Tab Discord Preview", description: "Entry, TP1, TP2, SL Raised, Stop Loss — each in Discord embed format" },
      { label: "Options Format", description: "Shows Expiration, Strike, Option Price, Entry, TP, Profit with proper emojis" },
      { label: "Shares Format", description: "Shows Ticker, Entry, TP, Direction, Profit in two-row layout" },
      { label: "Status Tracking", description: "See which signals are open, partially closed, or fully closed" },
    ],
  },
  {
    id: "discord-templates",
    title: "Discord Templates",
    icon: MessageSquare,
    route: "/discord-templates",
    adminOnly: true,
    color: "bg-violet-500",
    screenshot: "/help/discord-templates.png",
    summary: "View and manage the 25 Discord message templates used across all categories.",
    details: [
      "This admin-only page shows all Discord embed templates organized by category (Options, Shares, LETF, LETF Option, Crypto).",
      "Each category has 5 templates: Entry Signal, Target TP1 Hit, Target TP2 Hit, SL Raised, and Stop Loss Hit.",
      "Click the eye icon on any template to see its full Discord preview with sample data filled in.",
      "Templates define the embed color, title, description, field layout, and footer for each signal type.",
      "Markdown formatting (like **bold text**) renders correctly in the preview, just as it would in Discord.",
    ],
    features: [
      { label: "Category Filter", description: "Filter templates by Options, Shares, LETF, LETF Option, or Crypto" },
      { label: "Template Preview", description: "Full Discord embed preview with sample data" },
      { label: "Send Manual", description: "Send a template manually with custom variable values" },
      { label: "Markdown Support", description: "Bold text and other Discord markdown renders in previews" },
      { label: "5 Templates per Category", description: "Entry, TP1, TP2, SL Raised, Stop Loss Hit" },
    ],
  },
  {
    id: "user-management",
    title: "User Management",
    icon: Users,
    route: "/users",
    adminOnly: true,
    color: "bg-rose-500",
    screenshot: "/help/user-management.png",
    summary: "Create, edit, and manage user accounts. Only admins can create new users.",
    details: [
      "This admin-only page lets you manage all user accounts on the platform.",
      "Create new users with a username, password, and role (admin or user).",
      "Edit existing users to change their password, role, or Discord channel configurations.",
      "Delete users who no longer need access.",
      "Each user can have their own set of Discord webhook channels for receiving signals.",
      "There is no public registration — all accounts must be created by an admin through this page.",
    ],
    features: [
      { label: "Create Users", description: "Add new accounts with username, password, and role" },
      { label: "Edit Users", description: "Change passwords, roles, and Discord channels" },
      { label: "Delete Users", description: "Remove accounts that are no longer needed" },
      { label: "Role Assignment", description: "Set users as 'admin' or 'user' to control access" },
      { label: "Discord Channels", description: "Configure webhook URLs for each user's Discord channels" },
    ],
  },
  {
    id: "system-audit",
    title: "System Audit",
    icon: ShieldCheck,
    route: "/audit",
    adminOnly: true,
    color: "bg-slate-500",
    screenshot: "/help/system-audit.png",
    summary: "Architecture reference page showing the system design, API routes, and data flow.",
    details: [
      "The System Audit page is a read-only reference that documents the platform's technical architecture.",
      "It covers the database schema, API endpoints, authentication flow, and integration points.",
      "Useful for understanding how the system works, debugging issues, or onboarding new developers.",
    ],
    features: [
      { label: "Architecture Overview", description: "Visual overview of the system components" },
      { label: "API Reference", description: "Documentation of all available API endpoints" },
      { label: "Data Flow", description: "How signals flow from creation to Discord delivery" },
    ],
  },
];

function HelpSectionCard({ section, onImageClick }: { section: HelpSection; onImageClick: (src: string, title: string) => void }) {
  const Icon = section.icon;

  return (
    <Card className="overflow-hidden" data-testid={`help-section-${section.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-white flex-shrink-0 ${section.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">{section.title}</CardTitle>
              {section.adminOnly && (
                <Badge variant="secondary" className="text-xs">Admin Only</Badge>
              )}
              {section.route && (
                <Link href={section.route}>
                  <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent gap-1" data-testid={`help-link-${section.id}`}>
                    Go to page <ChevronRight className="h-3 w-3" />
                  </Badge>
                </Link>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{section.summary}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div
          className="rounded-lg border overflow-hidden mb-3 cursor-pointer group"
          onClick={() => onImageClick(section.screenshot, section.title)}
          data-testid={`help-screenshot-${section.id}`}
        >
          <div className="relative">
            <img
              src={section.screenshot}
              alt={`${section.title} screenshot`}
              className="w-full h-auto block transition-transform group-hover:scale-[1.01]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                Click to enlarge
              </span>
            </div>
          </div>
        </div>
        <Accordion type="single" collapsible>
          <AccordionItem value="details" className="border-none">
            <AccordionTrigger className="py-2 text-sm font-medium" data-testid={`help-details-${section.id}`}>
              How it works
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  {section.details.map((detail, i) => (
                    <p key={i} className="text-sm text-muted-foreground leading-relaxed">{detail}</p>
                  ))}
                </div>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Features</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {section.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-md border p-2.5 bg-muted/30">
                        <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold">{feature.label}</p>
                          <p className="text-xs text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

export default function HelpPage() {
  const { data: user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null);

  const handleImageClick = useCallback((src: string, title: string) => {
    setLightbox({ src, title });
  }, []);

  const visibleSections = HELP_SECTIONS.filter(
    (s) => !s.adminOnly || isAdmin
  );

  const generalSections = visibleSections.filter((s) => !s.adminOnly);
  const adminSections = visibleSections.filter((s) => s.adminOnly);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" data-testid="page-help">
      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-5xl w-[95vw] p-2">
          {lightbox && (
            <div>
              <p className="text-sm font-semibold mb-2 px-2 pt-1">{lightbox.title}</p>
              <img
                src={lightbox.src}
                alt={lightbox.title}
                className="w-full h-auto rounded-md"
                data-testid="lightbox-image"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-help-title">Help & Walkthrough</h1>
            <p className="text-sm text-muted-foreground">Learn how to use every page and feature in Crowned Trader</p>
          </div>
        </div>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start gap-3">
            <Crown className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Quick Start</p>
              <p className="text-sm text-muted-foreground">
                Crowned Trader is a trading signal dashboard that lets you create, manage, and send trade signals to Discord.
                Use the <strong>Send Signal</strong> page to create alerts, <strong>Position Management</strong> to track and exit trades,
                and <strong>Signal History</strong> to review past signals. Click any section below to learn more, or use the
                "Go to page" badge to jump directly to that feature.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Rocket className="h-4 w-4 text-muted-foreground" />
          Getting Started
        </h2>
        <div className="space-y-3">
          {generalSections.filter(s => s.id === "login" || s.id === "tos" || s.id === "dashboard").map((section) => (
            <HelpSectionCard key={section.id} section={section} onImageClick={handleImageClick} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          Trading Features
        </h2>
        <div className="space-y-3">
          {generalSections.filter(s => ["send-signal", "send-ta", "trade-plans", "positions", "signal-history"].includes(s.id)).map((section) => (
            <HelpSectionCard key={section.id} section={section} onImageClick={handleImageClick} />
          ))}
        </div>
      </div>

      {adminSections.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Admin Features
          </h2>
          <div className="space-y-3">
            {adminSections.map((section) => (
              <HelpSectionCard key={section.id} section={section} onImageClick={handleImageClick} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
