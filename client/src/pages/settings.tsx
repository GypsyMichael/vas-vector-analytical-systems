import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CircleCheck, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CreativeProfile {
  id: string;
  userId: string;
  preferredStyles: string[] | null;
  platformStrengths: Record<string, number> | null;
  riskTolerance: string;
  commonAudiences: string[] | null;
  blindSpots: string[] | null;
  restrictionState: string;
  totalVideosCreated: number;
  totalVideosPosted: number;
  createdAt: string;
  updatedAt: string;
}

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: profileData, isLoading: isLoadingProfile } = useQuery<{ profile: CreativeProfile }>({
    queryKey: ["/api/studio/profile"],
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/studio/profile/reset");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio/profile"] });
      toast({
        title: "Profile reset successfully",
        description: "Your creative profile has been reset to defaults.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reset failed",
        description: error.message || "Failed to reset your profile.",
        variant: "destructive",
      });
    },
  });

  const profile = profileData?.profile;

  const { data: apiStatus } = useQuery<{ openai: boolean; youtube: boolean }>({
    queryKey: ["/api/system/api-status"],
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1
          className="font-mono text-2xl font-bold uppercase tracking-wider text-chrome-text"
          data-testid="text-settings-title"
        >
          SETTINGS
        </h1>
        <p
          className="font-mono text-sm text-chrome-dim mt-1"
          data-testid="text-settings-subtitle"
        >
          System Configuration
        </p>
      </div>

      {/* Section 1: Profile Settings */}
      <div className="space-y-4">
        <h2
          className="font-mono text-lg font-bold uppercase tracking-wide text-chrome-text"
          data-testid="text-profile-section"
        >
          PROFILE SETTINGS
        </h2>
        <Card className="bg-steel-surface border-steel-border p-6">
          <div className="space-y-4">
            <div>
              <label className="font-mono text-xs uppercase tracking-wide text-chrome-dim block mb-1">
                Username
              </label>
              <p className="text-chrome-text font-mono text-sm" data-testid="text-username">
                {user?.username || "—"}
              </p>
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-wide text-chrome-dim block mb-1">
                Email
              </label>
              <p className="text-chrome-text font-mono text-sm" data-testid="text-email">
                {user?.email || "Not set"}
              </p>
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-wide text-chrome-dim block mb-1">
                Display Name
              </label>
              <p className="text-chrome-text font-mono text-sm" data-testid="text-display-name">
                {user?.displayName || "Not set"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Section 2: Creative Profile */}
      <div className="space-y-4">
        <h2
          className="font-mono text-lg font-bold uppercase tracking-wide text-chrome-text"
          data-testid="text-creative-profile-section"
        >
          CREATIVE PROFILE
        </h2>
        <Card className="bg-steel-surface border-steel-border p-6">
          {isLoadingProfile ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-24 bg-steel-border" />
              <Skeleton className="h-4 w-32 bg-steel-border" />
              <Skeleton className="h-4 w-28 bg-steel-border" />
              <Skeleton className="h-4 w-20 bg-steel-border" />
            </div>
          ) : profile ? (
            <div className="space-y-4">
              <div>
                <label className="font-mono text-xs uppercase tracking-wide text-chrome-dim block mb-1">
                  Preferred Styles
                </label>
                <p className="text-chrome-text font-mono text-sm" data-testid="text-preferred-styles">
                  {profile.preferredStyles && profile.preferredStyles.length > 0
                    ? profile.preferredStyles.join(", ")
                    : "No styles set"}
                </p>
              </div>
              <div>
                <label className="font-mono text-xs uppercase tracking-wide text-chrome-dim block mb-1">
                  Risk Tolerance
                </label>
                <p className="text-chrome-text font-mono text-sm capitalize" data-testid="text-risk-tolerance">
                  {profile.riskTolerance}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-xs uppercase tracking-wide text-chrome-dim block mb-1">
                    Videos Created
                  </label>
                  <p className="text-chrome-text font-mono text-sm" data-testid="text-videos-created">
                    {profile.totalVideosCreated}
                  </p>
                </div>
                <div>
                  <label className="font-mono text-xs uppercase tracking-wide text-chrome-dim block mb-1">
                    Videos Posted
                  </label>
                  <p className="text-chrome-text font-mono text-sm" data-testid="text-videos-posted">
                    {profile.totalVideosPosted}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                variant="outline"
                className="w-full mt-4"
                data-testid="button-reset-profile"
              >
                {resetMutation.isPending ? "Resetting..." : "Reset Profile"}
              </Button>
            </div>
          ) : (
            <p className="text-chrome-dim font-mono text-sm">Failed to load creative profile</p>
          )}
        </Card>
      </div>

      {/* Section 3: System Info */}
      <div className="space-y-4">
        <h2
          className="font-mono text-lg font-bold uppercase tracking-wide text-chrome-text"
          data-testid="text-system-info-section"
        >
          SYSTEM INFO
        </h2>
        <Card className="bg-steel-surface border-steel-border p-6">
          <div className="space-y-4">
            <div>
              <label className="font-mono text-xs uppercase tracking-wide text-chrome-dim block mb-1">
                App Version
              </label>
              <p className="text-chrome-text font-mono text-sm" data-testid="text-app-version">
                VAS v1.0
              </p>
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-wide text-chrome-dim block mb-1">
                API Status
              </label>
              <div className="flex items-center gap-2" data-testid="status-api-status">
                <CircleCheck className="w-4 h-4 text-success-green" />
                <span className="text-chrome-text font-mono text-sm">Connected</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Section 4: API Keys */}
      <div className="space-y-4">
        <h2
          className="font-mono text-lg font-bold uppercase tracking-wide text-chrome-text"
          data-testid="text-api-keys-section"
        >
          API KEYS
        </h2>
        <Card className="bg-steel-surface border-steel-border p-6">
          <div className="space-y-4">
            <p className="text-chrome-dim font-mono text-xs mb-4">
              API keys are managed through environment variables
            </p>
            <div>
              <label className="font-mono text-xs uppercase tracking-wide text-chrome-dim block mb-1">
                OpenAI API
              </label>
              <div className="flex items-center gap-2" data-testid="status-openai-api">
                {apiStatus?.openai ? (
                  <>
                    <CircleCheck className="w-4 h-4 text-success-green" />
                    <span className="text-chrome-text font-mono text-sm">Configured</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-alert-red" />
                    <span className="text-chrome-text font-mono text-sm">Not Configured</span>
                  </>
                )}
              </div>
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-wide text-chrome-dim block mb-1">
                YouTube Data API
              </label>
              <div className="flex items-center gap-2" data-testid="status-youtube-api">
                {apiStatus?.youtube ? (
                  <>
                    <CircleCheck className="w-4 h-4 text-success-green" />
                    <span className="text-chrome-text font-mono text-sm">Configured</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-alert-red" />
                    <span className="text-chrome-text font-mono text-sm">Not Configured</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
