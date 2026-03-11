import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  FileCode2, Server, Database, Layout, FolderTree, Clock, Code2, Layers,
  Shield, Zap, MessageSquare, RefreshCw, TrendingUp, Target, Search,
  Crown, History, Users, Image, BarChart3, ChevronDown, ChevronRight,
  ArrowRight, GitBranch, BookOpen
} from "lucide-react";
import { format } from "date-fns";

type AuditFile = {
  path: string;
  description: string;
  lastUpdateNote: string;
  lines: number;
  lastModified: string;
};

type AuditCategory = {
  files: AuditFile[];
};

type TechItem = {
  name: string;
  category: string;
};

type FeatureFile = {
  path: string;
  role: string;
};

type Feature = {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  howItWorks: string[];
  files: FeatureFile[];
  connections: string[];
  latestUpdates: string;
};

type DataFlow = {
  name: string;
  steps: string[];
};

type LatestChange = {
  title: string;
  description: string;
  category: string;
  files: string[];
};

type AuditData = {
  projectName: string;
  version: string;
  description: string;
  architecture: {
    pattern: string;
    frontend: string;
    backend: string;
    database: string;
    sharedLayer: string;
  };
  lastUpdated: string;
  totalFiles: number;
  totalLines: number;
  categories: Record<string, AuditCategory>;
  techStack: TechItem[];
  features: Feature[];
  dataFlows: DataFlow[];
  latestChanges: LatestChange[];
};

const categoryIcons: Record<string, typeof Server> = {
  "Server Core": Server,
  "Server Utilities": FolderTree,
  "Shared / Schema": Database,
  "Client Pages": Layout,
  "Client Components": Layers,
  "Client Hooks & Libs": Code2,
  "Config": FileCode2,
};

const featureIcons: Record<string, typeof Shield> = {
  Shield, Zap, MessageSquare, RefreshCw, TrendingUp, Target,
  Search, Crown, History, Users, Layout, Image, BarChart3, FileCode2,
};

const categoryColors: Record<string, string> = {
  "Core": "bg-blue-500/10 text-blue-400 border-blue-500/30",
  "Trading": "bg-green-500/10 text-green-400 border-green-500/30",
  "Integration": "bg-purple-500/10 text-purple-400 border-purple-500/30",
  "Analytics": "bg-amber-500/10 text-amber-400 border-amber-500/30",
  "Admin": "bg-rose-500/10 text-rose-400 border-rose-500/30",
};

const tabs = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "features", label: "Features", icon: Zap },
  { id: "codebase", label: "Codebase", icon: Code2 },
  { id: "updates", label: "Updates", icon: GitBranch },
] as const;

type TabId = (typeof tabs)[number]["id"];

