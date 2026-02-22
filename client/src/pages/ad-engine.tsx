import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Play,
  RefreshCw,
  Save,
  Send,
  Image as ImageIcon,
  Mic,
  FileText,
  Clock,
  Check,
} from "lucide-react";

interface Scenario {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  arc: {
    hook: string;
    escalation: string;
    exaggeration: string;
    resolution: string;
    brandClose: string;
  };
  suggestedCharacters: string[];
}

interface Scene {
  sceneNumber: number;
  duration: number;
  narration: string;
  visualDescription: string;
  textOverlay: string;
  character: string;
  mood: string;
}

interface BrandClose {
  narration: string;
  textOverlay: string;
  tagline: string;
}

interface Script {
  id: string;
  title: string;
  scenes: Scene[];
  brandClose: BrandClose;
  totalDuration: number;
  format: string;
  status: string;
  category?: string;
  createdAt?: string;
  voiceoverUrl?: string;
  sceneImages?: Record<number, string>;
}

const STEPS = [
  { num: 1, label: "SCENARIO" },
  { num: 2, label: "SCRIPT" },
  { num: 3, label: "ASSETS" },
  { num: 4, label: "MY SCRIPTS" },
];

export default function AdEngine() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [currentScript, setCurrentScript] = useState<Script | null>(null);
  const [format, setFormat] = useState<"portrait" | "landscape">("portrait");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [editingScenes, setEditingScenes] = useState<Scene[]>([]);

  const generateScenariosMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/ad-engine/scenarios");
      return res.json();
    },
    onSuccess: (data: { scenarios: Scenario[] }) => {
      setScenarios(data.scenarios);
      toast({ title: "Scenarios generated", description: `${data.scenarios.length} scenarios ready.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const generateScriptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ad-engine/scripts/generate", {
        scenarioId: selectedScenario?.id,
        format,
      });
      return res.json();
    },
    onSuccess: (data: { script: Script }) => {
      setCurrentScript(data.script);
      setEditingScenes(data.script.scenes.map((s) => ({ ...s })));
      toast({ title: "Script generated", description: data.script.title });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const saveScriptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/ad-engine/scripts/${currentScript?.id}`, {
        scenes: editingScenes,
      });
      return res.json();
    },
    onSuccess: (data: { script: Script }) => {
      setCurrentScript(data.script);
      setEditingScenes(data.script.scenes.map((s) => ({ ...s })));
      queryClient.invalidateQueries({ queryKey: ["/api/ad-engine/scripts"] });
      toast({ title: "Script saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const regenerateScriptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/ad-engine/scripts/${currentScript?.id}/regenerate`);
      return res.json();
    },
    onSuccess: (data: { script: Script }) => {
      setCurrentScript(data.script);
      setEditingScenes(data.script.scenes.map((s) => ({ ...s })));
      toast({ title: "Script regenerated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const chatMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/ad-engine/scripts/${currentScript?.id}/chat`, {
        message: chatMessage,
      });
      return res.json();
    },
    onSuccess: (data: { script: Script }) => {
      setCurrentScript(data.script);
      setEditingScenes(data.script.scenes.map((s) => ({ ...s })));
      setChatMessage("");
      toast({ title: "Script updated via AI" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const voiceoverMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/ad-engine/scripts/${currentScript?.id}/voiceover`);
      return res.json();
    },
    onSuccess: (data: { voiceoverUrl: string }) => {
      setCurrentScript((prev) => prev ? { ...prev, voiceoverUrl: data.voiceoverUrl } : null);
      toast({ title: "Voiceover generated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const imageGenerationMutations = [1, 2, 3].map((sceneNum) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useMutation({
      mutationFn: async () => {
        const res = await apiRequest(
          "POST",
          `/api/ad-engine/scripts/${currentScript?.id}/scenes/${sceneNum}/image`
        );
        return res.json();
      },
      onSuccess: (data: { imageUrl: string }) => {
        setCurrentScript((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            sceneImages: { ...(prev.sceneImages || {}), [sceneNum]: data.imageUrl },
          };
        });
        toast({ title: `Scene ${sceneNum} image generated` });
      },
      onError: (err: Error) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    })
  );

  const scriptsQuery = useQuery<{ scripts: Script[] }>({
    queryKey: ["/api/ad-engine/scripts"],
    enabled: currentStep === 4,
  });

  function updateSceneField(sceneIndex: number, field: keyof Scene, value: string | number) {
    setEditingScenes((prev) => {
      const updated = [...prev];
      updated[sceneIndex] = { ...updated[sceneIndex], [field]: value };
      return updated;
    });
  }

  function handleSelectScenario(scenario: Scenario) {
    setSelectedScenario(scenario);
  }

  function handleLoadScript(script: Script) {
    setCurrentScript(script);
    setEditingScenes(script.scenes.map((s) => ({ ...s })));
    setCurrentStep(2);
  }

  return (
    <div className="space-y-6" data-testid="page-ad-engine-content">
      <div className="flex items-center gap-2 flex-wrap" data-testid="pipeline-steps">
        {STEPS.map((step, i) => (
          <div key={step.num} className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStep(step.num)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-sm font-mono text-xs uppercase tracking-wider transition-colors ${
                currentStep === step.num
                  ? "bg-industrial-blue text-white"
                  : currentStep > step.num
                    ? "bg-steel-surface text-success-green border border-steel-border"
                    : "bg-steel-surface text-chrome-dim border border-steel-border"
              }`}
              data-testid={`step-${step.num}`}
            >
              <span className="w-5 h-5 flex items-center justify-center rounded-sm bg-steel-bg text-xs">
                {currentStep > step.num ? <Check className="w-3 h-3" /> : step.num}
              </span>
              {step.label}
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-chrome-dim" />}
          </div>
        ))}
      </div>

      {currentStep === 1 && (
        <StepScenarioSelection
          scenarios={scenarios}
          selectedScenario={selectedScenario}
          onSelect={handleSelectScenario}
          onGenerate={() => generateScenariosMutation.mutate()}
          isGenerating={generateScenariosMutation.isPending}
          onNext={() => setCurrentStep(2)}
        />
      )}

      {currentStep === 2 && (
        <StepScriptEditor
          selectedScenario={selectedScenario}
          currentScript={currentScript}
          editingScenes={editingScenes}
          format={format}
          onFormatChange={setFormat}
          onGenerateScript={() => generateScriptMutation.mutate()}
          isGeneratingScript={generateScriptMutation.isPending}
          onSave={() => saveScriptMutation.mutate()}
          isSaving={saveScriptMutation.isPending}
          onRegenerate={() => regenerateScriptMutation.mutate()}
          isRegenerating={regenerateScriptMutation.isPending}
          onUpdateScene={updateSceneField}
          chatMessage={chatMessage}
          onChatMessageChange={setChatMessage}
          onSendChat={() => chatMutation.mutate()}
          isSendingChat={chatMutation.isPending}
          onBack={() => setCurrentStep(1)}
          onNext={() => setCurrentStep(3)}
        />
      )}

      {currentStep === 3 && (
        <StepAssetProduction
          currentScript={currentScript}
          onGenerateVoiceover={() => voiceoverMutation.mutate()}
          isGeneratingVoiceover={voiceoverMutation.isPending}
          imageGenerationMutations={imageGenerationMutations}
          onBack={() => setCurrentStep(2)}
          onNext={() => setCurrentStep(4)}
        />
      )}

      {currentStep === 4 && (
        <StepScriptList
          scripts={scriptsQuery.data?.scripts || []}
          isLoading={scriptsQuery.isLoading}
          onSelectScript={handleLoadScript}
          onBack={() => setCurrentStep(3)}
        />
      )}
    </div>
  );
}

