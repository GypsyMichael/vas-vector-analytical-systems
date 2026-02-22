import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Loader2,
  Plus,
  TrendingUp,
  Eye,
  ThumbsUp,
  MessageSquare,
  Share2,
  Lightbulb,
  AlertTriangle,
  Target,
} from "lucide-react";
import type { HumorPerformance, HumorBenchmark } from "@shared/schema";

const HUMOR_CATEGORIES = [
  { id: "girlfriend_expensive", name: "Girlfriend Expensive" },
  { id: "wife_expensive", name: "Wife Expensive" },
  { id: "kids_expensive", name: "Kids Expensive" },
  { id: "walletus_maximus", name: "Walletus Maximus" },
  { id: "bluechew_wallet", name: "BlueChew Wallet" },
  { id: "buddy_got_raise", name: "Buddy Got a Raise" },
  { id: "broke_boys", name: "Broke Boys" },
  { id: "bar_stool_economics", name: "Bar Stool Economics" },
  { id: "chrome_addiction", name: "Chrome Addiction" },
  { id: "cubicle_vs_contractor", name: "Cubicle vs Contractor" },
];

const PLATFORMS = [
  { id: "youtube_shorts", name: "YouTube Shorts" },
  { id: "tiktok", name: "TikTok" },
  { id: "instagram_reels", name: "Instagram Reels" },
];

const performanceFormSchema = z.object({
  humorCategory: z.string().min(1, "Category is required"),
  title: z.string().min(1, "Title is required"),
  platform: z.string().min(1, "Platform is required"),
  views: z.coerce.number().min(0).default(0),
  likes: z.coerce.number().min(0).default(0),
  comments: z.coerce.number().min(0).default(0),
  shares: z.coerce.number().min(0).default(0),
  setupDuration: z.coerce.number().min(0).optional(),
  punchlineTiming: z.coerce.number().min(0).optional(),
  deliveryPaceWps: z.coerce.number().min(0).optional(),
  toneArc: z.string().optional(),
  notes: z.string().optional(),
});

type PerformanceFormValues = z.infer<typeof performanceFormSchema>;

const benchmarkFormSchema = z.object({
  creatorName: z.string().min(1, "Creator name is required"),
  creatorHandle: z.string().optional(),
  platform: z.string().min(1, "Platform is required"),
  humorStyle: z.string().min(1, "Humor style is required"),
  videoUrl: z.string().optional(),
  videoTitle: z.string().optional(),
  views: z.coerce.number().min(0).default(0),
  likes: z.coerce.number().min(0).default(0),
  comments: z.coerce.number().min(0).default(0),
  engagementRate: z.coerce.number().min(0).default(0),
  whatWorked: z.string().optional(),
  toneNotes: z.string().optional(),
});

type BenchmarkFormValues = z.infer<typeof benchmarkFormSchema>;

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatRate(rate: number | null | undefined): string {
  if (rate == null) return "0.00%";
  return `${rate.toFixed(2)}%`;
}

function getCategoryName(id: string): string {
  return HUMOR_CATEGORIES.find((c) => c.id === id)?.name || id;
}

function getPlatformName(id: string): string {
  return PLATFORMS.find((p) => p.id === id)?.name || id;
}

