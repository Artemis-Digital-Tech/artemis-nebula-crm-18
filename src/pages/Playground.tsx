import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import {
  ygdrasilChatService,
  IYgdrasilChatRequest,
  IYgdrasilMediaMessage,
} from "@/services/YgdrasilChatService";
import { AgentWithComponents } from "@/components/agents/types";
import { ComponentRepository } from "@/services/components/ComponentRepository";
import { splitResponse } from "@/utils/messageSplitter";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { PlaygroundLoading } from "@/components/PlaygroundLoading";
import { StatusBadge } from "@/components/StatusBadge";
import { LeadStatusService, LeadStatus } from "@/services/LeadStatusService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bot,
  Send,
  Loader2,
  MessageSquare,
  Sparkles,
  GripVertical,
  X,
  User,
  Plus,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  CheckCircle,
  Play,
  Pause,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "document";
  mediaCaption?: string;
}

interface AgentComponent {
  id: string;
  agent_id: string;
  component_id: string;
  created_at: string;
  components?: {
    id: string;
    name: string;
    description: string;
    identifier: string;
    created_at: string;
    updated_at: string;
  };
}

interface AgentComponentConfiguration {
  id: string;
  agent_id: string;
  component_id: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  components?: {
    id: string;
    name: string;
    description: string;
    identifier: string;
  };
}

interface SortableMessageProps {
  message: ChatMessage;
  agentColor?: string;
}

