import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Send,
  MessageSquare,
  X,
} from "lucide-react";
import type { StudioCampaign } from "@shared/schema";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function CopyAssistant() {
  const { toast } = useToast();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("platform");
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const campaignsQuery = useQuery<{ campaigns: StudioCampaign[] }>({
    queryKey: ["/api/studio/campaigns"],
  });

  const campaigns = campaignsQuery.data?.campaigns || [];
  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId) || null;
  const conversationHistory = (selectedCampaign?.conversationHistory as ChatMessage[]) || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationHistory.length]);

  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/studio/campaigns", {
        name: newName,
        campaignType: newType,
      });
      return res.json();
    },
    onSuccess: (data: { campaign: StudioCampaign }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio/campaigns"] });
      setSelectedCampaignId(data.campaign.id);
      setNewName("");
      setNewType("platform");
      setShowNewForm(false);
      toast({ title: "Campaign created", description: data.campaign.name });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const sendChatMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/studio/campaigns/${selectedCampaignId}/chat`, {
        message: chatInput,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studio/campaigns"] });
      setChatInput("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createCampaignMutation.mutate();
  }

  function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || !selectedCampaignId) return;
    sendChatMutation.mutate();
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]" data-testid="page-copy-assistant-content">
      <div className="w-80 shrink-0 flex flex-col bg-steel-surface border border-steel-border rounded-sm">
        <div className="p-4 border-b border-steel-border">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-chrome-text" data-testid="header-campaigns">
              CAMPAIGNS
            </h2>
            <Button
              size="sm"
              onClick={() => setShowNewForm(!showNewForm)}
              data-testid="button-new-campaign"
            >
              {showNewForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              {showNewForm ? "Cancel" : "New Campaign"}
            </Button>
          </div>

          {showNewForm && (
            <form onSubmit={handleCreateCampaign} className="space-y-2" data-testid="form-new-campaign">
              <Input
                placeholder="Campaign name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="font-mono text-sm"
                data-testid="input-campaign-name"
              />
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="font-mono text-xs uppercase" data-testid="select-campaign-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform">Platform</SelectItem>
                  <SelectItem value="listing">Listing</SelectItem>
                  <SelectItem value="affiliate">Affiliate</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="submit"
                className="w-full"
                disabled={createCampaignMutation.isPending || !newName.trim()}
                data-testid="button-create-campaign"
              >
                {createCampaignMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create
              </Button>
            </form>
          )}
        </div>

        <div className="flex-1 overflow-auto" data-testid="campaign-list">
          {campaignsQuery.isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-4 text-center">
              <MessageSquare className="w-8 h-8 text-chrome-dim mx-auto mb-2" />
              <p className="font-mono text-xs text-chrome-dim uppercase" data-testid="text-no-campaigns">
                No campaigns yet
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {campaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  onClick={() => setSelectedCampaignId(campaign.id)}
                  className={`w-full text-left p-3 rounded-sm transition-colors ${
                    selectedCampaignId === campaign.id
                      ? "bg-industrial-blue/10 border border-industrial-blue"
                      : "border border-transparent hover-elevate"
                  }`}
                  data-testid={`button-campaign-${campaign.id}`}
                >
                  <p className="font-mono text-sm font-bold text-chrome-text truncate" data-testid={`text-campaign-name-${campaign.id}`}>
                    {campaign.name}
                  </p>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <Badge variant="secondary" className="font-mono text-xs uppercase">
                      {campaign.campaignType || "general"}
                    </Badge>
                    <Badge variant="outline" className="font-mono text-xs uppercase">
                      {campaign.status || "draft"}
                    </Badge>
                  </div>
                  <p className="font-mono text-xs text-chrome-dim mt-1" data-testid={`text-campaign-date-${campaign.id}`}>
                    {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-steel-surface border border-steel-border rounded-sm">
        {selectedCampaign ? (
          <>
            <div className="p-4 border-b border-steel-border">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-chrome-text" data-testid="text-selected-campaign-name">
                    {selectedCampaign.name}
                  </h2>
                  <p className="font-mono text-xs text-chrome-dim mt-0.5">
                    {selectedCampaign.campaignType || "general"} campaign
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-xs uppercase" data-testid="badge-campaign-status">
                  {selectedCampaign.status || "draft"}
                </Badge>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3" data-testid="chat-messages">
              {conversationHistory.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-10 h-10 text-chrome-dim mx-auto mb-3" />
                    <p className="font-mono text-sm text-chrome-dim uppercase" data-testid="text-start-conversation">
                      Start a conversation
                    </p>
                    <p className="text-xs text-chrome-dim mt-1">
                      Ask the AI to help develop your campaign strategy and copy
                    </p>
                  </div>
                </div>
              ) : (
                conversationHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    data-testid={`chat-message-${index}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-sm p-3 ${
                        msg.role === "user"
                          ? "bg-industrial-blue/10 border border-industrial-blue"
                          : "bg-steel-bg border border-steel-border"
                      }`}
                    >
                      <p className="font-mono text-xs text-chrome-dim uppercase mb-1">
                        {msg.role === "user" ? "You" : "AI Assistant"}
                      </p>
                      <p className="text-sm text-chrome-text whitespace-pre-wrap" data-testid={`text-message-content-${index}`}>
                        {msg.content}
                      </p>
                      {msg.timestamp && (
                        <p className="font-mono text-xs text-chrome-dim mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendChat} className="p-4 border-t border-steel-border">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type your message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={sendChatMutation.isPending}
                  className="flex-1 font-mono text-sm"
                  data-testid="input-chat-message"
                />
                <Button
                  type="submit"
                  disabled={sendChatMutation.isPending || !chatInput.trim()}
                  data-testid="button-send-chat"
                >
                  {sendChatMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-chrome-dim mx-auto mb-3" />
              <p className="font-mono text-sm text-chrome-dim uppercase" data-testid="text-select-campaign">
                Select a campaign or create a new one
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
