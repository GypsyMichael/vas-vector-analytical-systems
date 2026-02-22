import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pin,
  Trash2,
  Search,
  Loader2,
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface KnowledgeEntry {
  id: number;
  title: string;
  content: string;
  category: string;
  source: string;
  confidence: number;
  tags: string[];
  isPinned: boolean;
}

interface ResearchQuery {
  id: number;
  queryText: string;
  status: string;
  resultsFound: number;
  knowledgeEntriesCreated: number;
  createdAt: string;
}

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "humor_style", label: "Humor Style" },
  { value: "audience_preference", label: "Audience Preference" },
  { value: "content_format", label: "Content Format" },
  { value: "trend", label: "Trend" },
  { value: "competitor_insight", label: "Competitor Insight" },
  { value: "product_insight", label: "Product Insight" },
];

const SOURCES = [
  { value: "all", label: "All Sources" },
  { value: "user_promoted", label: "User Promoted" },
  { value: "performance_data", label: "Performance Data" },
  { value: "web_research", label: "Web Research" },
  { value: "cross_tenant", label: "Cross Tenant" },
  { value: "youtube_research", label: "YouTube Research" },
];

function ConfidenceMeter({ value }: { value: number }) {
  const percentage = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 bg-muted rounded-sm overflow-hidden">
        <div
          className="h-full bg-industrial-blue rounded-sm transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="font-mono text-xs text-chrome-dim">{percentage}%</span>
    </div>
  );
}

