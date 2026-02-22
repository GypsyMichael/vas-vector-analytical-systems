import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Plus,
  Database,
  Brain,
  Activity,
  Target,
  Radio,
  TrendingUp,
  AlertTriangle,
  Compass,
  Zap,
  Search,
} from "lucide-react";

interface Dataset {
  id: string;
  name: string;
  datasetType: string;
  description: string | null;
  targetMetricName: string | null;
  recordCount?: number;
  lastTrainedAt: string | null;
  createdAt: string;
}

interface SignalSource {
  name: string;
  layer: number;
  description: string;
  updateFrequency: string;
}

interface TrainingResult {
  rSquared: number;
  mae: number;
  tierAccuracy: number;
  directionalAccuracy: number;
  trainSampleCount: number;
  testSampleCount: number;
}

interface PredictionResult {
  predictedValue: number;
  predictedTier: string;
  confidence: number;
  snapshotId: string;
}

interface AMIResult {
  ami: number;
  stage: string;
  confidence: number;
  components: {
    culturalSpike: number;
    searchAcceleration: number;
    marketplace: number;
    media: number;
  };
  keyword: string;
}

interface DriftResult {
  driftDetected: boolean;
  driftType: string;
  severity: string;
  recommendation: string;
  details?: Record<string, unknown>;
}

interface ExplorationResult {
  action: string;
  epsilon: number;
  strategy: string;
  reasoning: string;
}

const LAYER_COLORS: Record<number, string> = {
  1: "bg-blue-600 text-white",
  2: "bg-yellow-600 text-white",
  3: "bg-green-600 text-white",
  4: "bg-purple-600 text-white",
  5: "bg-orange-600 text-white",
  6: "bg-red-600 text-white",
};

