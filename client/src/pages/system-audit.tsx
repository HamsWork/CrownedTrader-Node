import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileCode2, Server, Database, Layout, FolderTree, Clock, Code2, Layers } from "lucide-react";
import { format } from "date-fns";

type AuditFile = {
  path: string;
  description: string;
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

type AuditData = {
  projectName: string;
  version: string;
  lastUpdated: string;
  totalFiles: number;
  totalLines: number;
  categories: Record<string, AuditCategory>;
  techStack: TechItem[];
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

export default function SystemAudit() {
  const { data, isLoading } = useQuery<AuditData>({
    queryKey: ["/api/audit"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Failed to load audit data. Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          System Audit
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Complete codebase overview, file descriptions, and last updated status
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project</div>
          <div className="text-xl font-bold mt-1" data-testid="text-project-name">{data.projectName}</div>
          <div className="text-xs text-muted-foreground mt-1">v{data.version}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source Files</div>
          <div className="text-xl font-bold mt-1" data-testid="text-total-files">{data.totalFiles}</div>
          <div className="text-xs text-muted-foreground mt-1">{data.totalLines.toLocaleString()} total lines</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Updated</div>
          <div className="text-xl font-bold mt-1" data-testid="text-last-updated">
            {format(new Date(data.lastUpdated), "MMM dd, yyyy")}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {format(new Date(data.lastUpdated), "HH:mm:ss")}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Tech Stack</h2>
        <div className="flex flex-wrap gap-2">
          {data.techStack.map((tech) => (
            <Badge
              key={tech.name}
              variant="outline"
              className="px-3 py-1 text-xs"
              data-testid={`badge-tech-${tech.name.toLowerCase().replace(/[\s./]/g, "-")}`}
            >
              <span className="font-medium">{tech.name}</span>
              <span className="text-muted-foreground ml-1.5">({tech.category})</span>
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Codebase Structure</h2>
        {Object.entries(data.categories).map(([catName, cat]) => {
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid={`table-${catName.toLowerCase().replace(/[\s/]/g, "-")}`}>
                  <thead>
                    <tr className="border-b border-border bg-muted/10">
                      <th className="text-left px-4 py-2 font-medium text-xs uppercase text-muted-foreground">File</th>
                      <th className="text-left px-4 py-2 font-medium text-xs uppercase text-muted-foreground">Description</th>
                      <th className="text-right px-4 py-2 font-medium text-xs uppercase text-muted-foreground w-20">Lines</th>
                      <th className="text-right px-4 py-2 font-medium text-xs uppercase text-muted-foreground w-40">Last Modified</th>
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
                        <td className="px-4 py-2.5">
                          <code className="text-xs font-mono bg-muted/50 px-1.5 py-0.5 rounded">{file.path}</code>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-muted-foreground">
                          {file.description}
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs font-mono text-muted-foreground">
                          {file.lines}
                        </td>
                        <td className="px-4 py-2.5 text-right">
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