function StepScenarioSelection({
  scenarios,
  selectedScenario,
  onSelect,
  onGenerate,
  isGenerating,
  onNext,
}: {
  scenarios: Scenario[];
  selectedScenario: Scenario | null;
  onSelect: (s: Scenario) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-foreground" data-testid="header-choose-scenario">
          CHOOSE SCENARIO
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={onGenerate}
            disabled={isGenerating}
            data-testid="button-generate-scenarios"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate Scenarios
          </Button>
          {selectedScenario && (
            <Button onClick={onNext} data-testid="button-next-step-1">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="standard">
        <TabsList data-testid="tabs-scenario-type">
          <TabsTrigger value="standard" className="font-mono text-xs uppercase" data-testid="tab-standard">
            Standard Scenarios
          </TabsTrigger>
          <TabsTrigger value="comparison" className="font-mono text-xs uppercase" data-testid="tab-comparison">
            Comparison Scenarios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standard">
          {scenarios.length === 0 ? (
            <div className="bg-steel-surface border border-steel-border rounded-sm p-8 text-center" data-testid="empty-scenarios">
              <Sparkles className="w-8 h-8 text-chrome-dim mx-auto mb-3" />
              <p className="font-mono text-sm text-chrome-dim uppercase">
                Click "Generate Scenarios" to load scenario options
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenarios
                .filter((s) => !s.category.includes("comparison"))
                .map((scenario) => (
                  <ScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    isSelected={selectedScenario?.id === scenario.id}
                    onSelect={() => onSelect(scenario)}
                  />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="comparison">
          {scenarios.length === 0 ? (
            <div className="bg-steel-surface border border-steel-border rounded-sm p-8 text-center">
              <p className="font-mono text-sm text-chrome-dim uppercase">
                Generate scenarios first
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenarios
                .filter((s) => s.category.includes("comparison"))
                .map((scenario) => (
                  <ScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    isSelected={selectedScenario?.id === scenario.id}
                    onSelect={() => onSelect(scenario)}
                  />
                ))}
              {scenarios.filter((s) => s.category.includes("comparison")).length === 0 && (
                <div className="col-span-full bg-steel-surface border border-steel-border rounded-sm p-8 text-center">
                  <p className="font-mono text-sm text-chrome-dim uppercase">
                    No comparison scenarios available
                  </p>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScenarioCard({
  scenario,
  isSelected,
  onSelect,
}: {
  scenario: Scenario;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`bg-steel-surface border rounded-sm p-4 space-y-3 transition-colors ${
        isSelected ? "border-industrial-blue" : "border-steel-border"
      }`}
      data-testid={`card-scenario-${scenario.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-mono text-sm font-bold uppercase text-foreground" data-testid={`text-scenario-title-${scenario.id}`}>
          {scenario.title}
        </h3>
        <Badge variant="secondary" className="font-mono text-xs uppercase shrink-0">
          {scenario.category.replace(/_/g, " ")}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed" data-testid={`text-scenario-desc-${scenario.id}`}>
        {scenario.description}
      </p>
      <div className="flex items-center gap-1 flex-wrap">
        {scenario.tags.map((tag) => (
          <Badge key={tag} variant="outline" className="font-mono text-xs">
            {tag}
          </Badge>
        ))}
      </div>
      <Button
        variant={isSelected ? "default" : "secondary"}
        size="sm"
        onClick={onSelect}
        className="w-full font-mono text-xs uppercase"
        data-testid={`button-select-scenario-${scenario.id}`}
      >
        {isSelected ? (
          <>
            <Check className="w-3 h-3 mr-1" /> Selected
          </>
        ) : (
          "Select"
        )}
      </Button>
    </div>
  );
}

function StepScriptEditor({
  selectedScenario,
  currentScript,
  editingScenes,
  format,
  onFormatChange,
  onGenerateScript,
  isGeneratingScript,
  onSave,
  isSaving,
  onRegenerate,
  isRegenerating,
  onUpdateScene,
  chatMessage,
  onChatMessageChange,
  onSendChat,
  isSendingChat,
  onBack,
  onNext,
}: {
  selectedScenario: Scenario | null;
  currentScript: Script | null;
  editingScenes: Scene[];
  format: "portrait" | "landscape";
  onFormatChange: (f: "portrait" | "landscape") => void;
  onGenerateScript: () => void;
  isGeneratingScript: boolean;
  onSave: () => void;
  isSaving: boolean;
  onRegenerate: () => void;
  isRegenerating: boolean;
  onUpdateScene: (index: number, field: keyof Scene, value: string | number) => void;
  chatMessage: string;
  onChatMessageChange: (msg: string) => void;
  onSendChat: () => void;
  isSendingChat: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-foreground" data-testid="header-script-editor">
          SCRIPT EDITOR
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" onClick={onBack} data-testid="button-back-step-2">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {currentScript && (
            <Button onClick={onNext} data-testid="button-next-step-2">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {selectedScenario && (
        <div className="bg-steel-surface border border-steel-border rounded-sm p-4" data-testid="selected-scenario-summary">
          <p className="font-mono text-xs text-chrome-dim uppercase mb-1">Selected Scenario</p>
          <p className="font-mono text-sm font-bold text-foreground">{selectedScenario.title}</p>
          <p className="text-sm text-muted-foreground mt-1">{selectedScenario.description}</p>
        </div>
      )}

      {!currentScript && (
        <div className="bg-steel-surface border border-steel-border rounded-sm p-6 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="space-y-1">
              <p className="font-mono text-xs text-chrome-dim uppercase">Format</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onFormatChange("portrait")}
                  className={`px-3 py-1.5 rounded-sm font-mono text-xs uppercase border transition-colors ${
                    format === "portrait"
                      ? "bg-industrial-blue text-white border-industrial-blue"
                      : "bg-steel-bg text-chrome-dim border-steel-border"
                  }`}
                  data-testid="button-format-portrait"
                >
                  Portrait (9:16)
                </button>
                <button
                  onClick={() => onFormatChange("landscape")}
                  className={`px-3 py-1.5 rounded-sm font-mono text-xs uppercase border transition-colors ${
                    format === "landscape"
                      ? "bg-industrial-blue text-white border-industrial-blue"
                      : "bg-steel-bg text-chrome-dim border-steel-border"
                  }`}
                  data-testid="button-format-landscape"
                >
                  Landscape (16:9)
                </button>
              </div>
            </div>
            <Button
              onClick={onGenerateScript}
              disabled={isGeneratingScript || !selectedScenario}
              data-testid="button-generate-script"
            >
              {isGeneratingScript ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate Script
            </Button>
          </div>
          {!selectedScenario && (
            <p className="font-mono text-xs text-warning-amber uppercase">
              Select a scenario first
            </p>
          )}
        </div>
      )}

      {currentScript && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-mono text-sm font-bold uppercase text-foreground" data-testid="text-script-title">
                {currentScript.title}
              </h3>
              <p className="font-mono text-xs text-chrome-dim">
                {currentScript.totalDuration}s total | {currentScript.format}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="secondary"
                onClick={onRegenerate}
                disabled={isRegenerating}
                data-testid="button-regenerate-script"
              >
                {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Regenerate
              </Button>
              <Button
                onClick={onSave}
                disabled={isSaving}
                data-testid="button-save-script"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {editingScenes.map((scene, index) => (
              <div
                key={scene.sceneNumber}
                className="bg-steel-surface border border-steel-border rounded-sm p-4 space-y-3"
                data-testid={`card-scene-${scene.sceneNumber}`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-industrial-blue uppercase">
                      Scene {scene.sceneNumber}
                    </span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {scene.mood}
                    </Badge>
                  </div>
                  <span className="font-mono text-xs text-chrome-dim">{scene.duration}s</span>
                </div>

                <div className="space-y-2">
                  <label className="block">
                    <span className="font-mono text-xs text-chrome-dim uppercase block mb-1">Narration</span>
                    <textarea
                      value={scene.narration}
                      onChange={(e) => onUpdateScene(index, "narration", e.target.value)}
                      className="w-full bg-steel-bg border border-steel-border rounded-sm p-2 text-sm text-foreground font-mono resize-none"
                      rows={2}
                      data-testid={`input-narration-${scene.sceneNumber}`}
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono text-xs text-chrome-dim uppercase block mb-1">Visual Description</span>
                    <textarea
                      value={scene.visualDescription}
                      onChange={(e) => onUpdateScene(index, "visualDescription", e.target.value)}
                      className="w-full bg-steel-bg border border-steel-border rounded-sm p-2 text-sm text-foreground font-mono resize-none"
                      rows={2}
                      data-testid={`input-visual-${scene.sceneNumber}`}
                    />
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <label className="block">
                      <span className="font-mono text-xs text-chrome-dim uppercase block mb-1">Text Overlay</span>
                      <input
                        type="text"
                        value={scene.textOverlay}
                        onChange={(e) => onUpdateScene(index, "textOverlay", e.target.value)}
                        className="w-full bg-steel-bg border border-steel-border rounded-sm p-2 text-sm text-foreground font-mono"
                        data-testid={`input-overlay-${scene.sceneNumber}`}
                      />
                    </label>
                    <label className="block">
                      <span className="font-mono text-xs text-chrome-dim uppercase block mb-1">Mood</span>
                      <input
                        type="text"
                        value={scene.mood}
                        onChange={(e) => onUpdateScene(index, "mood", e.target.value)}
                        className="w-full bg-steel-bg border border-steel-border rounded-sm p-2 text-sm text-foreground font-mono"
                        data-testid={`input-mood-${scene.sceneNumber}`}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {currentScript.brandClose && (
            <div className="bg-steel-surface border border-steel-border rounded-sm p-4" data-testid="brand-close-section">
              <p className="font-mono text-xs font-bold text-industrial-blue uppercase mb-2">Brand Close</p>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  <span className="font-mono text-xs text-chrome-dim">Narration: </span>
                  {currentScript.brandClose.narration}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-mono text-xs text-chrome-dim">Overlay: </span>
                  {currentScript.brandClose.textOverlay}
                </p>
                <p className="text-sm text-foreground font-bold">
                  <span className="font-mono text-xs text-chrome-dim">Tagline: </span>
                  {currentScript.brandClose.tagline}
                </p>
              </div>
            </div>
          )}

          <div className="bg-steel-surface border border-steel-border rounded-sm p-4" data-testid="chat-panel">
            <p className="font-mono text-xs text-chrome-dim uppercase mb-2">Modify with AI</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => onChatMessageChange(e.target.value)}
                placeholder="Describe changes..."
                className="flex-1 bg-steel-bg border border-steel-border rounded-sm p-2 text-sm text-foreground font-mono placeholder:text-chrome-dim"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && chatMessage.trim()) onSendChat();
                }}
                data-testid="input-chat-message"
              />
              <Button
                size="icon"
                onClick={onSendChat}
                disabled={isSendingChat || !chatMessage.trim()}
                data-testid="button-send-chat"
              >
                {isSendingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepAssetProduction({
  currentScript,
  onGenerateVoiceover,
  isGeneratingVoiceover,
  imageGenerationMutations,
  onBack,
  onNext,
}: {
  currentScript: Script | null;
  onGenerateVoiceover: () => void;
  isGeneratingVoiceover: boolean;
  imageGenerationMutations: { mutate: () => void; isPending: boolean }[];
  onBack: () => void;
  onNext: () => void;
}) {
  if (!currentScript) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-foreground" data-testid="header-produce-assets">
            PRODUCE ASSETS
          </h2>
          <Button variant="secondary" onClick={onBack} data-testid="button-back-step-3">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </div>
        <div className="bg-steel-surface border border-steel-border rounded-sm p-8 text-center">
          <p className="font-mono text-sm text-chrome-dim uppercase">Generate a script first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-foreground" data-testid="header-produce-assets">
          PRODUCE ASSETS
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" onClick={onBack} data-testid="button-back-step-3">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button onClick={onNext} data-testid="button-next-step-3">
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-steel-surface border border-steel-border rounded-sm p-4 space-y-4" data-testid="voiceover-section">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-industrial-blue" />
            <h3 className="font-mono text-sm font-bold uppercase text-foreground">Voiceover</h3>
          </div>

          {currentScript.voiceoverUrl ? (
            <div className="space-y-3">
              <audio
                controls
                src={currentScript.voiceoverUrl}
                className="w-full"
                data-testid="audio-voiceover"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={onGenerateVoiceover}
                disabled={isGeneratingVoiceover}
                className="font-mono text-xs uppercase"
                data-testid="button-regenerate-voiceover"
              >
                {isGeneratingVoiceover ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                Regenerate Voiceover
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <Mic className="w-8 h-8 text-chrome-dim mx-auto mb-3" />
              <Button
                onClick={onGenerateVoiceover}
                disabled={isGeneratingVoiceover}
                className="font-mono text-xs uppercase"
                data-testid="button-generate-voiceover"
              >
                {isGeneratingVoiceover ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                Generate Voiceover
              </Button>
            </div>
          )}
        </div>

        <div className="bg-steel-surface border border-steel-border rounded-sm p-4 space-y-4" data-testid="scene-images-section">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-industrial-blue" />
            <h3 className="font-mono text-sm font-bold uppercase text-foreground">Scene Images</h3>
          </div>

          <div className="space-y-3">
            {[0, 1, 2].map((i) => {
              const sceneNum = i + 1;
              const imageUrl = currentScript.sceneImages?.[sceneNum];
              const mutation = imageGenerationMutations[i];

              return (
                <div
                  key={sceneNum}
                  className="bg-steel-bg border border-steel-border rounded-sm p-3 space-y-2"
                  data-testid={`image-slot-${sceneNum}`}
                >
                  <p className="font-mono text-xs text-chrome-dim uppercase">Scene {sceneNum}</p>
                  {imageUrl ? (
                    <div className="space-y-2">
                      <img
                        src={imageUrl}
                        alt={`Scene ${sceneNum}`}
                        className="w-full rounded-sm border border-steel-border"
                        data-testid={`img-scene-${sceneNum}`}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => mutation.mutate()}
                        disabled={mutation.isPending}
                        className="font-mono text-xs uppercase"
                        data-testid={`button-regenerate-image-${sceneNum}`}
                      >
                        {mutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                        Regenerate
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => mutation.mutate()}
                        disabled={mutation.isPending}
                        className="font-mono text-xs uppercase"
                        data-testid={`button-generate-image-${sceneNum}`}
                      >
                        {mutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <ImageIcon className="w-3 h-3 mr-1" />
                        )}
                        Generate Image
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepScriptList({
  scripts,
  isLoading,
  onSelectScript,
  onBack,
}: {
  scripts: Script[];
  isLoading: boolean;
  onSelectScript: (s: Script) => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-foreground" data-testid="header-my-scripts">
          MY SCRIPTS
        </h2>
        <Button variant="secondary" onClick={onBack} data-testid="button-back-step-4">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-steel-surface border border-steel-border rounded-sm p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : scripts.length === 0 ? (
        <div className="bg-steel-surface border border-steel-border rounded-sm p-8 text-center" data-testid="empty-scripts">
          <FileText className="w-8 h-8 text-chrome-dim mx-auto mb-3" />
          <p className="font-mono text-sm text-chrome-dim uppercase">No scripts yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {scripts.map((script) => (
            <button
              key={script.id}
              onClick={() => onSelectScript(script)}
              className="w-full text-left bg-steel-surface border border-steel-border rounded-sm p-4 hover-elevate active-elevate-2 transition-colors"
              data-testid={`card-script-${script.id}`}
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <FileText className="w-4 h-4 text-industrial-blue shrink-0" />
                  <span className="font-mono text-sm font-bold text-foreground" data-testid={`text-script-title-${script.id}`}>
                    {script.title}
                  </span>
                  {script.category && (
                    <Badge variant="secondary" className="font-mono text-xs uppercase">
                      {script.category.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`font-mono text-xs uppercase ${
                      script.status === "draft"
                        ? "text-warning-amber"
                        : script.status === "complete"
                          ? "text-success-green"
                          : "text-chrome-dim"
                    }`}
                    data-testid={`status-script-${script.id}`}
                  >
                    {script.status}
                  </Badge>
                  {script.createdAt && (
                    <span className="font-mono text-xs text-chrome-dim flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(script.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