const SortableMessage = ({ message, agentColor }: SortableMessageProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: message.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isUser = message.role === "user";
  const hasMedia = !!message.mediaUrl && !!message.mediaType;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleToggleVideo = () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      void videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex w-full gap-3 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback
            style={{
              backgroundColor: agentColor || "#3b82f6",
            }}
            className="text-white"
          >
            <Bot className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={`group relative max-w-[80%] rounded-2xl px-4 py-3 shadow-sm transition-all duration-200 ${
          isUser
            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
            : "bg-muted/70 text-foreground border border-border"
        }`}
      >
        <div className="flex items-start gap-2">
          {!isUser && (
            <button
              {...attributes}
              {...listeners}
              className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing mt-1"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <div className="flex-1 space-y-2">
            {hasMedia ? (
              <>
                {message.mediaType === "video" && (
                  <div className="relative w-full max-w-xs overflow-hidden rounded-xl bg-black/80">
                    <video
                      ref={videoRef}
                      src={message.mediaUrl}
                      className="w-full h-48 object-cover"
                      playsInline
                      muted
                      onEnded={() => setIsPlaying(false)}
                    />
                    <button
                      type="button"
                      onClick={handleToggleVideo}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                    >
                      <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/90 text-black shadow-lg">
                        {isPlaying ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5 ml-0.5" />
                        )}
                      </span>
                    </button>
                  </div>
                )}
                {message.mediaType === "image" && (
                  <div className="w-full max-w-xs overflow-hidden rounded-xl border border-border/70 bg-background">
                    <img
                      src={message.mediaUrl}
                      alt={message.mediaCaption || "Mídia enviada"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {message.mediaType === "document" && (
                  <div className="w-full max-w-xs overflow-hidden rounded-xl border border-border/70 bg-background p-3">
                    <a
                      href={message.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      Abrir PDF
                    </a>
                    {message.mediaCaption && (
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {message.mediaCaption}
                      </p>
                    )}
                  </div>
                )}
                {message.mediaCaption && message.mediaType !== "document" && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {message.mediaCaption}
                  </p>
                )}
                {message.content && (
                  <p className="text-sm leading-relaxed">{message.content}</p>
                )}
              </>
            ) : (
              <p className="text-sm leading-relaxed">{message.content}</p>
            )}
          </div>
        </div>
        <span
          className={`text-[11px] block mt-1 ${
            isUser ? "text-primary-foreground/80" : "text-muted-foreground"
          }`}
        >
          {message.timestamp.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <MessageSquare className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

const Playground = () => {
  const { organization } = useOrganization();
  const [agents, setAgents] = useState<AgentWithComponents[]>([]);
  const [selectedAgent, setSelectedAgent] =
    useState<AgentWithComponents | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [agentComponents, setAgentComponents] = useState<AgentComponent[]>([]);
  const [agentComponentConfigurations, setAgentComponentConfigurations] =
    useState<AgentComponentConfiguration[]>([]);
  const [availableLeads, setAvailableLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [newLeadData, setNewLeadData] = useState({
    name: "",
    contact_whatsapp: "",
    contact_email: "",
    description: "",
  });
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [leadStatuses, setLeadStatuses] = useState<LeadStatus[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const componentRepository = useMemo(() => new ComponentRepository(), []);
  const leadStatusService = useMemo(() => new LeadStatusService(), []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchAgents = useCallback(async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ai_interaction_settings")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      console.log("Agentes carregados do banco:", {
        count: data?.length || 0,
        agents: data?.map((a) => ({
          id: a.id,
          name: a.name,
          personality_traits: a.personality_traits,
          personality_traits_type: typeof a.personality_traits,
          personality_traits_is_array: Array.isArray(a.personality_traits),
        })),
      });

      if (error) {
        toast.error("Erro ao carregar agentes");
        console.error(error);
        return;
      }

      const agentsWithComponents = await Promise.all(
        (data || []).map(async (agent) => {
          try {
            const components = await componentRepository.findEnabledForAgent(
              agent.id
            );
            return {
              ...agent,
              nickname:
                (agent as { nickname?: string | null }).nickname ?? null,
              should_introduce_itself:
                (agent as { should_introduce_itself?: boolean })
                  .should_introduce_itself ?? true,
              memory_amount:
                (agent as { memory_amount?: string }).memory_amount ?? "20",
              personality_traits: Array.isArray(agent.personality_traits)
                ? agent.personality_traits
                : agent.personality_traits
                ? [agent.personality_traits]
                : [],
              components: components.map((c) => ({
                id: c.id,
                name: c.name,
                identifier: c.identifier,
              })),
            } as AgentWithComponents;
          } catch (error) {
            console.error(
              `Erro ao buscar componentes do agente ${agent.id}:`,
              error
            );
            return {
              ...agent,
              nickname:
                (agent as { nickname?: string | null }).nickname ?? null,
              should_introduce_itself:
                (agent as { should_introduce_itself?: boolean })
                  .should_introduce_itself ?? true,
              memory_amount:
                (agent as { memory_amount?: string }).memory_amount ?? "20",
              personality_traits: Array.isArray(agent.personality_traits)
                ? agent.personality_traits
                : agent.personality_traits
                ? [agent.personality_traits]
                : [],
              components: [],
            } as AgentWithComponents;
          }
        })
      );
      setAgents(agentsWithComponents);
    } catch (error) {
      console.error("Erro ao buscar agentes:", error);
      toast.error("Erro ao carregar agentes");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [organization?.id, componentRepository]);

  const fetchLeads = useCallback(async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("is_test", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Erro ao buscar leads:", error);
        return;
      }

      setAvailableLeads(data || []);

      setSelectedLead((current) => {
        if (current && data?.some((l) => l.id === current.id)) {
          return current;
        }
        return data && data.length > 0 ? data[0] : null;
      });
    } catch (error) {
      console.error("Erro ao buscar leads:", error);
    }
  }, [organization?.id]);

  const createMockLead = useCallback(() => {
    if (!organization?.id) return null;

    if (selectedLead) {
      const testPhoneNumber = selectedLead.contact_whatsapp || "553189572307";
      const testRemoteJid = testPhoneNumber.includes("@")
        ? testPhoneNumber
        : `${testPhoneNumber}@s.whatsapp.net`;

      return {
        id: selectedLead.id || `playground-${Date.now()}`,
        name: selectedLead.name || `Lead de Teste`,
        description: selectedLead.description || null,
        category: selectedLead.category || null,
        status: selectedLead.status || "new",
        contact_email: selectedLead.contact_email || null,
        contact_whatsapp: testPhoneNumber.replace("@s.whatsapp.net", ""),
        source: selectedLead.source || "playground",
        integration_start_time: selectedLead.integration_start_time || null,
        payment_link_url: selectedLead.payment_link_url || null,
        payment_stripe_id: selectedLead.payment_stripe_id || null,
        payment_status: selectedLead.payment_status || "nao_criado",
        created_at: selectedLead.created_at || new Date().toISOString(),
        updated_at: selectedLead.updated_at || new Date().toISOString(),
        payment_amount: selectedLead.payment_amount || null,
        paid_at: selectedLead.paid_at || null,
        whatsapp_verified: selectedLead.whatsapp_verified ?? true,
        ai_interaction_id:
          selectedAgent?.id || selectedLead.ai_interaction_id || null,
        remote_jid: testRemoteJid,
        organization_id: organization.id,
      };
    }

    const testPhoneNumber = "553189572307";
    const testRemoteJid = `${testPhoneNumber}@s.whatsapp.net`;
    const now = new Date().toISOString();

    return {
      id: `playground-${Date.now()}`,
      name: `Lead de Teste - ${organization.name || "Organização"}`,
      description: null,
      category: null,
      status: "new",
      contact_email: null,
      contact_whatsapp: testPhoneNumber,
      source: "playground",
      integration_start_time: null,
      payment_link_url: null,
      payment_stripe_id: null,
      payment_status: "nao_criado",
      created_at: now,
      updated_at: now,
      payment_amount: null,
      paid_at: null,
      whatsapp_verified: true,
      ai_interaction_id: selectedAgent?.id || null,
      remote_jid: testRemoteJid,
      organization_id: organization.id,
    };
  }, [organization?.id, organization?.name, selectedAgent?.id, selectedLead]);

  const createQuickLead = async () => {
    if (!organization?.id) {
      toast.error("Organização não encontrada");
      return;
    }

    setIsCreatingLead(true);
    try {
      const timestamp = Date.now();
      const phoneNumber = `553189572${String(timestamp).slice(-4)}`;
      const remoteJid = `${phoneNumber}@s.whatsapp.net`;

      const { data, error } = await supabase
        .from("leads")
        .insert({
          name: `Lead de Teste ${new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          description: "Lead criado automaticamente para testes no playground",
          contact_email: null,
          contact_whatsapp: phoneNumber,
          remote_jid: remoteJid,
          status: "new",
          source: "playground",
          organization_id: organization.id,
          whatsapp_verified: true,
          is_test: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Lead de teste criado automaticamente!");
      setSelectedLead(data);
      setAvailableLeads((prev) => [data, ...prev]);
    } catch (error: any) {
      console.error("Erro ao criar lead:", error);
      toast.error(error.message || "Erro ao criar lead de teste");
    } finally {
      setIsCreatingLead(false);
    }
  };

  const handleCreateLead = async () => {
    if (!organization?.id || !newLeadData.name.trim()) {
      toast.error("Nome do lead é obrigatório");
      return;
    }

    setIsCreatingLead(true);
    try {
      const phoneNumber = newLeadData.contact_whatsapp || "553189572307";
      const remoteJid = phoneNumber.includes("@")
        ? phoneNumber
        : `${phoneNumber}@s.whatsapp.net`;

      const { data, error } = await supabase
        .from("leads")
        .insert({
          name: newLeadData.name,
          description: newLeadData.description || null,
          contact_email: newLeadData.contact_email || null,
          contact_whatsapp: phoneNumber.replace("@s.whatsapp.net", ""),
          remote_jid: remoteJid,
          status: "new",
          source: "playground",
          organization_id: organization.id,
          whatsapp_verified: true,
          is_test: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Lead fictício criado com sucesso!");
      setSelectedLead(data);
      setAvailableLeads((prev) => [data, ...prev]);
      setNewLeadData({
        name: "",
        contact_whatsapp: "",
        contact_email: "",
        description: "",
      });
      setIsLeadDialogOpen(false);
    } catch (error: any) {
      console.error("Erro ao criar lead:", error);
      toast.error(error.message || "Erro ao criar lead fictício");
    } finally {
      setIsCreatingLead(false);
    }
  };

  const fetchLeadStatuses = useCallback(async () => {
    if (!organization?.id) return;

    setLoadingStatuses(true);
    try {
      const statuses = await leadStatusService.getAll(organization.id);
      setLeadStatuses(statuses);
    } catch (error) {
      console.error("Erro ao buscar status dos leads:", error);
    } finally {
      setLoadingStatuses(false);
    }
  }, [organization?.id, leadStatusService]);

  useEffect(() => {
    fetchAgents();
    fetchLeads();
    fetchLeadStatuses();
  }, [fetchAgents, fetchLeads, fetchLeadStatuses]);

  useEffect(() => {
    if (!selectedLead?.id || !organization?.id) return;

    const fetchLeadUpdate = async () => {
      try {
        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .eq("id", selectedLead.id)
          .single();

        if (error) {
          console.error("Erro ao buscar atualização do lead:", error);
          return;
        }

        if (data) {
          setSelectedLead((current) => {
            if (!current) return data;

            const statusChanged = current.status !== data.status;
            const hasOtherChanges =
              current.updated_at !== data.updated_at ||
              current.payment_status !== data.payment_status ||
              current.payment_amount !== data.payment_amount ||
              current.paid_at !== data.paid_at;

            if (statusChanged || hasOtherChanges) {
              if (statusChanged) {
                toast.success(`Status do lead atualizado: ${data.status}`, {
                  duration: 2000,
                });
              }
              return data;
            }

            return current;
          });

          setAvailableLeads((prev) =>
            prev.map((lead) => (lead.id === data.id ? data : lead))
          );
        }
      } catch (error) {
        console.error("Erro ao buscar atualização do lead:", error);
      }
    };

    const intervalId = setInterval(fetchLeadUpdate, 5000);

    return () => clearInterval(intervalId);
  }, [selectedLead?.id, organization?.id]);

  const fetchAgentComponents = useCallback(
    async (agentId: string) => {
      if (!organization?.id) return;

      try {
        const { data: componentsData, error: componentsError } = await (
          supabase as any
        )
          .from("agent_components")
          .select(
            "id,agent_id,component_id,created_at,components(id,name,description,identifier,created_at,updated_at)"
          )
          .eq("agent_id", agentId);

        if (componentsError) {
          console.error("Error loading agent components:", {
            agentId,
            error: componentsError,
          });
          setAgentComponents([]);
        } else {
          setAgentComponents((componentsData || []) as AgentComponent[]);
        }

        const { data: configsData, error: configsError } = await (
          supabase as any
        )
          .from("agent_component_configurations")
          .select(
            "id,agent_id,component_id,config,created_at,updated_at,components(id,name,description,identifier)"
          )
          .eq("agent_id", agentId);

        if (configsError) {
          console.error("Error loading agent component configurations:", {
            agentId,
            error: configsError,
          });
          setAgentComponentConfigurations([]);
        } else {
          console.log("Agent component configurations loaded:", {
            agentId,
            count: configsData?.length || 0,
            data: configsData,
          });
          setAgentComponentConfigurations(
            (configsData || []) as AgentComponentConfiguration[]
          );
        }
      } catch (error) {
        console.error("Erro ao buscar componentes do agente:", error);
        setAgentComponents([]);
        setAgentComponentConfigurations([]);
      }
    },
    [organization?.id]
  );

  useEffect(() => {
    if (selectedAgent?.id) {
      fetchAgentComponents(selectedAgent.id);
    } else {
      setAgentComponents([]);
      setAgentComponentConfigurations([]);
    }
  }, [selectedAgent?.id, fetchAgentComponents]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedAgent || !organization) {
      return;
    }

    let currentAgentComponents = agentComponents;
    let currentAgentComponentConfigurations = agentComponentConfigurations;

    if (
      currentAgentComponents.length === 0 &&
      currentAgentComponentConfigurations.length === 0
    ) {
      console.log("Buscando componentes do agente antes de enviar mensagem...");

      try {
        const { data: componentsData, error: componentsError } = await (
          supabase as any
        )
          .from("agent_components")
          .select(
            "id,agent_id,component_id,created_at,components(id,name,description,identifier,created_at,updated_at)"
          )
          .eq("agent_id", selectedAgent.id);

        if (componentsError) {
          console.error("Error loading agent components before send:", {
            agentId: selectedAgent.id,
            error: componentsError,
          });
        } else {
          currentAgentComponents = (componentsData || []) as AgentComponent[];
          setAgentComponents(currentAgentComponents);
          console.log("Agent components carregados antes do envio:", {
            agentId: selectedAgent.id,
            count: currentAgentComponents.length,
            components: currentAgentComponents,
          });
        }

        const { data: configsData, error: configsError } = await (
          supabase as any
        )
          .from("agent_component_configurations")
          .select(
            "id,agent_id,component_id,config,created_at,updated_at,components(id,name,description,identifier)"
          )
          .eq("agent_id", selectedAgent.id);

        if (configsError) {
          console.error(
            "Error loading agent component configurations before send:",
            {
              agentId: selectedAgent.id,
              error: configsError,
            }
          );
        } else {
          currentAgentComponentConfigurations = (configsData ||
            []) as AgentComponentConfiguration[];
          setAgentComponentConfigurations(currentAgentComponentConfigurations);
          console.log(
            "Agent component configurations carregadas antes do envio:",
            {
              agentId: selectedAgent.id,
              count: currentAgentComponentConfigurations.length,
              configurations: currentAgentComponentConfigurations,
            }
          );
        }
      } catch (error) {
        console.error("Erro ao buscar componentes antes do envio:", error);
      }
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setSending(true);

    try {
      const mockLead = createMockLead();

      if (!mockLead) {
        toast.error("Erro ao criar lead de teste. Verifique a organização.");
        setSending(false);
        return;
      }

      const mockOrganization = {
        id: organization.id,
        name: organization.name || "Organização",
        plan: organization.plan || "pro",
        trial_ends_at:
          organization.trial_ends_at ||
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        stripe_customer_id: null,
        logo_url: organization.logo_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        company_name:
          organization.company_name || organization.name || "Organização",
        cnpj: organization.cnpj || "",
        phone: organization.phone || "",
        address: organization.address || "",
        website: organization.website || null,
      };

      type LeadStatus = {
        id: string;
        organization_id: string;
        status_key: string;
        label: string;
        is_required: boolean;
        display_order: number;
        created_at: string;
        updated_at: string;
      };

      type CachedLeadStatuses = {
        data: LeadStatus[];
        timestamp: number;
        organization_id: string;
      };

      const CACHE_KEY = `lead_statuses_cache_${organization.id}`;
      const CACHE_DURATION = 10 * 60 * 1000;

      let leadStatusesData: LeadStatus[] = [];

      try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        const now = Date.now();

        if (cachedData) {
          const parsed: CachedLeadStatuses = JSON.parse(cachedData);
          const timeDiff = now - parsed.timestamp;

          if (
            parsed.organization_id === organization.id &&
            timeDiff < CACHE_DURATION
          ) {
            leadStatusesData = parsed.data;
          } else {
            localStorage.removeItem(CACHE_KEY);
          }
        }

        if (leadStatusesData.length === 0) {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

          const {
            data: { session },
          } = await supabase.auth.getSession();
          const accessToken = session?.access_token || supabaseKey;

          const response = await fetch(
            `${supabaseUrl}/rest/v1/lead_statuses?select=*&organization_id=eq.${organization.id}&order=display_order.asc`,
            {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                "accept-profile": "public",
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            leadStatusesData = (data || []) as LeadStatus[];

            const cacheData: CachedLeadStatuses = {
              data: leadStatusesData,
              timestamp: now,
              organization_id: organization.id,
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
          } else {
            const errorText = await response.text();
            console.error(
              "Erro ao buscar status dos leads:",
              response.status,
              errorText
            );
            toast.error("Erro ao buscar status dos leads");
          }
        }
      } catch (error) {
        console.error("Erro ao buscar status dos leads:", error);
        toast.error("Erro ao buscar status dos leads");
      }

      type OrganizationProductRow = NonNullable<
        IYgdrasilChatRequest["organization_products"]
      >[number];
      let organizationProducts: OrganizationProductRow[] = [];
      try {
        if (organization?.id) {
          const { data: productsData, error: productsError } = await (
            supabase as any
          )
            .from("products")
            .select(
              "id, name, category, description, price, currency, features, target_audience, use_cases, differentiators, tags"
            )
            .eq("organization_id", organization.id)
            .eq("is_active", true)
            .order("name");

          if (!productsError && Array.isArray(productsData)) {
            organizationProducts = productsData as unknown as OrganizationProductRow[];
          }
        }
      } catch (error) {
        console.error("Erro ao buscar produtos da organização:", error);
      }

      const messageContent = inputMessage.trim();

      // Garantir que todos os campos do ai_config sejam sempre enviados
      const aiConfig = {
        id: selectedAgent.id || "",
        name: selectedAgent.name || "",
        nickname: selectedAgent.nickname ?? null,
        conversation_focus: selectedAgent.conversation_focus || "",
        priority: selectedAgent.priority || "medium",
        rejection_action: selectedAgent.rejection_action || "follow_up",
        tone: selectedAgent.tone || "professional",
        main_objective: selectedAgent.main_objective || "",
        additional_instructions: selectedAgent.additional_instructions ?? null,
        created_at: selectedAgent.created_at || new Date().toISOString(),
        updated_at: selectedAgent.updated_at || new Date().toISOString(),
        closing_instructions: selectedAgent.closing_instructions ?? null,
        organization_id: organization.id || "",
        personality_traits: Array.isArray(selectedAgent.personality_traits)
          ? selectedAgent.personality_traits
          : selectedAgent.personality_traits
          ? [selectedAgent.personality_traits]
          : [],
        communication_style: selectedAgent.communication_style || "balanced",
        expertise_level: selectedAgent.expertise_level || "intermediate",
        response_length: selectedAgent.response_length || "medium",
        empathy_level: selectedAgent.empathy_level || "moderate",
        formality_level: selectedAgent.formality_level || "professional",
        humor_level: selectedAgent.humor_level || "none",
        proactivity_level: selectedAgent.proactivity_level || "moderate",
        agent_description: selectedAgent.agent_description ?? null,
        agent_avatar_url: selectedAgent.agent_avatar_url ?? null,
        agent_color: selectedAgent.agent_color || "#3b82f6",
        should_introduce_itself: selectedAgent.should_introduce_itself ?? true,
        memory_amount: selectedAgent.memory_amount || "20",
      };

      const configuredComponentIdentifiers = (currentAgentComponents || [])
        .map((ac) => ac.components?.identifier)
        .filter((identifier): identifier is string => !!identifier);

      let mediaConfigurations: Record<
        string,
        {
          mediaItems?: Array<{
            id: string;
            type: "image" | "video";
            url: string;
            fileName: string;
            usageDescription: string;
          }>;
        }
      > | null = null;

      if (configuredComponentIdentifiers.includes("media_sender")) {
        try {
          const { ComponentRepository } = await import(
            "@/services/components/ComponentRepository"
          );
          const componentRepository = new ComponentRepository();
          const mediaComponent = await componentRepository.findByIdentifier(
            "media_sender"
          );

          if (mediaComponent && organization?.id) {
            const { data: mediaData, error: mediaError } = await (
              supabase as any
            )
              .from("component_configurations")
              .select("config")
              .eq("component_id", mediaComponent.id)
              .eq("organization_id", organization.id)
              .is("user_id", null)
              .maybeSingle();

            if (!mediaError && mediaData?.config?.mediaItems) {
              mediaConfigurations = {
                media_sender: {
                  mediaItems: mediaData.config.mediaItems,
                },
              };
            }
          }
        } catch (error) {
          console.error("Erro ao buscar configurações de mídia:", error);
        }
      }

      const request: IYgdrasilChatRequest = {
        event: "messages.upsert",
        instance: "playground-instance",
        lead: mockLead,
        organization: mockOrganization,
        ai_config: aiConfig,
        agent_components: configuredComponentIdentifiers as string[],
        agent_component_configurations:
          currentAgentComponentConfigurations || [],
        component_configurations: mediaConfigurations || undefined,
        lead_statuses: leadStatusesData,
        organization_products: organizationProducts,
        message: {
          conversation: messageContent,
        },
        messageType: "conversation",
        conversation: messageContent,
        messageId: `msg-${Date.now()}`,
        contactName: mockLead?.name || "Lead de Teste",
        phoneNumber: mockLead?.contact_whatsapp || "553189572307",
        remoteJid: mockLead?.remote_jid || "553189572307@s.whatsapp.net",
        fromMe: false,
        timestamp: new Date().toISOString(),
        msg_content: messageContent,
      };

      // Validar que todos os campos obrigatórios estão presentes
      const aiConfigKeys = Object.keys(aiConfig);
      const expectedKeys = [
        "id",
        "name",
        "nickname",
        "conversation_focus",
        "priority",
        "rejection_action",
        "tone",
        "main_objective",
        "additional_instructions",
        "created_at",
        "updated_at",
        "closing_instructions",
        "organization_id",
        "personality_traits",
        "communication_style",
        "expertise_level",
        "response_length",
        "empathy_level",
        "formality_level",
        "humor_level",
        "proactivity_level",
        "agent_description",
        "agent_avatar_url",
        "agent_color",
        "should_introduce_itself",
        "memory_amount",
      ];
      const missingKeys = expectedKeys.filter(
        (key) => !aiConfigKeys.includes(key)
      );

      if (missingKeys.length > 0) {
        console.warn("⚠️ Campos faltando no ai_config:", missingKeys);
      }

      console.log("Request sendo enviado:", {
        msg_content: request.msg_content,
        conversation: request.conversation,
        message: request.message,
        personality_traits: request.ai_config.personality_traits,
        personality_traits_count:
          request.ai_config.personality_traits?.length || 0,
        nickname: request.ai_config.nickname,
        should_introduce_itself: request.ai_config.should_introduce_itself,
        agent_components: request.agent_components,
        agent_component_configurations: request.agent_component_configurations,
        component_configurations: request.component_configurations,
        agent_components_count: Array.isArray(request.agent_components)
          ? request.agent_components.length
          : 0,
        agent_component_configurations_count:
          request.agent_component_configurations?.length || 0,
        agent_components_identifiers:
          Array.isArray(request.agent_components) &&
          typeof request.agent_components[0] === "string"
            ? request.agent_components
            : (
                request.agent_components as unknown as Array<{
                  components?: { identifier?: string };
                  component_id?: string;
                }>
              )?.map((ac) => ac.components?.identifier || ac.component_id),
        agent_component_configurations_details:
          request.agent_component_configurations?.map((acc) => ({
            id: acc.id,
            component_id: acc.component_id,
            component_name: acc.components?.name,
            component_identifier: acc.components?.identifier,
            config: acc.config,
          })),
        media_items_count:
          request.component_configurations?.media_sender?.mediaItems?.length ||
          0,
        ai_config: request.ai_config,
        ai_config_keys: Object.keys(request.ai_config),
        ai_config_keys_count: Object.keys(request.ai_config).length,
      });

      setIsTyping(true);
      const response = await ygdrasilChatService.sendMessage(request);

      if (response.success) {
        if (response.mediaMessages && response.mediaMessages.length > 0) {
          response.mediaMessages.forEach(
            (media: IYgdrasilMediaMessage, index: number) => {
              const mediaMessage: ChatMessage = {
                id: `assistant-media-${Date.now()}-${index}`,
                role: "assistant",
                content: "",
                timestamp: new Date(),
                mediaUrl: media.url,
                mediaType: media.type,
                mediaCaption: media.caption || "",
              };

              setMessages((prev) => [...prev, mediaMessage]);
            }
          );
        }

        if (response.response) {
          const messageParts = splitResponse(response.response, 300);

          for (let i = 0; i < messageParts.length; i++) {
            const part = messageParts[i];
            const delay = i * 500;

            await new Promise((resolve) => setTimeout(resolve, delay));

            const assistantMessage: ChatMessage = {
              id: `assistant-${Date.now()}-${i}`,
              role: "assistant",
              content: part,
              timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
          }
        }
      } else {
        toast.error(response.error || "Erro ao enviar mensagem");
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Desculpe, ocorreu um erro ao processar sua mensagem.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }

      setIsTyping(false);
    } catch (error: unknown) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem");
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Desculpe, ocorreu um erro ao processar sua mensagem.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setMessages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const activeMessage = items[oldIndex];
        const overMessage = items[newIndex];

        if (
          activeMessage.role === "assistant" &&
          overMessage.role === "assistant"
        ) {
          const assistantMessages = items.filter(
            (msg) => msg.role === "assistant"
          );
          const userMessages = items.filter((msg) => msg.role === "user");

          const assistantOldIndex = assistantMessages.findIndex(
            (msg) => msg.id === active.id
          );
          const assistantNewIndex = assistantMessages.findIndex(
            (msg) => msg.id === over.id
          );

          const reorderedAssistants = arrayMove(
            assistantMessages,
            assistantOldIndex,
            assistantNewIndex
          );

          const result = [...userMessages, ...reorderedAssistants].sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
          );

          return result;
        }

        return items;
      });
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success("Chat limpo");
  };

  const assistantMessages = messages.filter((msg) => msg.role === "assistant");

  if (initialLoading) {
    return <PlaygroundLoading />;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.08),transparent_25%),radial-gradient(circle_at_50%_80%,rgba(236,72,153,0.07),transparent_30%)] animate-pulse" />
          <CardHeader className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/80 via-primary to-secondary text-primary-foreground grid place-items-center shadow-lg shadow-primary/30 animate-[pulse_4s_ease-in-out_infinite]">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-2xl">
                    Playground de Agentes
                  </CardTitle>
                  <Badge variant="secondary" className="gap-1">
                    <Bot className="h-4 w-4" />
                    Teste seus agentes
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  Selecione um agente e teste conversas interativas com drag &
                  drop
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="col-span-1 space-y-6">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="space-y-3">
                <CardTitle className="text-lg">Configuração</CardTitle>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Selecionar Agente
                  </label>
                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Select
                      value={selectedAgent?.id || ""}
                      onValueChange={(value) => {
                        const agent = agents.find((a) => a.id === value);
                        setSelectedAgent(agent || null);
                        setMessages([]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um agente" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    agent.agent_color || "#3b82f6",
                                }}
                              />
                              <span>{agent.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {selectedAgent && (
                  <>
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">
                          Selecionar Lead
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={createQuickLead}
                          disabled={isCreatingLead}
                          className="h-7 px-2 text-xs"
                          title="Criar lead de teste automaticamente"
                        >
                          {isCreatingLead ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3 mr-1" />
                              Rápido
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Select
                          value={selectedLead?.id || ""}
                          onValueChange={(value) => {
                            const lead = availableLeads.find(
                              (l) => l.id === value
                            );
                            setSelectedLead(lead || null);
                          }}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione um lead" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableLeads.map((lead) => (
                              <SelectItem key={lead.id} value={lead.id}>
                                <div className="flex items-center gap-2">
                                  <User className="h-3 w-3" />
                                  <span className="truncate">{lead.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Dialog
                          open={isLeadDialogOpen}
                          onOpenChange={setIsLeadDialogOpen}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="px-3"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Criar Lead Fictício</DialogTitle>
                              <DialogDescription>
                                Crie um lead fictício para testar o agente no
                                playground
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="lead-name">Nome *</Label>
                                <Input
                                  id="lead-name"
                                  placeholder="Nome do lead"
                                  value={newLeadData.name}
                                  onChange={(e) =>
                                    setNewLeadData({
                                      ...newLeadData,
                                      name: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="lead-whatsapp">WhatsApp</Label>
                                <Input
                                  id="lead-whatsapp"
                                  placeholder="553189572307"
                                  value={newLeadData.contact_whatsapp}
                                  onChange={(e) =>
                                    setNewLeadData({
                                      ...newLeadData,
                                      contact_whatsapp: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="lead-email">Email</Label>
                                <Input
                                  id="lead-email"
                                  type="email"
                                  placeholder="email@exemplo.com"
                                  value={newLeadData.contact_email}
                                  onChange={(e) =>
                                    setNewLeadData({
                                      ...newLeadData,
                                      contact_email: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="lead-description">
                                  Descrição
                                </Label>
                                <Input
                                  id="lead-description"
                                  placeholder="Descrição do lead"
                                  value={newLeadData.description}
                                  onChange={(e) =>
                                    setNewLeadData({
                                      ...newLeadData,
                                      description: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setIsLeadDialogOpen(false)}
                              >
                                Cancelar
                              </Button>
                              <Button
                                onClick={handleCreateLead}
                                disabled={
                                  isCreatingLead || !newLeadData.name.trim()
                                }
                              >
                                {isCreatingLead ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Criando...
                                  </>
                                ) : (
                                  "Criar Lead"
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={selectedAgent.agent_avatar_url || undefined}
                          />
                          <AvatarFallback
                            style={{
                              backgroundColor:
                                selectedAgent.agent_color || "#3b82f6",
                            }}
                            className="text-white"
                          >
                            <Bot className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {selectedAgent.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {selectedAgent.conversation_focus}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={clearChat}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Limpar Chat
                      </Button>
                    </div>
                  </>
                )}
              </CardHeader>
            </Card>

            {selectedLead && (
              <Card className="border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Dados do Lead
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-base mb-2">
                        {selectedLead.name}
                      </h3>
                      {selectedLead.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {selectedLead.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">WhatsApp:</span>
                        <span className="font-medium">
                          {selectedLead.contact_whatsapp || "Não informado"}
                        </span>
                      </div>
                      {selectedLead.contact_email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Email:</span>
                          <span className="font-medium">
                            {selectedLead.contact_email}
                          </span>
                        </div>
                      )}
                      {selectedLead.category && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">
                            Categoria:
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {selectedLead.category}
                          </Badge>
                        </div>
                      )}
                      {selectedLead.source && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Origem:</span>
                          <span className="font-medium">
                            {selectedLead.source}
                          </span>
                        </div>
                      )}
                      {selectedLead.created_at && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Criado em:
                          </span>
                          <span className="font-medium">
                            {format(
                              new Date(selectedLead.created_at),
                              "dd/MM/yyyy 'às' HH:mm",
                              { locale: ptBR }
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {selectedLead.payment_status &&
                      selectedLead.payment_status !== "nao_criado" && (
                        <div className="pt-3 border-t space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <DollarSign className="h-4 w-4" />
                            Informações de Pagamento
                          </div>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                Status:
                              </span>
                              <Badge
                                variant={
                                  selectedLead.payment_status === "pago"
                                    ? "default"
                                    : selectedLead.payment_status === "expirado"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {selectedLead.payment_status === "pago"
                                  ? "Pago"
                                  : selectedLead.payment_status ===
                                    "link_gerado"
                                  ? "Link Gerado"
                                  : selectedLead.payment_status === "expirado"
                                  ? "Expirado"
                                  : selectedLead.payment_status}
                              </Badge>
                            </div>
                            {selectedLead.payment_amount && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  Valor:
                                </span>
                                <span className="font-medium">
                                  {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(selectedLead.payment_amount)}
                                </span>
                              </div>
                            )}
                            {selectedLead.paid_at && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  Pago em:
                                </span>
                                <span className="font-medium">
                                  {format(
                                    new Date(selectedLead.paid_at),
                                    "dd/MM/yyyy 'às' HH:mm",
                                    { locale: ptBR }
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold">Status no Funil</h4>
                      {loadingStatuses && (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {loadingStatuses ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : leadStatuses.length > 0 ? (
                      <div className="space-y-2">
                        <div className="mb-3">
                          <StatusBadge status={selectedLead.status} />
                        </div>
                        <div className="relative">
                          <div className="flex flex-col gap-2">
                            {leadStatuses
                              .filter((s) => s.status_key !== "finished")
                              .map((status) => {
                                const isCurrentStatus =
                                  status.status_key === selectedLead.status;
                                const currentStatusOrder =
                                  leadStatuses.find(
                                    (s) => s.status_key === selectedLead.status
                                  )?.display_order ?? 0;
                                const isPastStatus =
                                  currentStatusOrder > status.display_order;
                                const isFutureStatus =
                                  currentStatusOrder < status.display_order;

                                return (
                                  <div
                                    key={status.id}
                                    className={`relative flex items-center gap-2 p-2 rounded-md transition-all ${
                                      isCurrentStatus
                                        ? "bg-primary/10 border border-primary/30"
                                        : isPastStatus
                                        ? "bg-green-500/10 border border-green-500/20"
                                        : "bg-muted/50 border border-border/50"
                                    }`}
                                  >
                                    <div
                                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                        isCurrentStatus
                                          ? "bg-primary"
                                          : isPastStatus
                                          ? "bg-green-500"
                                          : "bg-muted-foreground/30"
                                      }`}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <span
                                          className={`text-xs font-medium ${
                                            isCurrentStatus
                                              ? "text-primary"
                                              : isPastStatus
                                              ? "text-green-600 dark:text-green-400"
                                              : "text-muted-foreground"
                                          }`}
                                        >
                                          {status.label}
                                        </span>
                                        {isCurrentStatus && (
                                          <CheckCircle className="h-3 w-3 text-primary flex-shrink-0" />
                                        )}
                                        {isPastStatus && (
                                          <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                          {leadStatuses.find(
                            (s) => s.status_key === "finished"
                          ) && (
                            <div className="mt-3 pt-3 border-t">
                              <div
                                className={`flex items-center gap-2 p-2 rounded-md ${
                                  selectedLead.status === "finished"
                                    ? "bg-green-500/10 border border-green-500/30"
                                    : "bg-muted/30 border border-border/50"
                                }`}
                              >
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    selectedLead.status === "finished"
                                      ? "bg-green-500"
                                      : "bg-muted-foreground/30"
                                  }`}
                                />
                                <span
                                  className={`text-xs font-medium ${
                                    selectedLead.status === "finished"
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {leadStatuses.find(
                                    (s) => s.status_key === "finished"
                                  )?.label || "Finalizado"}
                                </span>
                                {selectedLead.status === "finished" && (
                                  <CheckCircle className="h-3 w-3 text-green-500 ml-auto" />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                              <span>Atual</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <span>Concluído</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                              <span>Pendente</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-4">
                        Nenhum status configurado
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="col-span-3 border-border/80 shadow-sm flex flex-col h-[calc(100vh-12rem)]">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Chat</CardTitle>
                {selectedAgent && (
                  <Badge
                    variant="outline"
                    className="border-primary/40 text-primary"
                    style={{
                      borderColor: selectedAgent.agent_color || "#3b82f6",
                      color: selectedAgent.agent_color || "#3b82f6",
                    }}
                  >
                    {selectedAgent.name}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              {selectedAgent ? (
                <>
                  <ScrollArea className="flex-1 px-6 py-4">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3">
                        <MessageSquare className="h-12 w-12 opacity-50" />
                        <p className="text-lg font-medium">
                          Nenhuma mensagem ainda
                        </p>
                        <p className="text-sm">
                          Comece uma conversa com {selectedAgent.name}
                        </p>
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={assistantMessages.map((m) => m.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-3">
                            {messages.map((message) => (
                              <SortableMessage
                                key={message.id}
                                message={message}
                                agentColor={selectedAgent.agent_color}
                              />
                            ))}
                            {isTyping && (
                              <div className="flex w-full gap-3 justify-start">
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarFallback
                                    style={{
                                      backgroundColor:
                                        selectedAgent.agent_color || "#3b82f6",
                                    }}
                                    className="text-white"
                                  >
                                    <Bot className="w-4 h-4" />
                                  </AvatarFallback>
                                </Avatar>
                                <div className="group relative max-w-[80%] rounded-2xl px-4 py-3 shadow-sm bg-muted/70 text-foreground border border-border">
                                  <div className="flex items-center gap-1">
                                    <span
                                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                                      style={{ animationDelay: "0ms" }}
                                    ></span>
                                    <span
                                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                                      style={{ animationDelay: "150ms" }}
                                    ></span>
                                    <span
                                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                                      style={{ animationDelay: "300ms" }}
                                    ></span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </ScrollArea>
                  <div className="border-t border-border/80 p-4 bg-card/60 backdrop-blur flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <Input
                        placeholder="Digite sua mensagem..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="bg-muted/60 border-border focus-visible:ring-primary"
                        disabled={sending}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={sending || !inputMessage.trim()}
                        className="gap-2"
                        style={{
                          backgroundColor:
                            selectedAgent?.agent_color || undefined,
                        }}
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Enviar
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-3">
                  <Bot className="h-12 w-12 opacity-50" />
                  <p className="text-lg font-medium">
                    Selecione um agente para começar
                  </p>
                  <p className="text-sm">Escolha um agente no painel lateral</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Playground;
