import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Film,
  BarChart3,
  MessageSquare,
  Search,
  BookOpen,
  Settings as SettingsIcon,
  LogOut,
  Loader2,
  Brain,
} from "lucide-react";
import Dashboard from "@/pages/dashboard";
import AdEngine from "@/pages/ad-engine";
import HumorScreener from "@/pages/humor-screener";
import CopyAssistant from "@/pages/copy-assistant";
import Research from "@/pages/research";
import KnowledgeBase from "@/pages/knowledge-base";
import SettingsPage from "@/pages/settings";
import IntelligenceCorePage from "@/pages/intelligence-core";
import vasLogo from "@/assets/images/vas-logo.png";

const navItems = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard", page: "dashboard" },
  { title: "Ad Engine", icon: Film, href: "/ad-engine", page: "ad-engine" },
  { title: "Humor Screener", icon: BarChart3, href: "/humor-screener", page: "humor-screener" },
  { title: "Copy Assistant", icon: MessageSquare, href: "/copy-assistant", page: "copy-assistant" },
  { title: "Research", icon: Search, href: "/research", page: "research" },
  { title: "Knowledge Base", icon: BookOpen, href: "/knowledge", page: "knowledge" },
  { title: "Intelligence", icon: Brain, href: "/intelligence", page: "intelligence" },
  { title: "Settings", icon: SettingsIcon, href: "/settings", page: "settings" },
];

const pageTitles: Record<string, string> = {
  dashboard: "DASHBOARD",
  "ad-engine": "AD ENGINE",
  "humor-screener": "HUMOR SCREENER",
  "copy-assistant": "COPY ASSISTANT",
  research: "RESEARCH",
  knowledge: "KNOWLEDGE BASE",
  intelligence: "INTELLIGENCE CORE",
  settings: "SETTINGS",
};

interface AppShellProps {
  page: string;
}

export default function AppShell({ page }: AppShellProps) {
  const { user, isLoading, logout } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [isLoading, user, setLocation]);

  useEffect(() => {
    const titles: Record<string, string> = {
      dashboard: "Dashboard | VAS",
      "ad-engine": "Ad Engine | VAS",
      "humor-screener": "Humor Screener | VAS",
      "copy-assistant": "Copy Assistant | VAS",
      research: "Research | VAS",
      knowledge: "Knowledge Base | VAS",
      intelligence: "Intelligence Core | VAS",
      settings: "Settings | VAS",
    };
    document.title = titles[page] || "VAS - Vector Analytical Systems";
  }, [page]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <Sidebar data-testid="sidebar">
          <SidebarContent>
            <div className="p-4 mb-2">
              <div className="flex items-center gap-2" data-testid="text-sidebar-logo">
                <img src={vasLogo} alt="VAS Logo" className="h-8 object-contain" />
                <h2 className="font-mono text-lg font-bold uppercase tracking-wider">
                  VAS
                </h2>
              </div>
            </div>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.page}>
                      <SidebarMenuButton
                        asChild
                        isActive={page === item.page}
                        data-testid={`nav-${item.page}`}
                      >
                        <Link href={item.href}>
                          <item.icon />
                          <span className="font-mono text-sm uppercase tracking-wide">
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <div className="mt-auto p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-mono text-sm font-bold">
                {user.displayName?.[0]?.toUpperCase() || user.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" data-testid="text-user-display">
                  {user.displayName || user.username}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.username}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span className="font-mono text-xs uppercase">Logout</span>
            </Button>
          </div>
        </Sidebar>
        <div className="flex flex-col flex-1">
          <header className="flex items-center gap-2 p-4 border-b border-border">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <h1 className="font-mono text-xl font-bold uppercase tracking-wide" data-testid="text-page-title">
              {pageTitles[page] || page.toUpperCase()}
            </h1>
          </header>
          <main className="flex-1 overflow-auto p-6" data-testid="main-content">
            <div data-testid={`page-${page}`}>
              {page === "dashboard" ? (
                <Dashboard />
              ) : page === "ad-engine" ? (
                <AdEngine />
              ) : page === "humor-screener" ? (
                <HumorScreener />
              ) : page === "copy-assistant" ? (
                <CopyAssistant />
              ) : page === "research" ? (
                <Research />
              ) : page === "knowledge" ? (
                <KnowledgeBase />
              ) : page === "intelligence" ? (
                <IntelligenceCorePage />
              ) : page === "settings" ? (
                <SettingsPage />
              ) : (
                <p className="text-muted-foreground font-mono text-sm">
                  {pageTitles[page] || page.toUpperCase()} content will appear here.
                </p>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