const FEATURE_NAMES = [
  "hookStrength",
  "visualComplexity",
  "paceScore",
  "humorDensity",
  "ctaClarity",
  "emotionalArc",
  "productVisibility",
  "audioEnergy",
  "textOverlayDensity",
  "sceneCutRate",
  "facialPresence",
  "brandMentions",
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

function OverviewTab() {
  const { data: datasetsData, isLoading: datasetsLoading } = useQuery<{ datasets: Dataset[] }>({
    queryKey: ["/api/intelligence/datasets"],
  });

  const { data: sourcesData, isLoading: sourcesLoading } = useQuery<{ sources: SignalSource[] }>({
    queryKey: ["/api/intelligence/signals/sources"],
  });

  const datasets = datasetsData?.datasets || [];
  const sources = sourcesData?.sources || [];
  const totalDatasets = datasets.length;
  const activeModels = datasets.filter((d) => d.lastTrainedAt !== null).length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {datasetsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <div
              className="bg-steel-surface border border-steel-border rounded-sm p-6"
              data-testid="stat-card-totalDatasets"
            >
              <div className="flex items-center gap-2 mb-3">
                <Database className="h-4 w-4 text-chrome-dim" />
                <span className="text-chrome-dim font-mono uppercase text-xs tracking-wide">
                  Total Datasets
                </span>
              </div>
              <p className="text-3xl font-mono text-chrome-text" data-testid="stat-value-totalDatasets">
                {totalDatasets}
              </p>
            </div>
            <div
              className="bg-steel-surface border border-steel-border rounded-sm p-6"
              data-testid="stat-card-activeModels"
            >
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-4 w-4 text-chrome-dim" />
                <span className="text-chrome-dim font-mono uppercase text-xs tracking-wide">
                  Active Models
                </span>
              </div>
              <p className="text-3xl font-mono text-chrome-text" data-testid="stat-value-activeModels">
                {activeModels}
              </p>
            </div>
            <div
              className="bg-steel-surface border border-steel-border rounded-sm p-6"
              data-testid="stat-card-totalPredictions"
            >
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-chrome-dim" />
                <span className="text-chrome-dim font-mono uppercase text-xs tracking-wide">
                  Total Predictions
                </span>
              </div>
              <p className="text-3xl font-mono text-chrome-text" data-testid="stat-value-totalPredictions">
                —
              </p>
            </div>
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
              <Badge variant="secondary" className="bg-green-600/20 text-green-400 font-mono text-xs" data-testid="badge-system-status">
                OPERATIONAL
              </Badge>
            </div>
          </>
        )}
      </div>

      <div>
        <h3 className="font-mono text-sm uppercase tracking-wider text-chrome-dim mb-4">
          Registered Signal Sources
        </h3>
        {sourcesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : sources.length === 0 ? (
          <div className="bg-steel-surface border border-steel-border rounded-sm p-6" data-testid="text-no-sources">
            <p className="text-chrome-dim font-mono text-sm">No signal sources registered.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sources.map((source, idx) => (
              <div
                key={source.name}
                className="bg-steel-surface border border-steel-border rounded-sm p-4"
                data-testid={`card-signal-source-${idx}`}
              >
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-sm text-chrome-text uppercase tracking-wide">
                    {source.name}
                  </span>
                  <Badge
                    variant="secondary"
                    className={`font-mono text-xs ${LAYER_COLORS[source.layer] || "bg-muted text-muted-foreground"}`}
                  >
                    Layer {source.layer}
                  </Badge>
                </div>
                <p className="text-chrome-dim font-mono text-xs mb-1">{source.description}</p>
                <p className="text-chrome-muted font-mono text-xs">
                  Update: {source.updateFrequency}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DatasetsTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [trainingResults, setTrainingResults] = useState<Record<string, TrainingResult>>({});

  const { data, isLoading } = useQuery<{ datasets: Dataset[] }>({
    queryKey: ["/api/intelligence/datasets"],
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const datasets = data?.datasets || [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/intelligence/datasets", {
        name: newName,
        datasetType: newType,
        description: newDescription || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Dataset created", description: "New dataset registered." });
      setDialogOpen(false);
      setNewName("");
      setNewType("");
      setNewDescription("");
      queryClient.invalidateQueries({ queryKey: ["/api/intelligence/datasets"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const trainMutation = useMutation({
    mutationFn: async (datasetId: string) => {
      const res = await apiRequest("POST", `/api/intelligence/train/${datasetId}`);
      return res.json();
    },
    onSuccess: (data: { metrics: TrainingResult }, datasetId: string) => {
      toast({ title: "Training complete", description: "Model trained successfully." });
      setTrainingResults((prev) => ({ ...prev, [datasetId]: data.metrics }));
      queryClient.invalidateQueries({ queryKey: ["/api/intelligence/datasets"] });
    },
    onError: (err: Error) => {
      toast({ title: "Training failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-lg font-bold uppercase tracking-wider" data-testid="text-datasets-header">
          DATASETS
        </h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-dataset">
              <Plus className="mr-2 h-4 w-4" />
              CREATE DATASET
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-mono uppercase">Create Dataset</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="font-mono text-xs uppercase text-chrome-dim block mb-1">Name</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Dataset name"
                  data-testid="input-dataset-name"
                />
              </div>
              <div>
                <label className="font-mono text-xs uppercase text-chrome-dim block mb-1">Type</label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger data-testid="select-dataset-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video_ad_performance">Video Ad Performance</SelectItem>
                    <SelectItem value="humor_engagement">Humor Engagement</SelectItem>
                    <SelectItem value="market_signal">Market Signal</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="font-mono text-xs uppercase text-chrome-dim block mb-1">Description</label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description"
                  data-testid="input-dataset-description"
                />
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !newName || !newType}
                data-testid="button-submit-dataset"
              >
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                CREATE
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : datasets.length === 0 ? (
        <Card className="p-6">
          <p className="text-muted-foreground font-mono text-sm" data-testid="text-no-datasets">
            No datasets found. Create your first dataset to get started.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {datasets.map((ds) => (
            <div
              key={ds.id}
              className="bg-steel-surface border border-steel-border rounded-sm p-5"
              data-testid={`card-dataset-${ds.id}`}
            >
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <span className="font-mono text-sm text-chrome-text uppercase tracking-wide font-bold">
                  {ds.name}
                </span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {ds.datasetType}
                </Badge>
              </div>
              {ds.description && (
                <p className="text-chrome-dim font-mono text-xs mb-2">{ds.description}</p>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-chrome-muted mb-3">
                <span>Records: {ds.recordCount ?? "—"}</span>
                <span>Target: {ds.targetMetricName || "—"}</span>
                <span>
                  Trained: {ds.lastTrainedAt ? new Date(ds.lastTrainedAt).toLocaleDateString() : "Never"}
                </span>
                <span>Created: {new Date(ds.createdAt).toLocaleDateString()}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => trainMutation.mutate(ds.id)}
                disabled={trainMutation.isPending}
                data-testid={`button-train-${ds.id}`}
              >
                {trainMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                TRAIN
              </Button>
              {trainingResults[ds.id] && (
                <div className="mt-3 p-3 bg-background rounded-sm border border-steel-border">
                  <p className="font-mono text-xs uppercase text-chrome-dim mb-2">Training Results</p>
                  <div className="grid grid-cols-2 gap-1 text-xs font-mono text-chrome-text">
                    <span>R²: {trainingResults[ds.id].rSquared.toFixed(4)}</span>
                    <span>MAE: {trainingResults[ds.id].mae.toFixed(4)}</span>
                    <span>Tier Acc: {(trainingResults[ds.id].tierAccuracy * 100).toFixed(1)}%</span>
                    <span>Dir Acc: {(trainingResults[ds.id].directionalAccuracy * 100).toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PredictionsTab() {
  const { toast } = useToast();
  const [selectedDataset, setSelectedDataset] = useState("");
  const [features, setFeatures] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    FEATURE_NAMES.forEach((f) => (initial[f] = 0));
    return initial;
  });
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);

  const { data: datasetsData } = useQuery<{ datasets: Dataset[] }>({
    queryKey: ["/api/intelligence/datasets"],
  });

  const datasets = datasetsData?.datasets || [];

  const predictMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/intelligence/predict/${selectedDataset}`, { features });
      return res.json();
    },
    onSuccess: (data: PredictionResult) => {
      setPredictionResult(data);
      toast({ title: "Prediction generated", description: `Tier: ${data.predictedTier}` });
    },
    onError: (err: Error) => {
      toast({ title: "Prediction failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="font-mono text-lg font-bold uppercase tracking-wider" data-testid="text-predictions-header">
        NEW PREDICTION
      </h2>

      <div className="bg-steel-surface border border-steel-border rounded-sm p-5">
        <div className="mb-4">
          <label className="font-mono text-xs uppercase text-chrome-dim block mb-1">Dataset</label>
          <Select value={selectedDataset} onValueChange={setSelectedDataset}>
            <SelectTrigger data-testid="select-prediction-dataset">
              <SelectValue placeholder="Select dataset" />
            </SelectTrigger>
            <SelectContent>
              {datasets.map((ds) => (
                <SelectItem key={ds.id} value={ds.id}>
                  {ds.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="font-mono text-xs uppercase text-chrome-dim mb-3">Feature Inputs</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
          {FEATURE_NAMES.map((name) => (
            <div key={name}>
              <label className="font-mono text-xs text-chrome-muted block mb-1">{name}</label>
              <Input
                type="number"
                step="0.1"
                value={features[name]}
                onChange={(e) =>
                  setFeatures((prev) => ({ ...prev, [name]: parseFloat(e.target.value) || 0 }))
                }
                data-testid={`input-feature-${name}`}
              />
            </div>
          ))}
        </div>

        <Button
          onClick={() => predictMutation.mutate()}
          disabled={predictMutation.isPending || !selectedDataset}
          data-testid="button-predict"
        >
          {predictMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          PREDICT
        </Button>
      </div>

      {predictionResult && (
        <div className="bg-steel-surface border border-steel-border rounded-sm p-5" data-testid="prediction-result">
          <h3 className="font-mono text-sm uppercase tracking-wider text-chrome-dim mb-3">
            Prediction Result
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-chrome-muted font-mono text-xs block mb-1">Value</span>
              <p className="text-2xl font-mono text-chrome-text" data-testid="text-predicted-value">
                {predictionResult.predictedValue.toFixed(4)}
              </p>
            </div>
            <div>
              <span className="text-chrome-muted font-mono text-xs block mb-1">Tier</span>
              <Badge variant="secondary" className="font-mono text-xs" data-testid="badge-predicted-tier">
                {predictionResult.predictedTier}
              </Badge>
            </div>
            <div>
              <span className="text-chrome-muted font-mono text-xs block mb-1">Confidence</span>
              <p className="text-2xl font-mono text-industrial-blue" data-testid="text-confidence">
                {(predictionResult.confidence * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <span className="text-chrome-muted font-mono text-xs block mb-1">Snapshot ID</span>
              <p className="text-xs font-mono text-chrome-dim truncate" data-testid="text-snapshot-id">
                {predictionResult.snapshotId}
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-mono text-sm uppercase tracking-wider text-chrome-dim mb-4">
          Recent Predictions
        </h3>
        <div className="bg-steel-surface border border-steel-border rounded-sm p-6" data-testid="section-recent-predictions">
          <p className="text-chrome-dim font-mono text-sm">
            Recent prediction history will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}

function AMITrackerTab() {
  const { toast } = useToast();
  const [keyword, setKeyword] = useState("");
  const [amiResult, setAmiResult] = useState<AMIResult | null>(null);

  const amiMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", `/api/intelligence/ami/${encodeURIComponent(keyword)}`);
      return res.json();
    },
    onSuccess: (data: AMIResult) => {
      setAmiResult(data);
      toast({ title: "AMI computed", description: `Score: ${data.ami.toFixed(3)}` });
    },
    onError: (err: Error) => {
      toast({ title: "AMI computation failed", description: err.message, variant: "destructive" });
    },
  });

  const fetchSignalsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/intelligence/signals/fetch", { keyword });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Signals fetched", description: `Signals fetched for "${keyword}".` });
    },
    onError: (err: Error) => {
      toast({ title: "Signal fetch failed", description: err.message, variant: "destructive" });
    },
  });

  const stageBadgeColor: Record<string, string> = {
    early_noise: "bg-yellow-600/20 text-yellow-400",
    search_growth: "bg-blue-600/20 text-blue-400",
    buyer_interest: "bg-green-600/20 text-green-400",
    media_amplification: "bg-purple-600/20 text-purple-400",
  };

  return (
    <div className="space-y-6">
      <h2 className="font-mono text-lg font-bold uppercase tracking-wider" data-testid="text-ami-header">
        AMI TRACKER
      </h2>

      <div className="bg-steel-surface border border-steel-border rounded-sm p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-48">
            <label className="font-mono text-xs uppercase text-chrome-dim block mb-1">Keyword</label>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Enter keyword to analyze"
              data-testid="input-ami-keyword"
            />
          </div>
          <Button
            onClick={() => amiMutation.mutate()}
            disabled={amiMutation.isPending || !keyword}
            data-testid="button-compute-ami"
          >
            {amiMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            COMPUTE AMI
          </Button>
          <Button
            variant="secondary"
            onClick={() => fetchSignalsMutation.mutate()}
            disabled={fetchSignalsMutation.isPending || !keyword}
            data-testid="button-fetch-signals"
          >
            {fetchSignalsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            FETCH SIGNALS
          </Button>
        </div>
      </div>

      {amiResult && (
        <div className="space-y-4">
          <div className="bg-steel-surface border border-steel-border rounded-sm p-6" data-testid="ami-result">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <span className="text-chrome-muted font-mono text-xs block mb-2">AMI SCORE</span>
                <p className="text-5xl font-mono text-chrome-text font-bold" data-testid="text-ami-score">
                  {(amiResult.ami ?? 0).toFixed(3)}
                </p>
              </div>
              <div className="text-center">
                <span className="text-chrome-muted font-mono text-xs block mb-2">STAGE</span>
                <Badge
                  variant="secondary"
                  className={`font-mono text-xs ${stageBadgeColor[amiResult.stage] || ""}`}
                  data-testid="badge-ami-stage"
                >
                  {(amiResult.stage || "unknown").replace(/_/g, " ").toUpperCase()}
                </Badge>
              </div>
              <div className="text-center">
                <span className="text-chrome-muted font-mono text-xs block mb-2">CONFIDENCE</span>
                <Progress value={(amiResult.confidence ?? 0) * 100} className="mb-1" />
                <p className="font-mono text-xs text-chrome-dim" data-testid="text-ami-confidence">
                  {((amiResult.confidence ?? 0) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-steel-surface border border-steel-border rounded-sm p-5" data-testid="ami-components">
            <h3 className="font-mono text-sm uppercase tracking-wider text-chrome-dim mb-4">
              Component Breakdown
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-chrome-muted font-mono text-xs block mb-1">Cultural Spike</span>
                <p className="text-xl font-mono text-chrome-text">
                  {(amiResult.components?.culturalSpikeScore ?? 0).toFixed(3)}
                </p>
              </div>
              <div>
                <span className="text-chrome-muted font-mono text-xs block mb-1">Search Accel.</span>
                <p className="text-xl font-mono text-chrome-text">
                  {(amiResult.components?.searchAccelerationScore ?? 0).toFixed(3)}
                </p>
              </div>
              <div>
                <span className="text-chrome-muted font-mono text-xs block mb-1">Marketplace</span>
                <p className="text-xl font-mono text-chrome-text">
                  {(amiResult.components?.marketplaceRankDeltaScore ?? 0).toFixed(3)}
                </p>
              </div>
              <div>
                <span className="text-chrome-muted font-mono text-xs block mb-1">Media</span>
                <p className="text-xl font-mono text-chrome-text">
                  {(amiResult.components?.mediaAmplificationScore ?? 0).toFixed(3)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DriftExplorationTab() {
  const { toast } = useToast();
  const [selectedDataset, setSelectedDataset] = useState("");
  const [driftResult, setDriftResult] = useState<DriftResult | null>(null);
  const [explorationResult, setExplorationResult] = useState<ExplorationResult | null>(null);

  const { data: datasetsData } = useQuery<{ datasets: Dataset[] }>({
    queryKey: ["/api/intelligence/datasets"],
  });

  const datasets = datasetsData?.datasets || [];

  const driftQuery = useQuery<DriftResult>({
    queryKey: [`/api/intelligence/drift/${selectedDataset}`],
    enabled: !!selectedDataset,
  });

  const explorationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", `/api/intelligence/exploration/${selectedDataset}`);
      return res.json();
    },
    onSuccess: (data: ExplorationResult) => {
      setExplorationResult(data);
      toast({ title: "Exploration tested", description: `Strategy: ${data.strategy}` });
    },
    onError: (err: Error) => {
      toast({ title: "Exploration failed", description: err.message, variant: "destructive" });
    },
  });

  const drift = driftQuery.data;

  const severityColor: Record<string, string> = {
    low: "bg-green-600/20 text-green-400",
    medium: "bg-yellow-600/20 text-yellow-400",
    high: "bg-orange-600/20 text-orange-400",
    critical: "bg-red-600/20 text-red-400",
  };

  return (
    <div className="space-y-6">
      <h2 className="font-mono text-lg font-bold uppercase tracking-wider" data-testid="text-drift-header">
        DRIFT & EXPLORATION
      </h2>

      <div className="mb-4">
        <label className="font-mono text-xs uppercase text-chrome-dim block mb-1">Dataset</label>
        <Select value={selectedDataset} onValueChange={setSelectedDataset}>
          <SelectTrigger className="w-72" data-testid="select-drift-dataset">
            <SelectValue placeholder="Select dataset" />
          </SelectTrigger>
          <SelectContent>
            {datasets.map((ds) => (
              <SelectItem key={ds.id} value={ds.id}>
                {ds.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedDataset && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-steel-surface border border-steel-border rounded-sm p-5" data-testid="section-drift">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-chrome-dim" />
              <h3 className="font-mono text-sm uppercase tracking-wider text-chrome-dim">
                Drift Status
              </h3>
            </div>
            {driftQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : drift ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-chrome-muted">Detected:</span>
                  <Badge
                    variant="secondary"
                    className={`font-mono text-xs ${drift.driftDetected ? "bg-red-600/20 text-red-400" : "bg-green-600/20 text-green-400"}`}
                    data-testid="badge-drift-detected"
                  >
                    {drift.driftDetected ? "YES" : "NO"}
                  </Badge>
                </div>
                <div>
                  <span className="font-mono text-xs text-chrome-muted block">Type:</span>
                  <p className="font-mono text-sm text-chrome-text" data-testid="text-drift-type">
                    {drift.driftType || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-chrome-muted">Severity:</span>
                  <Badge
                    variant="secondary"
                    className={`font-mono text-xs ${severityColor[drift.severity] || ""}`}
                    data-testid="badge-drift-severity"
                  >
                    {(drift.severity || "—").toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <span className="font-mono text-xs text-chrome-muted block">Recommendation:</span>
                  <p className="font-mono text-xs text-chrome-dim" data-testid="text-drift-recommendation">
                    {drift.recommendation || "—"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-chrome-dim font-mono text-sm">No drift data available.</p>
            )}
          </div>

          <div className="bg-steel-surface border border-steel-border rounded-sm p-5" data-testid="section-exploration">
            <div className="flex items-center gap-2 mb-4">
              <Compass className="h-4 w-4 text-chrome-dim" />
              <h3 className="font-mono text-sm uppercase tracking-wider text-chrome-dim">
                Exploration
              </h3>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => explorationMutation.mutate()}
              disabled={explorationMutation.isPending}
              data-testid="button-test-exploration"
            >
              {explorationMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              TEST EXPLORATION
            </Button>
            {explorationResult && (
              <div className="mt-4 space-y-3">
                <div>
                  <span className="font-mono text-xs text-chrome-muted block">Epsilon</span>
                  <p className="text-2xl font-mono text-chrome-text" data-testid="text-epsilon">
                    {explorationResult.epsilon.toFixed(4)}
                  </p>
                </div>
                <div>
                  <span className="font-mono text-xs text-chrome-muted block">Strategy</span>
                  <Badge variant="secondary" className="font-mono text-xs" data-testid="badge-strategy">
                    {explorationResult.strategy}
                  </Badge>
                </div>
                <div>
                  <span className="font-mono text-xs text-chrome-muted block">Action</span>
                  <p className="font-mono text-sm text-chrome-text" data-testid="text-exploration-action">
                    {explorationResult.action}
                  </p>
                </div>
                <div>
                  <span className="font-mono text-xs text-chrome-muted block">Reasoning</span>
                  <p className="font-mono text-xs text-chrome-dim" data-testid="text-exploration-reasoning">
                    {explorationResult.reasoning}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function IntelligenceCorePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2
          className="font-mono text-2xl font-bold uppercase tracking-wider text-chrome-text"
          data-testid="text-intelligence-title"
        >
          INTELLIGENCE CORE
        </h2>
        <p
          className="font-mono text-sm text-chrome-dim mt-1"
          data-testid="text-intelligence-subtitle"
        >
          Multi-Layer Signal Intelligence System
        </p>
      </div>

      <Tabs defaultValue="overview" data-testid="tabs-intelligence">
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="overview" data-testid="tab-overview">OVERVIEW</TabsTrigger>
          <TabsTrigger value="datasets" data-testid="tab-datasets">DATASETS</TabsTrigger>
          <TabsTrigger value="predictions" data-testid="tab-predictions">PREDICTIONS</TabsTrigger>
          <TabsTrigger value="ami" data-testid="tab-ami">AMI TRACKER</TabsTrigger>
          <TabsTrigger value="drift" data-testid="tab-drift">DRIFT & EXPLORATION</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="datasets">
          <DatasetsTab />
        </TabsContent>
        <TabsContent value="predictions">
          <PredictionsTab />
        </TabsContent>
        <TabsContent value="ami">
          <AMITrackerTab />
        </TabsContent>
        <TabsContent value="drift">
          <DriftExplorationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