function RecordPerformanceTab() {
  const { toast } = useToast();

  const form = useForm<PerformanceFormValues>({
    resolver: zodResolver(performanceFormSchema),
    defaultValues: {
      humorCategory: "",
      title: "",
      platform: "",
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      setupDuration: undefined,
      punchlineTiming: undefined,
      deliveryPaceWps: undefined,
      toneArc: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PerformanceFormValues) => {
      const payload: Record<string, unknown> = { ...data };
      if (data.views > 0) {
        payload.engagementRate =
          ((data.likes + data.comments + data.shares) / data.views) * 100;
      }
      const res = await apiRequest("POST", "/api/humor-screener/performance", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Performance recorded", description: "Data saved successfully." });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/humor-screener/performance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/humor-screener/analytics"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function onSubmit(data: PerformanceFormValues) {
    createMutation.mutate(data);
  }

  return (
    <div>
      <h2 className="font-mono text-lg font-bold uppercase tracking-wider mb-4" data-testid="text-record-header">
        RECORD PERFORMANCE
      </h2>
      <Card className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="humorCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-humor-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HUMOR_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id} data-testid={`option-category-${cat.id}`}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">Platform</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-platform">
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PLATFORMS.map((p) => (
                          <SelectItem key={p.id} value={p.id} data-testid={`option-platform-${p.id}`}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase">Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ad title" data-testid="input-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="views"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">Views</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-views" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="likes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">Likes</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-likes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">Comments</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-comments" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shares"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">Shares</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-shares" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="setupDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">Setup Duration (s)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} value={field.value ?? ""} data-testid="input-setup-duration" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="punchlineTiming"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">Punchline Timing (s)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} value={field.value ?? ""} data-testid="input-punchline-timing" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deliveryPaceWps"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">Delivery Pace (WPS)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} value={field.value ?? ""} data-testid="input-delivery-pace" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="toneArc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase">Tone Arc</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. deadpan → escalation → absurd" data-testid="input-tone-arc" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase">Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Additional notes..." className="resize-none" data-testid="input-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-performance">
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              RECORD PERFORMANCE
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
}

function PerformanceListTab() {
  const [categoryFilter, setCategoryFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");

  const queryParams = new URLSearchParams();
  if (categoryFilter) queryParams.set("category", categoryFilter);
  if (platformFilter) queryParams.set("platform", platformFilter);
  queryParams.set("sort", "engagement");
  const queryString = queryParams.toString();

  const { data, isLoading } = useQuery<{ performances: HumorPerformance[] }>({
    queryKey: ["/api/humor-screener/performance", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/humor-screener/performance?${queryString}`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("vectoras-token")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch performance records");
      return res.json();
    },
  });

  const records = data?.performances || [];

  return (
    <div>
      <h2 className="font-mono text-lg font-bold uppercase tracking-wider mb-4" data-testid="text-performance-header">
        PERFORMANCE RECORDS
      </h2>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48" data-testid="filter-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {HUMOR_CATEGORIES.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-48" data-testid="filter-platform">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <Card className="p-6">
          <p className="text-muted-foreground font-mono text-sm" data-testid="text-no-records">
            No performance records found. Record your first ad performance above.
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Table data-testid="table-performance">
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-xs uppercase">Title</TableHead>
                <TableHead className="font-mono text-xs uppercase">Category</TableHead>
                <TableHead className="font-mono text-xs uppercase">Platform</TableHead>
                <TableHead className="font-mono text-xs uppercase text-right">Views</TableHead>
                <TableHead className="font-mono text-xs uppercase text-right">Likes</TableHead>
                <TableHead className="font-mono text-xs uppercase text-right">Eng. Rate</TableHead>
                <TableHead className="font-mono text-xs uppercase">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((rec, idx) => (
                <TableRow key={rec.id} data-testid={`row-performance-${idx}`}>
                  <TableCell className="font-mono text-sm">{rec.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {getCategoryName(rec.humorCategory)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {getPlatformName(rec.platform)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatNumber(rec.views)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatNumber(rec.likes)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-industrial-blue">
                    {formatRate(rec.engagementRate)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString() : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function BenchmarksTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creatorFilter, setCreatorFilter] = useState("");
  const [styleFilter, setStyleFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");

  const queryParams = new URLSearchParams();
  if (creatorFilter) queryParams.set("creator", creatorFilter);
  if (styleFilter) queryParams.set("style", styleFilter);
  if (platformFilter) queryParams.set("platform", platformFilter);
  const queryString = queryParams.toString();

  const { data, isLoading } = useQuery<{ benchmarks: HumorBenchmark[] }>({
    queryKey: ["/api/humor-screener/benchmarks", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/humor-screener/benchmarks?${queryString}`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("vectoras-token")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch benchmarks");
      return res.json();
    },
  });

  const benchmarks = data?.benchmarks || [];

  const form = useForm<BenchmarkFormValues>({
    resolver: zodResolver(benchmarkFormSchema),
    defaultValues: {
      creatorName: "",
      creatorHandle: "",
      platform: "",
      humorStyle: "",
      videoUrl: "",
      videoTitle: "",
      views: 0,
      likes: 0,
      comments: 0,
      engagementRate: 0,
      whatWorked: "",
      toneNotes: "",
    },
  });

  const createBenchmarkMutation = useMutation({
    mutationFn: async (data: BenchmarkFormValues) => {
      const res = await apiRequest("POST", "/api/humor-screener/benchmarks", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Benchmark added", description: "Competitor benchmark saved." });
      form.reset();
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/humor-screener/benchmarks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/humor-screener/analytics"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-mono text-lg font-bold uppercase tracking-wider" data-testid="text-benchmarks-header">
          COMPETITOR BENCHMARKS
        </h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-benchmark">
              <Plus className="mr-2 h-4 w-4" />
              ADD BENCHMARK
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-mono uppercase">Add Competitor Benchmark</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => createBenchmarkMutation.mutate(data))}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="creatorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs uppercase">Creator Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Creator name" data-testid="input-creator-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="creatorHandle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs uppercase">Handle</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="@handle" data-testid="input-creator-handle" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="platform"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs uppercase">Platform</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-benchmark-platform">
                              <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PLATFORMS.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="humorStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs uppercase">Humor Style</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. deadpan, sarcastic" data-testid="input-humor-style" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="videoTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase">Video Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Video title" data-testid="input-video-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="videoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase">Video URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://..." data-testid="input-video-url" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="views"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs uppercase">Views</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-benchmark-views" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="likes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs uppercase">Likes</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-benchmark-likes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="comments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs uppercase">Comments</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-benchmark-comments" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="engagementRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs uppercase">Eng. Rate %</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} data-testid="input-benchmark-engagement" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="whatWorked"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase">What Worked</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Why this performed well..." className="resize-none" data-testid="input-what-worked" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="toneNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase">Tone Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Tone and style notes..." className="resize-none" data-testid="input-tone-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={createBenchmarkMutation.isPending}
                  className="w-full"
                  data-testid="button-submit-benchmark"
                >
                  {createBenchmarkMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  SAVE BENCHMARK
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Input
          placeholder="Filter by creator..."
          value={creatorFilter}
          onChange={(e) => setCreatorFilter(e.target.value)}
          className="w-48"
          data-testid="filter-benchmark-creator"
        />
        <Input
          placeholder="Filter by style..."
          value={styleFilter}
          onChange={(e) => setStyleFilter(e.target.value)}
          className="w-48"
          data-testid="filter-benchmark-style"
        />
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-48" data-testid="filter-benchmark-platform">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : benchmarks.length === 0 ? (
        <Card className="p-6">
          <p className="text-muted-foreground font-mono text-sm" data-testid="text-no-benchmarks">
            No benchmarks found. Add your first competitor benchmark.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {benchmarks.map((bm, idx) => (
            <Card key={bm.id} className="p-4" data-testid={`card-benchmark-${idx}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold" data-testid={`text-benchmark-creator-${idx}`}>
                      {bm.creatorName}
                    </span>
                    {bm.creatorHandle && (
                      <span className="text-muted-foreground font-mono text-xs">
                        {bm.creatorHandle}
                      </span>
                    )}
                    <Badge variant="secondary" className="font-mono text-xs">
                      {getPlatformName(bm.platform)}
                    </Badge>
                    <Badge variant="outline" className="font-mono text-xs">
                      {bm.humorStyle}
                    </Badge>
                  </div>
                  {bm.videoTitle && (
                    <p className="text-sm text-muted-foreground truncate">{bm.videoTitle}</p>
                  )}
                </div>
                <div className="flex items-center gap-4 font-mono text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" />
                    <span>{formatNumber(bm.views)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    <span>{formatNumber(bm.likes)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-industrial-blue font-bold">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>{formatRate(bm.engagementRate)}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface AnalyticsData {
  totalRecords: number;
  categoryBreakdown: Record<string, { count: number; avgEngagement: number; totalViews: number; totalLikes: number }>;
  platformBreakdown: Record<string, { count: number; avgEngagement: number; totalViews: number }>;
  topPerformers: HumorPerformance[];
  topBenchmarks: HumorBenchmark[];
  aiSuggestions: { suggestions: string[]; topOpportunities: string[]; warnings: string[] };
}

function AnalyticsTab() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/humor-screener/analytics"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground font-mono text-sm" data-testid="text-no-analytics">
          No analytics data available. Record some performance data first.
        </p>
      </Card>
    );
  }

  const categoryChartData = Object.entries(data.categoryBreakdown || {})
    .map(([category, stats]) => ({
      name: getCategoryName(category),
      engagement: Number(stats.avgEngagement?.toFixed(2) || 0),
    }))
    .sort((a, b) => b.engagement - a.engagement);

  const platformEntries = Object.entries(data.platformBreakdown || {});

  return (
    <div>
      <h2 className="font-mono text-lg font-bold uppercase tracking-wider mb-4" data-testid="text-analytics-header">
        ANALYTICS
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4" data-testid="card-category-rankings">
          <h3 className="font-mono text-sm font-bold uppercase mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-industrial-blue" />
            CATEGORY RANKINGS
          </h3>
          {categoryChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11, fontFamily: "monospace" }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fontFamily: "monospace" }}
                  width={130}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(215 13% 19%)",
                    border: "1px solid hsl(213 10% 25%)",
                    borderRadius: "2px",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    color: "hsl(220 10% 92%)",
                  }}
                  formatter={(value: number) => [`${value}%`, "Avg Engagement"]}
                />
                <Bar dataKey="engagement" radius={[0, 2, 2, 0]}>
                  {categoryChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? "hsl(145 62% 57%)" : "hsl(213 62% 57%)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground font-mono text-xs">No category data yet.</p>
          )}
        </Card>

        <Card className="p-4" data-testid="card-top-performers">
          <h3 className="font-mono text-sm font-bold uppercase mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-industrial-blue" />
            TOP PERFORMERS
          </h3>
          {data.topPerformers?.length > 0 ? (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {data.topPerformers.slice(0, 10).map((perf, idx) => (
                <div
                  key={perf.id}
                  className="flex items-center justify-between gap-2 py-1.5 border-b border-border last:border-b-0"
                  data-testid={`row-top-performer-${idx}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground w-5 text-right shrink-0">
                      {idx + 1}.
                    </span>
                    <span className="font-mono text-sm truncate">{perf.title}</span>
                  </div>
                  <span className="font-mono text-xs text-industrial-blue shrink-0">
                    {formatRate(perf.engagementRate)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground font-mono text-xs">No performance data yet.</p>
          )}
        </Card>

        <Card className="p-4" data-testid="card-platform-breakdown">
          <h3 className="font-mono text-sm font-bold uppercase mb-3 flex items-center gap-2">
            <Share2 className="h-4 w-4 text-industrial-blue" />
            PLATFORM BREAKDOWN
          </h3>
          {platformEntries.length > 0 ? (
            <div className="space-y-3">
              {platformEntries.map(([platform, stats]) => {
                const maxViews = Math.max(
                  ...platformEntries.map(([, s]) => s.totalViews || 1)
                );
                const widthPct = ((stats.totalViews || 0) / maxViews) * 100;

                return (
                  <div key={platform} data-testid={`platform-stat-${platform}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-xs uppercase">
                        {getPlatformName(platform)}
                      </span>
                      <div className="flex items-center gap-3 font-mono text-xs">
                        <span className="text-muted-foreground">
                          {stats.count} ads
                        </span>
                        <span className="text-muted-foreground">
                          {formatNumber(stats.totalViews)} views
                        </span>
                        <span className="text-industrial-blue font-bold">
                          {stats.avgEngagement?.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-industrial-blue rounded-sm transition-all"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground font-mono text-xs">No platform data yet.</p>
          )}
        </Card>

        <Card className="p-4" data-testid="card-ai-suggestions">
          <h3 className="font-mono text-sm font-bold uppercase mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-warning-amber" />
            AI SUGGESTIONS
          </h3>
          {data.aiSuggestions ? (
            <div className="space-y-3 max-h-[280px] overflow-y-auto">
              {data.aiSuggestions.suggestions?.map((s, idx) => (
                <div key={idx} className="flex items-start gap-2" data-testid={`suggestion-${idx}`}>
                  <Lightbulb className="h-3.5 w-3.5 text-industrial-blue mt-0.5 shrink-0" />
                  <span className="font-mono text-xs">{s}</span>
                </div>
              ))}
              {data.aiSuggestions.topOpportunities?.map((o, idx) => (
                <div key={`opp-${idx}`} className="flex items-start gap-2" data-testid={`opportunity-${idx}`}>
                  <Target className="h-3.5 w-3.5 text-success-green mt-0.5 shrink-0" />
                  <span className="font-mono text-xs">{o}</span>
                </div>
              ))}
              {data.aiSuggestions.warnings?.map((w, idx) => (
                <div key={`warn-${idx}`} className="flex items-start gap-2" data-testid={`warning-${idx}`}>
                  <AlertTriangle className="h-3.5 w-3.5 text-warning-amber mt-0.5 shrink-0" />
                  <span className="font-mono text-xs">{w}</span>
                </div>
              ))}
              {!data.aiSuggestions.suggestions?.length &&
                !data.aiSuggestions.topOpportunities?.length &&
                !data.aiSuggestions.warnings?.length && (
                  <p className="text-muted-foreground font-mono text-xs">
                    Record more data to unlock AI suggestions.
                  </p>
                )}
            </div>
          ) : (
            <p className="text-muted-foreground font-mono text-xs">
              No AI suggestions available yet.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function HumorScreener() {
  return (
    <Tabs defaultValue="record" className="w-full" data-testid="humor-screener-tabs">
      <TabsList className="font-mono" data-testid="tabs-list">
        <TabsTrigger value="record" className="font-mono text-xs uppercase" data-testid="tab-record">
          Record
        </TabsTrigger>
        <TabsTrigger value="performance" className="font-mono text-xs uppercase" data-testid="tab-performance">
          Performance
        </TabsTrigger>
        <TabsTrigger value="benchmarks" className="font-mono text-xs uppercase" data-testid="tab-benchmarks">
          Benchmarks
        </TabsTrigger>
        <TabsTrigger value="analytics" className="font-mono text-xs uppercase" data-testid="tab-analytics">
          Analytics
        </TabsTrigger>
      </TabsList>

      <TabsContent value="record">
        <RecordPerformanceTab />
      </TabsContent>
      <TabsContent value="performance">
        <PerformanceListTab />
      </TabsContent>
      <TabsContent value="benchmarks">
        <BenchmarksTab />
      </TabsContent>
      <TabsContent value="analytics">
        <AnalyticsTab />
      </TabsContent>
    </Tabs>
  );
}
