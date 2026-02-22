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
  Globe,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Youtube,
  Key,
  Activity,
  Loader2,
  Target,
  Zap,
  Shield,
  TrendingUp,
  Calendar,
  Package,
  Crosshair,
  MessageSquare,
} from "lucide-react";

interface EnvironmentProfile {
  id: string;
  platformName: string;
  platformUrl: string | null;
  platformType: string;
  industry: string;
  brandPersonality: string;
  toneProfile: { primary?: string; secondary?: string; avoid?: string[]; humorTolerance?: string; sarcasmLevel?: string } | null;
  audienceProfile: {
    demographics?: string;
    interests?: string[];
    painPoints?: string[];
    buyingTriggers?: string[];
    objections?: string[];
    mediaHabits?: string;
    languageStyle?: string;
  } | null;
  discoveredProducts: Array<{ name: string; category?: string; priceRange?: string; uniqueSellingPoint?: string; comparisonTarget?: string; adAngle?: string }> | null;
  suggestedAngles: string[] | null;
  videoCreationBrief: {
    primaryMessage?: string;
    targetEmotion?: string;
    callToActionContext?: string;
    visualStyle?: string;
    pacing?: string;
    idealLength?: string;
    doNotShow?: string[];
  } | null;
  competitorWeaknesses: Array<{ competitor: string; weakness: string; adOpportunity: string }> | null;
  emotionalTriggers: Array<{ trigger: string; context: string; humorAngle: string }> | null;
  contentGaps: Array<{ gap: string; opportunity: string; priority: string }> | null;
  humorMapping: Array<{ categoryId: string; relevanceScore: number; specificAngle: string; exampleSetup?: string }> | null;
  seasonalHooks: Array<{ season: string; hook: string; urgency: string }> | null;
}

interface YouTubeStatus {
  apiKeyConfigured: boolean;
  totalBenchmarks: number;
  quotaUsedThisSession: number;
}

