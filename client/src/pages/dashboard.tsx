import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Megaphone,
  TrendingUp,
  Activity,
  Film,
  BarChart3,
  MessageSquare,
  Search,
  Server,
} from "lucide-react";

interface DashboardStats {
  totalScripts: number;
  totalCampaigns: number;
  totalPerformance: number;
}

const statCards = [
  { key: "totalScripts", label: "Total Scripts", icon: FileText },
  { key: "totalCampaigns", label: "Total Campaigns", icon: Megaphone },
  { key: "totalPerformance", label: "Performance Records", icon: TrendingUp },
] as const;

const quickActions = [
  { label: "Generate Ad", href: "/ad-engine", icon: Film },
  { label: "Track Performance", href: "/humor-screener", icon: BarChart3 },
  { label: "Write Copy", href: "/copy-assistant", icon: MessageSquare },
  { label: "Research", href: "/research", icon: Search },
];

function StatCardSkeleton() {
  return (
    <div className="bg-steel-surface border border-steel-border rounded-sm p-6">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-9 w-16" />
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery<{ stats: DashboardStats }>({
    queryKey: ["/api/studio/dashboard"],
  });

  return (
    <div className="space-y-8">
      <div>
        <h2
          className="font-mono text-2xl font-bold uppercase tracking-wider text-chrome-text"
          data-testid="text-dashboard-title"
        >
          DASHBOARD
        </h2>
        <p
          className="font-mono text-sm text-chrome-dim mt-1"
          data-testid="text-dashboard-subtitle"
        >
          Command Center
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : (
            <>
              {statCards.map((card) => {
                const Icon = card.icon;
                const value = data?.stats?.[card.key] ?? 0;
                return (
                  <div
                    key={card.key}
                    className="bg-steel-surface border border-steel-border rounded-sm p-6"
                    data-testid={`stat-card-${card.key}`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="h-4 w-4 text-chrome-dim" />
                      <span className="text-chrome-dim font-mono uppercase text-xs tracking-wide">
                        {card.label}
                      </span>
                    </div>
                    <p
                      className="text-3xl font-mono text-chrome-text"
                      data-testid={`stat-value-${card.key}`}
                    >
                      {value}
                    </p>
                  </div>
                );
              })}
              <div
                className="bg-steel-surface border border-steel-border rounded-sm p-6"
                data-testid="stat-card-systemStatus"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4 text-chrome-dim" />
                  <span className="text-chrome-dim font-mono uppercase text-xs tracking-wide">
                    System Status
                  </span>
                </div>
                <p
                  className="text-3xl font-mono text-success-green"
                  data-testid="stat-value-systemStatus"
                >
                  OPERATIONAL
                </p>
              </div>
            </>
          )}
      </div>

      <div>
        <h3 className="font-mono text-sm uppercase tracking-wider text-chrome-dim mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                data-testid={`action-${action.href.slice(1)}`}
              >
                <div className="bg-steel-surface hover-elevate border border-steel-border rounded-sm p-4 flex items-center gap-3 cursor-pointer">
                  <Icon className="h-5 w-5 text-industrial-blue" />
                  <span className="font-mono text-sm text-chrome-text uppercase tracking-wide">
                    {action.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="font-mono text-sm uppercase tracking-wider text-chrome-dim mb-4">
          Recent Activity
        </h3>
        <div
          className="bg-steel-surface border border-steel-border rounded-sm p-6"
          data-testid="section-recent-activity"
        >
          <p className="text-chrome-dim font-mono text-sm">No recent activity</p>
        </div>
      </div>

      <div>
        <h3 className="font-mono text-sm uppercase tracking-wider text-chrome-dim mb-4">
          System Info
        </h3>
        <div
          className="bg-steel-surface border border-steel-border rounded-sm p-4 flex items-center gap-4 flex-wrap"
          data-testid="section-system-info"
        >
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-chrome-dim" />
            <span
              className="font-mono text-xs text-chrome-text"
              data-testid="text-app-version"
            >
              VAS v1.0
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success-green inline-block" />
            <span
              className="font-mono text-xs text-chrome-dim"
              data-testid="text-uptime-status"
            >
              Systems Online
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