function KnowledgeEntriesTab() {
  const { toast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const queryParams = new URLSearchParams();
  if (categoryFilter !== "all") queryParams.set("category", categoryFilter);
  if (sourceFilter !== "all") queryParams.set("source", sourceFilter);
  const queryString = queryParams.toString();
  const endpoint = `/api/knowledge/entries${queryString ? `?${queryString}` : ""}`;

  const { data: entriesData, isLoading } = useQuery<{ entries: KnowledgeEntry[] }>({
    queryKey: ["/api/knowledge/entries", categoryFilter, sourceFilter],
    queryFn: async () => {
      const res = await fetch(endpoint, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("vectoras-token") || ""}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load entries");
      return res.json();
    },
  });
  const entries = entriesData?.entries;

  const pinMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/knowledge/entries/${id}/pin`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/entries"] });
      toast({ title: "Pin status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update pin", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/knowledge/entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/entries"] });
      toast({ title: "Entry deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-category-filter">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value} data-testid={`option-category-${cat.value}`}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-source-filter">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            {SOURCES.map((src) => (
              <SelectItem key={src.value} value={src.value} data-testid={`option-source-${src.value}`}>
                {src.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !entries || entries.length === 0 ? (
        <Card className="p-6">
          <p className="text-chrome-dim font-mono text-sm text-center">
            No knowledge entries found.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id} className="p-4" data-testid={`card-entry-${entry.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {entry.isPinned && (
                      <Pin className="h-3 w-3 text-industrial-blue" />
                    )}
                    <span className="font-mono text-sm font-bold truncate" data-testid={`text-entry-title-${entry.id}`}>
                      {entry.title}
                    </span>
                  </div>
                  <p className="text-sm text-chrome-dim line-clamp-2 mb-2" data-testid={`text-entry-content-${entry.id}`}>
                    {entry.content}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge variant="secondary" data-testid={`badge-entry-category-${entry.id}`}>
                      {entry.category}
                    </Badge>
                    <Badge variant="outline" data-testid={`badge-entry-source-${entry.id}`}>
                      {entry.source}
                    </Badge>
                    {entry.tags?.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs" data-testid={`badge-entry-tag-${entry.id}-${idx}`}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="w-48">
                    <ConfidenceMeter value={entry.confidence} />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant={entry.isPinned ? "default" : "ghost"}
                    onClick={() => pinMutation.mutate(entry.id)}
                    disabled={pinMutation.isPending}
                    data-testid={`button-pin-entry-${entry.id}`}
                  >
                    <Pin className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(entry.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-entry-${entry.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ResearchQueriesTab() {
  const { toast } = useToast();
  const [queryText, setQueryText] = useState("");

  const { data: queriesData, isLoading } = useQuery<{ queries: ResearchQuery[] }>({
    queryKey: ["/api/knowledge/queries"],
  });
  const queries = queriesData?.queries;

  const researchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/knowledge/research", {
        query: queryText,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/queries"] });
      toast({ title: "Research query submitted" });
      setQueryText("");
    },
    onError: (error: Error) => {
      toast({ title: "Research failed", description: error.message, variant: "destructive" });
    },
  });

  function getStatusIcon(status: string) {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-3 w-3" />;
      case "pending":
      case "processing":
        return <Clock className="h-3 w-3" />;
      case "failed":
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  }

  function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "completed":
        return "default";
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="font-mono text-sm uppercase tracking-wide text-chrome-dim mb-4">
          New Research Query
        </h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[250px]">
            <label className="font-mono text-xs uppercase tracking-wide text-chrome-dim mb-1 block">
              Research what kind of ads work for...
            </label>
            <Input
              data-testid="input-research-query"
              placeholder="e.g. fitness supplements targeting millennials"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
            />
          </div>
          <Button
            data-testid="button-submit-research"
            onClick={() => researchMutation.mutate()}
            disabled={!queryText || researchMutation.isPending}
          >
            {researchMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Research
          </Button>
        </div>
      </Card>

      <div>
        <h3 className="font-mono text-sm uppercase tracking-wide text-chrome-dim mb-3">
          Past Queries
        </h3>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : !queries || queries.length === 0 ? (
          <Card className="p-6">
            <p className="text-chrome-dim font-mono text-sm text-center">
              No research queries yet.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {queries.map((q) => (
              <Card key={q.id} className="p-4" data-testid={`card-query-${q.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-bold mb-1" data-testid={`text-query-text-${q.id}`}>
                      {q.queryText}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant={getStatusVariant(q.status)} data-testid={`badge-query-status-${q.id}`}>
                        {getStatusIcon(q.status)}
                        <span className="ml-1">{q.status}</span>
                      </Badge>
                      <span className="font-mono text-xs text-chrome-dim" data-testid={`text-results-found-${q.id}`}>
                        Results: {q.resultsFound}
                      </span>
                      <span className="font-mono text-xs text-chrome-dim" data-testid={`text-entries-created-${q.id}`}>
                        Entries Created: {q.knowledgeEntriesCreated}
                      </span>
                      <span className="font-mono text-xs text-chrome-dim" data-testid={`text-query-date-${q.id}`}>
                        {new Date(q.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type KnowledgeTab = "entries" | "research";

export default function KnowledgeBase() {
  const [activeTab, setActiveTab] = useState<KnowledgeTab>("entries");

  return (
    <div className="space-y-6">
      <div className="flex gap-2" data-testid="knowledge-tabs">
        <Button
          variant={activeTab === "entries" ? "default" : "secondary"}
          onClick={() => setActiveTab("entries")}
          data-testid="tab-entries"
          className="toggle-elevate"
        >
          <BookOpen className="h-4 w-4 mr-2" />
          <span className="font-mono text-xs uppercase">Knowledge Entries</span>
        </Button>
        <Button
          variant={activeTab === "research" ? "default" : "secondary"}
          onClick={() => setActiveTab("research")}
          data-testid="tab-research"
          className="toggle-elevate"
        >
          <Search className="h-4 w-4 mr-2" />
          <span className="font-mono text-xs uppercase">Research</span>
        </Button>
      </div>

      {activeTab === "entries" && (
        <div>
          <h2 className="font-mono text-lg font-bold uppercase tracking-wide mb-4" data-testid="header-knowledge-base">
            Knowledge Base
          </h2>
          <KnowledgeEntriesTab />
        </div>
      )}

      {activeTab === "research" && (
        <div>
          <h2 className="font-mono text-lg font-bold uppercase tracking-wide mb-4" data-testid="header-research-queries">
            Research Queries
          </h2>
          <ResearchQueriesTab />
        </div>
      )}
    </div>
  );
}