function EnvironmentDiscoveryTab() {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [platformName, setPlatformName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: profilesData, isLoading } = useQuery<{ profiles: EnvironmentProfile[] }>({
    queryKey: ["/api/environment/profiles"],
  });
  const profiles = profilesData?.profiles;

  const discoverMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/environment/discover", {
        url,
        platformName,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/environment/profiles"] });
      toast({ title: "Environment discovered successfully" });
      setUrl("");
      setPlatformName("");
    },
    onError: (error: Error) => {
      toast({ title: "Discovery failed", description: error.message, variant: "destructive" });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/environment/profiles/${id}/refresh`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/environment/profiles"] });
      toast({ title: "Profile refreshed" });
    },
    onError: (error: Error) => {
      toast({ title: "Refresh failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="font-mono text-sm uppercase tracking-wide text-chrome-dim mb-4">
          Discover New Environment
        </h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="font-mono text-xs uppercase tracking-wide text-chrome-dim mb-1 block">
              URL
            </label>
            <Input
              data-testid="input-discover-url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="font-mono text-xs uppercase tracking-wide text-chrome-dim mb-1 block">
              Platform Name
            </label>
            <Input
              data-testid="input-discover-platform"
              placeholder="Platform name"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
            />
          </div>
          <Button
            data-testid="button-discover"
            onClick={() => discoverMutation.mutate()}
            disabled={!url || !platformName || discoverMutation.isPending}
          >
            {discoverMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Globe className="h-4 w-4 mr-2" />
            )}
            Discover
          </Button>
        </div>
      </Card>

      <div>
        <h3 className="font-mono text-sm uppercase tracking-wide text-chrome-dim mb-3">
          Environment Profiles
        </h3>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : !profiles || profiles.length === 0 ? (
          <Card className="p-6">
            <p className="text-chrome-dim font-mono text-sm text-center">
              No environment profiles discovered yet.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {profiles.map((profile) => (
              <Card key={profile.id} className="p-4" data-testid={`card-profile-${profile.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() =>
                      setExpandedId(expandedId === profile.id ? null : profile.id)
                    }
                    data-testid={`button-expand-profile-${profile.id}`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold" data-testid={`text-profile-name-${profile.id}`}>
                        {profile.platformName}
                      </span>
                      <Badge variant="secondary" data-testid={`badge-platform-type-${profile.id}`}>
                        {profile.platformType}
                      </Badge>
                      <Badge variant="outline" data-testid={`badge-industry-${profile.id}`}>
                        {profile.industry}
                      </Badge>
                    </div>
                    <p className="text-chrome-dim text-sm mt-1" data-testid={`text-brand-personality-${profile.id}`}>
                      {profile.brandPersonality}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => refreshMutation.mutate(profile.id)}
                      disabled={refreshMutation.isPending}
                      data-testid={`button-refresh-profile-${profile.id}`}
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setExpandedId(expandedId === profile.id ? null : profile.id)
                      }
                      data-testid={`button-toggle-profile-${profile.id}`}
                    >
                      {expandedId === profile.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {expandedId === profile.id && (
                  <div className="mt-4 pt-4 border-t border-border space-y-5">
                    {profile.videoCreationBrief && (
                      <div data-testid={`section-video-brief-${profile.id}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Crosshair className="h-4 w-4 text-chrome-dim" />
                          <h4 className="font-mono text-xs uppercase tracking-wide text-chrome-dim">
                            Video Creation Brief
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {profile.videoCreationBrief.primaryMessage && (
                            <div className="sm:col-span-2">
                              <span className="font-mono text-xs text-chrome-dim">Primary Message</span>
                              <p className="text-sm mt-0.5" data-testid={`text-primary-message-${profile.id}`}>{profile.videoCreationBrief.primaryMessage}</p>
                            </div>
                          )}
                          {profile.videoCreationBrief.targetEmotion && (
                            <div>
                              <span className="font-mono text-xs text-chrome-dim">Target Emotion</span>
                              <p className="text-sm mt-0.5" data-testid={`text-target-emotion-${profile.id}`}>{profile.videoCreationBrief.targetEmotion}</p>
                            </div>
                          )}
                          {profile.videoCreationBrief.visualStyle && (
                            <div>
                              <span className="font-mono text-xs text-chrome-dim">Visual Style</span>
                              <p className="text-sm mt-0.5" data-testid={`text-visual-style-${profile.id}`}>{profile.videoCreationBrief.visualStyle}</p>
                            </div>
                          )}
                          {profile.videoCreationBrief.pacing && (
                            <div>
                              <span className="font-mono text-xs text-chrome-dim">Pacing</span>
                              <p className="text-sm mt-0.5" data-testid={`text-pacing-${profile.id}`}>{profile.videoCreationBrief.pacing}</p>
                            </div>
                          )}
                          {profile.videoCreationBrief.idealLength && (
                            <div>
                              <span className="font-mono text-xs text-chrome-dim">Ideal Length</span>
                              <p className="text-sm mt-0.5" data-testid={`text-ideal-length-${profile.id}`}>{profile.videoCreationBrief.idealLength}</p>
                            </div>
                          )}
                          {profile.videoCreationBrief.callToActionContext && (
                            <div className="sm:col-span-2">
                              <span className="font-mono text-xs text-chrome-dim">Call to Action Context</span>
                              <p className="text-sm mt-0.5" data-testid={`text-cta-context-${profile.id}`}>{profile.videoCreationBrief.callToActionContext}</p>
                            </div>
                          )}
                          {profile.videoCreationBrief.doNotShow && profile.videoCreationBrief.doNotShow.length > 0 && (
                            <div className="sm:col-span-2">
                              <span className="font-mono text-xs text-chrome-dim">Do Not Show</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {profile.videoCreationBrief.doNotShow.map((item, idx) => (
                                  <Badge key={idx} variant="destructive" data-testid={`badge-do-not-show-${profile.id}-${idx}`}>{item}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {profile.audienceProfile && (
                      <div data-testid={`section-audience-${profile.id}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-chrome-dim" />
                          <h4 className="font-mono text-xs uppercase tracking-wide text-chrome-dim">
                            Audience Profile
                          </h4>
                        </div>
                        <div className="space-y-3">
                          {profile.audienceProfile.demographics && (
                            <div>
                              <span className="font-mono text-xs text-chrome-dim">Demographics</span>
                              <p className="text-sm mt-0.5" data-testid={`text-demographics-${profile.id}`}>{profile.audienceProfile.demographics}</p>
                            </div>
                          )}
                          {profile.audienceProfile.interests && profile.audienceProfile.interests.length > 0 && (
                            <div>
                              <span className="font-mono text-xs text-chrome-dim">Interests</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {profile.audienceProfile.interests.map((interest, idx) => (
                                  <Badge key={idx} variant="secondary" data-testid={`badge-interest-${profile.id}-${idx}`}>{interest}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {profile.audienceProfile.painPoints && profile.audienceProfile.painPoints.length > 0 && (
                            <div>
                              <span className="font-mono text-xs text-chrome-dim">Pain Points</span>
                              <ul className="space-y-1 mt-1">
                                {profile.audienceProfile.painPoints.map((point, idx) => (
                                  <li key={idx} className="text-sm flex items-start gap-2" data-testid={`text-pain-point-${profile.id}-${idx}`}>
                                    <span className="text-chrome-dim mt-1 shrink-0">-</span>
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {profile.audienceProfile.buyingTriggers && profile.audienceProfile.buyingTriggers.length > 0 && (
                            <div>
                              <span className="font-mono text-xs text-chrome-dim">Buying Triggers</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {profile.audienceProfile.buyingTriggers.map((trigger, idx) => (
                                  <Badge key={idx} variant="outline" data-testid={`badge-buying-trigger-${profile.id}-${idx}`}>{trigger}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {profile.audienceProfile.objections && profile.audienceProfile.objections.length > 0 && (
                            <div>
                              <span className="font-mono text-xs text-chrome-dim">Objections</span>
                              <ul className="space-y-1 mt-1">
                                {profile.audienceProfile.objections.map((obj, idx) => (
                                  <li key={idx} className="text-sm flex items-start gap-2" data-testid={`text-objection-${profile.id}-${idx}`}>
                                    <span className="text-chrome-dim mt-1 shrink-0">-</span>
                                    <span>{obj}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {profile.audienceProfile.mediaHabits && (
                            <div>
                              <span className="font-mono text-xs text-chrome-dim">Media Habits</span>
                              <p className="text-sm mt-0.5" data-testid={`text-media-habits-${profile.id}`}>{profile.audienceProfile.mediaHabits}</p>
                            </div>
                          )}
                          {profile.audienceProfile.languageStyle && (
                            <div>
                              <span className="font-mono text-xs text-chrome-dim">Language Style</span>
                              <p className="text-sm mt-0.5" data-testid={`text-language-style-${profile.id}`}>{profile.audienceProfile.languageStyle}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {profile.humorMapping && profile.humorMapping.length > 0 && (
                      <div data-testid={`section-humor-mapping-${profile.id}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-chrome-dim" />
                          <h4 className="font-mono text-xs uppercase tracking-wide text-chrome-dim">
                            Humor Mapping
                          </h4>
                        </div>
                        <div className="space-y-3">
                          {profile.humorMapping.map((mapping, idx) => (
                            <div key={idx} className="p-3 rounded-md bg-muted/30" data-testid={`card-humor-mapping-${profile.id}-${idx}`}>
                              <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                                <span className="font-mono text-sm font-bold">{mapping.categoryId}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-visible">
                                    <div
                                      className="h-full rounded-full bg-foreground/60"
                                      style={{ width: `${Math.min(mapping.relevanceScore * 10, 100)}%` }}
                                    />
                                  </div>
                                  <span className="font-mono text-xs text-chrome-dim" data-testid={`text-relevance-score-${profile.id}-${idx}`}>{mapping.relevanceScore}/10</span>
                                </div>
                              </div>
                              <p className="text-sm" data-testid={`text-specific-angle-${profile.id}-${idx}`}>{mapping.specificAngle}</p>
                              {mapping.exampleSetup && (
                                <p className="text-xs text-chrome-dim mt-1 italic" data-testid={`text-example-setup-${profile.id}-${idx}`}>{mapping.exampleSetup}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.emotionalTriggers && profile.emotionalTriggers.length > 0 && (
                      <div data-testid={`section-emotional-triggers-${profile.id}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-4 w-4 text-chrome-dim" />
                          <h4 className="font-mono text-xs uppercase tracking-wide text-chrome-dim">
                            Emotional Triggers
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {profile.emotionalTriggers.map((et, idx) => (
                            <div key={idx} className="p-3 rounded-md bg-muted/30" data-testid={`card-emotional-trigger-${profile.id}-${idx}`}>
                              <span className="font-mono text-sm font-bold" data-testid={`text-trigger-name-${profile.id}-${idx}`}>{et.trigger}</span>
                              <p className="text-sm mt-0.5" data-testid={`text-trigger-context-${profile.id}-${idx}`}>{et.context}</p>
                              <p className="text-xs text-chrome-dim mt-1 italic" data-testid={`text-humor-angle-${profile.id}-${idx}`}>{et.humorAngle}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.competitorWeaknesses && profile.competitorWeaknesses.length > 0 && (
                      <div data-testid={`section-competitor-weaknesses-${profile.id}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4 text-chrome-dim" />
                          <h4 className="font-mono text-xs uppercase tracking-wide text-chrome-dim">
                            Competitor Weaknesses
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {profile.competitorWeaknesses.map((cw, idx) => (
                            <div key={idx} className="p-3 rounded-md bg-muted/30" data-testid={`card-competitor-weakness-${profile.id}-${idx}`}>
                              <span className="font-mono text-sm font-bold" data-testid={`text-competitor-name-${profile.id}-${idx}`}>{cw.competitor}</span>
                              <p className="text-sm mt-0.5" data-testid={`text-weakness-${profile.id}-${idx}`}>{cw.weakness}</p>
                              <p className="text-xs text-chrome-dim mt-1" data-testid={`text-ad-opportunity-${profile.id}-${idx}`}>{cw.adOpportunity}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.contentGaps && profile.contentGaps.length > 0 && (
                      <div data-testid={`section-content-gaps-${profile.id}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-chrome-dim" />
                          <h4 className="font-mono text-xs uppercase tracking-wide text-chrome-dim">
                            Content Gaps
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {profile.contentGaps.map((cg, idx) => (
                            <div key={idx} className="flex items-start justify-between gap-3 p-3 rounded-md bg-muted/30" data-testid={`card-content-gap-${profile.id}-${idx}`}>
                              <div className="min-w-0 flex-1">
                                <span className="font-mono text-sm font-bold" data-testid={`text-gap-${profile.id}-${idx}`}>{cg.gap}</span>
                                <p className="text-sm mt-0.5" data-testid={`text-gap-opportunity-${profile.id}-${idx}`}>{cg.opportunity}</p>
                              </div>
                              <Badge
                                variant={cg.priority === "high" ? "destructive" : cg.priority === "medium" ? "default" : "secondary"}
                                data-testid={`badge-gap-priority-${profile.id}-${idx}`}
                              >
                                {cg.priority}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.seasonalHooks && profile.seasonalHooks.length > 0 && (
                      <div data-testid={`section-seasonal-hooks-${profile.id}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-chrome-dim" />
                          <h4 className="font-mono text-xs uppercase tracking-wide text-chrome-dim">
                            Seasonal Hooks
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {profile.seasonalHooks.map((sh, idx) => (
                            <div key={idx} className="flex items-start justify-between gap-3 p-3 rounded-md bg-muted/30" data-testid={`card-seasonal-hook-${profile.id}-${idx}`}>
                              <div className="min-w-0 flex-1">
                                <span className="font-mono text-sm font-bold" data-testid={`text-season-${profile.id}-${idx}`}>{sh.season}</span>
                                <p className="text-sm mt-0.5" data-testid={`text-hook-${profile.id}-${idx}`}>{sh.hook}</p>
                              </div>
                              <Badge variant="outline" data-testid={`badge-urgency-${profile.id}-${idx}`}>{sh.urgency}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.discoveredProducts && profile.discoveredProducts.length > 0 && (
                      <div data-testid={`section-products-${profile.id}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-chrome-dim" />
                          <h4 className="font-mono text-xs uppercase tracking-wide text-chrome-dim">
                            Discovered Products
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {profile.discoveredProducts.map((product, idx) => (
                            <div key={idx} className="p-3 rounded-md bg-muted/30" data-testid={`card-product-${profile.id}-${idx}`}>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-mono text-sm font-bold" data-testid={`text-product-name-${profile.id}-${idx}`}>{product.name}</span>
                                {product.category && <Badge variant="secondary" data-testid={`badge-product-category-${profile.id}-${idx}`}>{product.category}</Badge>}
                                {product.priceRange && <Badge variant="outline" data-testid={`badge-product-price-${profile.id}-${idx}`}>{product.priceRange}</Badge>}
                              </div>
                              {product.uniqueSellingPoint && (
                                <p className="text-sm" data-testid={`text-usp-${profile.id}-${idx}`}>{product.uniqueSellingPoint}</p>
                              )}
                              {product.comparisonTarget && (
                                <p className="text-xs text-chrome-dim mt-1" data-testid={`text-comparison-target-${profile.id}-${idx}`}>vs {product.comparisonTarget}</p>
                              )}
                              {product.adAngle && (
                                <p className="text-xs text-chrome-dim mt-0.5 italic" data-testid={`text-ad-angle-${profile.id}-${idx}`}>{product.adAngle}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.suggestedAngles && profile.suggestedAngles.length > 0 && (
                      <div data-testid={`section-suggested-angles-${profile.id}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Crosshair className="h-4 w-4 text-chrome-dim" />
                          <h4 className="font-mono text-xs uppercase tracking-wide text-chrome-dim">
                            Suggested Angles
                          </h4>
                        </div>
                        <ul className="space-y-1">
                          {profile.suggestedAngles.map((angle, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2" data-testid={`text-angle-${profile.id}-${idx}`}>
                              <span className="text-chrome-dim mt-1 shrink-0">-</span>
                              <span>{angle}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {profile.toneProfile && (
                      <div data-testid={`section-tone-profile-${profile.id}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-chrome-dim" />
                          <h4 className="font-mono text-xs uppercase tracking-wide text-chrome-dim">
                            Tone Profile
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {profile.toneProfile.primary && (
                            <div>
                              <span className="font-mono text-xs text-chrome-dim">Primary</span>
                              <p className="text-sm mt-0.5" data-testid={`text-tone-primary-${profile.id}`}>{profile.toneProfile.primary}</p>
                            </div>
                          )}
                          {profile.toneProfile.secondary && (
                            <div>
                              <span className="font-mono text-xs text-chrome-dim">Secondary</span>
                              <p className="text-sm mt-0.5" data-testid={`text-tone-secondary-${profile.id}`}>{profile.toneProfile.secondary}</p>
                            </div>
                          )}
                          {profile.toneProfile.humorTolerance && (
                            <div>
                              <span className="font-mono text-xs text-chrome-dim">Humor Tolerance</span>
                              <p className="text-sm mt-0.5" data-testid={`text-humor-tolerance-${profile.id}`}>{profile.toneProfile.humorTolerance}</p>
                            </div>
                          )}
                          {profile.toneProfile.sarcasmLevel && (
                            <div>
                              <span className="font-mono text-xs text-chrome-dim">Sarcasm Level</span>
                              <p className="text-sm mt-0.5" data-testid={`text-sarcasm-level-${profile.id}`}>{profile.toneProfile.sarcasmLevel}</p>
                            </div>
                          )}
                          {profile.toneProfile.avoid && profile.toneProfile.avoid.length > 0 && (
                            <div className="sm:col-span-2">
                              <span className="font-mono text-xs text-chrome-dim">Avoid</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {profile.toneProfile.avoid.map((item, idx) => (
                                  <Badge key={idx} variant="destructive" data-testid={`badge-tone-avoid-${profile.id}-${idx}`}>{item}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ScanResult {
  scanned: number;
  added: number;
  skipped: number;
  results: HumorBenchmark[];
}

interface AnalyzeResult {
  analyzed: number;
  results: HumorBenchmark[];
}

interface HumorBenchmark {
  id: number;
  creatorName: string;
  creatorHandle: string | null;
  platform: string;
  humorStyle: string;
  videoUrl: string | null;
  videoTitle: string | null;
  views: number;
  likes: number;
  comments: number;
  engagementRate: number;
  whatWorked: string | null;
  toneNotes: string | null;
  tags: string[] | null;
  scrapedAt: string | null;
}

function formatNumber(n: number | null): string {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function YouTubeResearchTab() {
  const { toast } = useToast();
  const { data: status, isLoading } = useQuery<YouTubeStatus>({
    queryKey: ["/api/youtube-research/status"],
  });

  const { data: benchmarksData } = useQuery<{ benchmarks: HumorBenchmark[] }>({
    queryKey: ["/api/humor-screener/benchmarks"],
    enabled: !!status?.apiKeyConfigured,
  });
  const benchmarks = (benchmarksData?.benchmarks || []).filter(
    (b) => b.platform === "youtube"
  );

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/youtube-research/scan");
      return res.json() as Promise<ScanResult>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/youtube-research/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/humor-screener/benchmarks"] });
      toast({
        title: "Scan complete",
        description: `Found ${data.scanned} videos. Added ${data.added} new benchmarks, skipped ${data.skipped} duplicates.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Scan failed", description: error.message, variant: "destructive" });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/youtube-research/analyze-batch");
      return res.json() as Promise<AnalyzeResult>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/humor-screener/benchmarks"] });
      toast({
        title: "Analysis complete",
        description: `Analyzed ${data.analyzed} benchmarks with AI insights.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="font-mono text-sm uppercase tracking-wide text-chrome-dim mb-4">
          API Status
        </h3>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-40" />
          </div>
        ) : status ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-chrome-dim" />
              <span className="font-mono text-sm">API Key:</span>
              <Badge
                variant={status.apiKeyConfigured ? "default" : "destructive"}
                data-testid="badge-api-key-status"
              >
                {status.apiKeyConfigured ? "Configured" : "Not Configured"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-chrome-dim" />
              <span className="font-mono text-sm">Total Benchmarks:</span>
              <span className="font-mono text-sm font-bold" data-testid="text-total-benchmarks">
                {status.totalBenchmarks}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Youtube className="h-4 w-4 text-chrome-dim" />
              <span className="font-mono text-sm">Quota Used:</span>
              <span className="font-mono text-sm font-bold" data-testid="text-quota-used">
                {status.quotaUsedThisSession}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-chrome-dim font-mono text-sm">Unable to load status.</p>
        )}
      </Card>

      {status?.apiKeyConfigured ? (
        <>
          <Card className="p-4">
            <h3 className="font-mono text-sm uppercase tracking-wide text-chrome-dim mb-4">
              YouTube Scan
            </h3>
            <div className="space-y-3">
              <p className="font-mono text-sm" data-testid="text-youtube-ready">
                Scan YouTube for competitor humor content across all 10 categories. Videos are saved as benchmarks for analysis.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  data-testid="button-youtube-scan"
                  onClick={() => scanMutation.mutate()}
                  disabled={scanMutation.isPending || analyzeMutation.isPending}
                >
                  {scanMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Youtube className="h-4 w-4 mr-2" />
                  )}
                  <span className="font-mono text-xs uppercase">
                    {scanMutation.isPending ? "Scanning..." : "Run Scan"}
                  </span>
                </Button>
                <Button
                  variant="secondary"
                  data-testid="button-youtube-batch"
                  onClick={() => analyzeMutation.mutate()}
                  disabled={analyzeMutation.isPending || scanMutation.isPending || benchmarks.length === 0}
                >
                  {analyzeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Activity className="h-4 w-4 mr-2" />
                  )}
                  <span className="font-mono text-xs uppercase">
                    {analyzeMutation.isPending ? "Analyzing..." : "Batch Analyze"}
                  </span>
                </Button>
              </div>
              {scanMutation.isPending && (
                <p className="font-mono text-xs text-chrome-dim animate-pulse">
                  Searching YouTube across humor categories... This may take a moment.
                </p>
              )}
              {analyzeMutation.isPending && (
                <p className="font-mono text-xs text-chrome-dim animate-pulse">
                  Running AI analysis on benchmarks...
                </p>
              )}
            </div>
          </Card>

          {benchmarks.length > 0 && (
            <div>
              <h3 className="font-mono text-sm uppercase tracking-wide text-chrome-dim mb-3">
                Discovered Videos ({benchmarks.length})
              </h3>
              <div className="space-y-3">
                {benchmarks.map((bm, idx) => (
                  <Card key={bm.id} className="p-4" data-testid={`card-yt-benchmark-${idx}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono text-sm font-bold truncate" data-testid={`text-yt-title-${idx}`}>
                            {bm.videoTitle || "Untitled"}
                          </span>
                          <Badge variant="secondary" className="font-mono text-xs shrink-0">
                            {bm.humorStyle?.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-chrome-dim text-xs font-mono truncate">
                          {bm.creatorName}
                        </p>
                        {bm.whatWorked && (
                          <p className="text-sm mt-2 text-chrome-dim" data-testid={`text-yt-analysis-${idx}`}>
                            {bm.whatWorked}
                          </p>
                        )}
                        {bm.toneNotes && (
                          <p className="text-xs mt-1 text-chrome-dim italic">
                            Tone: {bm.toneNotes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 font-mono text-xs shrink-0">
                        <span className="text-chrome-dim">{formatNumber(bm.views)} views</span>
                        <span className="text-chrome-dim">{formatNumber(bm.likes)} likes</span>
                        <span className="text-industrial-blue font-bold">
                          {bm.engagementRate?.toFixed(2)}% eng
                        </span>
                        {bm.videoUrl && (
                          <a
                            href={bm.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-industrial-blue hover:underline mt-1"
                            data-testid={`link-yt-video-${idx}`}
                          >
                            Watch
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <Card className="p-4">
            <p className="text-chrome-dim font-mono text-sm" data-testid="text-youtube-explanation">
              YouTube research requires a YouTube Data API key. Configure it in Settings.
            </p>
          </Card>
          <Card className="p-6">
            <div className="text-center">
              <Youtube className="h-8 w-8 text-chrome-dim mx-auto mb-3" />
              <p className="font-mono text-sm text-chrome-dim" data-testid="text-youtube-placeholder">
                Scan functionality will be available once the API key is configured.
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

type ResearchTab = "environment" | "youtube";

export default function Research() {
  const [activeTab, setActiveTab] = useState<ResearchTab>("environment");

  return (
    <div className="space-y-6">
      <div className="flex gap-2" data-testid="research-tabs">
        <Button
          variant={activeTab === "environment" ? "default" : "secondary"}
          onClick={() => setActiveTab("environment")}
          data-testid="tab-environment"
          className="toggle-elevate"
        >
          <Globe className="h-4 w-4 mr-2" />
          <span className="font-mono text-xs uppercase">Environment Discovery</span>
        </Button>
        <Button
          variant={activeTab === "youtube" ? "default" : "secondary"}
          onClick={() => setActiveTab("youtube")}
          data-testid="tab-youtube"
          className="toggle-elevate"
        >
          <Youtube className="h-4 w-4 mr-2" />
          <span className="font-mono text-xs uppercase">YouTube Research</span>
        </Button>
      </div>

      {activeTab === "environment" && (
        <div>
          <h2 className="font-mono text-lg font-bold uppercase tracking-wide mb-4" data-testid="header-environment-discovery">
            Environment Discovery
          </h2>
          <EnvironmentDiscoveryTab />
        </div>
      )}

      {activeTab === "youtube" && (
        <div>
          <h2 className="font-mono text-lg font-bold uppercase tracking-wide mb-4" data-testid="header-youtube-research">
            YouTube Research
          </h2>
          <YouTubeResearchTab />
        </div>
      )}
    </div>
  );
}