function FeatureCard({ feature }: { feature: Feature }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = featureIcons[feature.icon] || Zap;
  const colorClass = categoryColors[feature.category] || categoryColors["Core"];

  return (
    <div
      className="rounded-lg border border-border bg-card overflow-hidden"
      data-testid={`card-feature-${feature.id}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors text-left"
        data-testid={`button-expand-${feature.id}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/60 shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{feature.name}</span>
              <Badge variant="outline" className={`text-[10px] ${colorClass}`}>
                {feature.category}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{feature.description}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">How It Works</h4>
            <ol className="space-y-1.5">
              {feature.howItWorks.map((step, i) => (
                <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                  <span className="text-primary font-mono shrink-0 w-4 text-right">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Files Involved</h4>
            <div className="space-y-1">
              {feature.files.map((f, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <code className="text-[11px] font-mono bg-muted/50 px-1.5 py-0.5 rounded shrink-0 break-all">{f.path}</code>
                  <span className="text-[11px] text-muted-foreground">{f.role}</span>
                </div>
              ))}
            </div>
          </div>

          {feature.connections.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Connects To</h4>
              <div className="flex flex-wrap gap-1.5">
                {feature.connections.map((conn, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">
                    {conn}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Latest Updates</h4>
            <p className="text-xs text-muted-foreground italic">{feature.latestUpdates}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DataFlowCard({ flow }: { flow: DataFlow }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden" data-testid={`card-flow-${flow.name.toLowerCase().replace(/\s+/g, "-")}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">{flow.name}</span>
          <span className="text-xs text-muted-foreground">({flow.steps.length} steps)</span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          <div className="space-y-1.5">
            {flow.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex flex-col items-center shrink-0 mt-0.5">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-primary font-bold">{i + 1}</span>
                  </div>
                  {i < flow.steps.length - 1 && (
                    <div className="w-px h-3 bg-border mt-0.5" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground pt-0.5">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SystemAudit() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [featureFilter, setFeatureFilter] = useState<string>("all");

  const { data, isLoading } = useQuery<AuditData>({
    queryKey: ["/api/audit"],
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-muted-foreground">Failed to load audit data. Admin access required.</p>
      </div>
    );
  }

  const features = data.features || [];
  const dataFlows = data.dataFlows || [];
  const latestChanges = data.latestChanges || [];
  const techStack = data.techStack || [];
  const categories = data.categories || {};

  const featureCategories = ["all", ...Array.from(new Set(features.map(f => f.category)))];
  const filteredFeatures = featureFilter === "all"
    ? features
    : features.filter(f => f.category === featureFilter);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-page-title">
          System Audit
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Complete architecture reference, feature documentation, and codebase overview
        </p>
      </div>

      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <TabIcon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
            <h2 className="font-semibold text-base mb-2" data-testid="text-overview-title">{data.projectName}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{data.description}</p>
          </div>

          {data.architecture && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Architecture</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Pattern", value: data.architecture.pattern, icon: Layers },
                  { label: "Frontend", value: data.architecture.frontend, icon: Layout },
                  { label: "Backend", value: data.architecture.backend, icon: Server },
                  { label: "Database", value: data.architecture.database, icon: Database },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</span>
                    </div>
                    <p className="text-sm font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
              {data.architecture.sharedLayer && (
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shared Layer</span>
                  </div>
                  <p className="text-sm font-medium">{data.architecture.sharedLayer}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source Files</div>
              <div className="text-2xl font-bold mt-1" data-testid="text-total-files">{data.totalFiles}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{data.totalLines.toLocaleString()} total lines</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Features</div>
              <div className="text-2xl font-bold mt-1" data-testid="text-feature-count">{features.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">documented features</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Updated</div>
              <div className="text-2xl font-bold mt-1" data-testid="text-last-updated">
                {format(new Date(data.lastUpdated), "MMM dd")}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(data.lastUpdated), "yyyy HH:mm")}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Tech Stack</h2>
            <div className="flex flex-wrap gap-2">
              {techStack.map((tech) => (
                <Badge
                  key={tech.name}
                  variant="outline"
                  className="px-2.5 py-1 text-xs"
                  data-testid={`badge-tech-${tech.name.toLowerCase().replace(/[\s./]/g, "-")}`}
                >
                  <span className="font-medium">{tech.name}</span>
                  <span className="text-muted-foreground ml-1.5">({tech.category})</span>
                </Badge>
              ))}
            </div>
          </div>

          {dataFlows.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Data Flows</h2>
              <div className="space-y-2">
                {dataFlows.map((flow, i) => (
                  <DataFlowCard key={i} flow={flow} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "features" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {featureCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFeatureFilter(cat)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  featureFilter === cat
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/50"
                }`}
                data-testid={`filter-${cat.toLowerCase()}`}
              >
                {cat === "all" ? "All" : cat}
                <span className="ml-1 text-[10px] opacity-70">
                  ({cat === "all" ? features.length : features.filter(f => f.category === cat).length})
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredFeatures.map((feature) => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
          </div>
        </div>
      )}

      {activeTab === "codebase" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project</div>
              <div className="text-lg font-bold mt-1">{data.projectName}</div>
              <div className="text-xs text-muted-foreground mt-0.5">v{data.version}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source Files</div>
              <div className="text-lg font-bold mt-1">{data.totalFiles}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{data.totalLines.toLocaleString()} lines</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Modified</div>
              <div className="text-lg font-bold mt-1">{format(new Date(data.lastUpdated), "MMM dd, yyyy")}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{format(new Date(data.lastUpdated), "HH:mm:ss")}</div>
            </div>
          </div>

          {Object.entries(categories).map(([catName, cat]) => {
            if (cat.files.length === 0) return null;
            const Icon = categoryIcons[catName] || FileCode2;
            const catLines = cat.files.reduce((s, f) => s + f.lines, 0);

            return (
              <div key={catName} className="rounded-lg border border-border overflow-hidden">
                <div className="bg-muted/30 px-4 py-3 flex items-center justify-between border-b border-border">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">{catName}</span>
                    <Badge variant="secondary" className="text-xs ml-1">{cat.files.length} files</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{catLines.toLocaleString()} lines</span>
                </div>
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]" data-testid={`table-${catName.toLowerCase().replace(/[\s/]/g, "-")}`}>
                    <thead>
                      <tr className="border-b border-border bg-muted/10">
                        <th className="text-left px-3 sm:px-4 py-2 font-medium text-xs uppercase text-muted-foreground">File</th>
                        <th className="text-left px-3 sm:px-4 py-2 font-medium text-xs uppercase text-muted-foreground">Description</th>
                        <th className="text-right px-3 sm:px-4 py-2 font-medium text-xs uppercase text-muted-foreground w-20">Lines</th>
                        <th className="text-right px-3 sm:px-4 py-2 font-medium text-xs uppercase text-muted-foreground w-40">Last Modified</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.files
                        .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
                        .map((file) => (
                        <tr
                          key={file.path}
                          className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
                          data-testid={`row-file-${file.path.replace(/[/.]/g, "-")}`}
                        >
                          <td className="px-3 sm:px-4 py-2.5">
                            <code className="text-xs font-mono bg-muted/50 px-1.5 py-0.5 rounded">{file.path}</code>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5">
                            <div className="text-sm text-muted-foreground">{file.description}</div>
                            <div className="text-[11px] text-muted-foreground/70 mt-0.5 italic" data-testid={`text-update-note-${file.path.replace(/[/.]/g, "-")}`}>
                              {file.lastUpdateNote}
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 text-right text-xs font-mono text-muted-foreground">
                            {file.lines}
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {format(new Date(file.lastModified), "MMM dd, HH:mm")}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="sm:hidden divide-y divide-border">
                  {cat.files
                    .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
                    .map((file) => (
                    <div
                      key={file.path}
                      className="px-3 py-3 space-y-1.5"
                      data-testid={`row-file-mobile-${file.path.replace(/[/.]/g, "-")}`}
                    >
                      <code className="text-xs font-mono bg-muted/50 px-1.5 py-0.5 rounded break-all">{file.path}</code>
                      <div className="text-xs text-muted-foreground">{file.description}</div>
                      <div className="text-[11px] text-muted-foreground/70 italic">{file.lastUpdateNote}</div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-mono">{file.lines} lines</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(file.lastModified), "MMM dd, HH:mm")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "updates" && (
        <div className="space-y-4">
          {latestChanges.length > 0 ? (
            latestChanges.map((change, i) => {
              const colorClass = categoryColors[change.category] || categoryColors["Core"];
              return (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card p-4 space-y-3"
                  data-testid={`card-update-${i}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-sm">{change.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{change.description}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${colorClass}`}>
                      {change.category}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Files Changed</h4>
                    <div className="flex flex-wrap gap-1">
                      {change.files.map((f, j) => (
                        <code key={j} className="text-[10px] font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                          {f.split("/").pop()}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No update log available.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
