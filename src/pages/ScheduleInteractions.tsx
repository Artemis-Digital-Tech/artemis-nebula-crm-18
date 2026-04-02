import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Clock,
  Calendar,
  Eye,
  X,
  Search,
  RefreshCw,
  Bot,
  Users,
  Settings2,
  Grid3x3,
  List,
  Filter,
  Smartphone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatPhoneDisplay } from "@/lib/utils";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LeadsDragDrop } from "@/components/LeadsDragDrop";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { DatePicker } from "@/components/ui/date-picker";

interface ScheduledInteraction {
  leadId: string;
  leadName: string;
  leadWhatsApp: string;
  remoteJid: string;
  scheduledDateTime: string;
  aiInteractionId: string;
  instanceName: string;
}

interface ScheduledInteractionRow {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_whatsapp: string;
  remote_jid: string;
  scheduled_at: string;
  ai_interaction_id: string;
  ai_interaction_name: string;
  instance_name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface AIInteractionSetting {
  id: string;
  name: string;
  conversation_focus: string;
}

interface AvailableLead {
  id: string;
  name: string;
  contact_whatsapp: string | null;
  remote_jid: string | null;
  whatsapp_verified: boolean;
}

const ScheduleInteractions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { organization } = useOrganization();
  const organizationId = organization?.id;
  const [activeTab, setActiveTab] = useState("view");
  const [leads, setLeads] = useState<ScheduledInteraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [defaultAiInteractionId, setDefaultAiInteractionId] =
    useState<string>("");
  const [instanceName, setInstanceName] = useState<string>("");
  const [scheduledInteractions, setScheduledInteractions] = useState<
    ScheduledInteractionRow[]
  >([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("not_cancelled");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [scheduledDateFilterStart, setScheduledDateFilterStart] =
    useState<string>("");
  const [scheduledDateFilterEnd, setScheduledDateFilterEnd] =
    useState<string>("");
  const [aiInteractionFilter, setAiInteractionFilter] = useState<string>("all");
  const [instanceFilter, setInstanceFilter] = useState<string>("all");
  const [availableInstances, setAvailableInstances] = useState<string[]>([]);
  const [aiInteractionSettings, setAiInteractionSettings] = useState<
    AIInteractionSetting[]
  >([]);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [availableLeads, setAvailableLeads] = useState<AvailableLead[]>([]);
  const [loadingAvailableLeads, setLoadingAvailableLeads] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [leadsSheetOpen, setLeadsSheetOpen] = useState(false);
  const [searchAvailableLeads, setSearchAvailableLeads] = useState("");
  const [dateFilterStart, setDateFilterStart] = useState<string>("");
  const [dateFilterEnd, setDateFilterEnd] = useState<string>("");
  const [remoteJidFilter, setRemoteJidFilter] = useState<string>("all");
  const [sheetWidth, setSheetWidth] = useState<number>(512);
  const [isResizing, setIsResizing] = useState(false);

  const fetchAvailableLeads = useCallback(async () => {
    setLoadingAvailableLeads(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) {
        setLoadingAvailableLeads(false);
        return;
      }

      let query = supabase
        .from("leads")
        .select(
          "id, name, contact_whatsapp, remote_jid, whatsapp_verified, created_at",
        )
        .eq("organization_id", profile.organization_id)
        .or("is_test.is.null,is_test.eq.false")
        .not("contact_whatsapp", "is", null)
        .eq("whatsapp_verified", true);

      if (remoteJidFilter === "with") {
        query = query.not("remote_jid", "is", null);
      } else if (remoteJidFilter === "without") {
        query = query.is("remote_jid", null);
      }

      if (dateFilterStart) {
        const startDate = new Date(dateFilterStart);
        startDate.setHours(0, 0, 0, 0);
        query = query.gte("created_at", startDate.toISOString());
      }

      if (dateFilterEnd) {
        const endDate = new Date(dateFilterEnd);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endDate.toISOString());
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Erro na query:", error);
        throw error;
      }

      const leadsData: AvailableLead[] = (data || []).map((lead) => ({
        id: lead.id,
        name: lead.name,
        contact_whatsapp: lead.contact_whatsapp,
        remote_jid: lead.remote_jid,
        whatsapp_verified: lead.whatsapp_verified || false,
      }));

      setAvailableLeads(leadsData);
    } catch (error: any) {
      console.error("Erro ao carregar leads disponíveis:", error);
      toast.error("Erro ao carregar leads disponíveis");
    } finally {
      setLoadingAvailableLeads(false);
    }
  }, [dateFilterStart, dateFilterEnd, remoteJidFilter]);

  const computedScheduledLeads = useMemo(() => {
    if (availableLeads.length === 0 || selectedLeadIds.length === 0) {
      return [];
    }

    const now = new Date();
    return selectedLeadIds
      .map((leadId, index) => {
        const lead = availableLeads.find((l) => l.id === leadId);
        if (!lead || !lead.remote_jid || !lead.whatsapp_verified) return null;

        const scheduledDate = new Date(now);
        scheduledDate.setMinutes(scheduledDate.getMinutes() + index * 5);

        return {
          leadId: lead.id,
          leadName: lead.name,
          leadWhatsApp: lead.contact_whatsapp || "",
          remoteJid: lead.remote_jid || "",
          scheduledDateTime: format(scheduledDate, "yyyy-MM-dd'T'HH:mm"),
          aiInteractionId:
            defaultAiInteractionId || aiInteractionSettings[0]?.id || "",
          instanceName: instanceName,
        };
      })
      .filter((lead): lead is ScheduledInteraction => lead !== null);
  }, [
    selectedLeadIds,
    availableLeads,
    defaultAiInteractionId,
    aiInteractionSettings,
    instanceName,
  ]);

  useEffect(() => {
    if (selectedLeadIds.length === 0) {
      setLeads([]);
      return;
    }

    setLeads((prevLeads) => {
      const prevLeadIds = new Set(prevLeads.map((l) => l.leadId));
      const newLeadIds = new Set(computedScheduledLeads.map((l) => l.leadId));

      if (
        prevLeadIds.size === newLeadIds.size &&
        [...prevLeadIds].every((id) => newLeadIds.has(id))
      ) {
        return prevLeads;
      }

      return computedScheduledLeads;
    });
  }, [computedScheduledLeads, selectedLeadIds.length]);

  const fetchAiInteractionSettings = useCallback(async () => {
    if (!organizationId) return;
    setLoadingSettings(true);
    try {
      const { data, error } = await supabase
        .from("ai_interaction_settings")
        .select("id, name, conversation_focus")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });

      if (error) throw error;
      setAiInteractionSettings(data || []);

      if (data && data.length > 0 && !defaultAiInteractionId) {
        setDefaultAiInteractionId(data[0].id);
      }
    } catch (error: any) {
      console.error("Erro ao carregar configurações de IA:", error);
      toast.error("Erro ao carregar configurações de IA");
    } finally {
      setLoadingSettings(false);
    }
  }, [defaultAiInteractionId, organizationId]);

  useEffect(() => {
    fetchAiInteractionSettings();
  }, [fetchAiInteractionSettings]);

  useEffect(() => {
    if (activeTab === "schedule") {
      fetchAvailableLeads();
    }
  }, [
    activeTab,
    dateFilterStart,
    dateFilterEnd,
    remoteJidFilter,
    fetchAvailableLeads,
  ]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const state = location.state as {
          leads?: any[];
          aiInteractionId?: string;
          instanceName?: string;
        };

        if (!state?.leads || state.leads.length === 0) {
          const { data: whatsappInstances } = await supabase
            .from("whatsapp_instances")
            .select("instance_name")
            .eq("organization_id", organizationId)
            .eq("status", "connected")
            .order("created_at", { ascending: false })
            .limit(1);

          const instance = whatsappInstances?.[0]?.instance_name || "";
          setInstanceName(instance);
          return;
        }

        const { data: whatsappInstances } = await supabase
          .from("whatsapp_instances")
          .select("instance_name")
          .eq("organization_id", organizationId)
          .eq("status", "connected")
          .order("created_at", { ascending: false })
          .limit(1);

        const instance =
          state.instanceName || whatsappInstances?.[0]?.instance_name || "";
        const aiInteractionId =
          state.aiInteractionId || defaultAiInteractionId || "";

        setInstanceName(instance);
        if (aiInteractionId) {
          setDefaultAiInteractionId(aiInteractionId);
        }

        const now = new Date();
        const leadIds = state.leads.map((lead) => lead.id);
        setSelectedLeadIds(leadIds);
        setActiveTab("schedule");
      } catch (error: any) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar dados");
      }
    };

    loadData();
  }, [location.state, defaultAiInteractionId, organizationId]);

  const fetchScheduledInteractions = useCallback(async () => {
    if (!organizationId) return;
    setLoadingScheduled(true);
    try {
      let query = supabase
        .from("scheduled_interactions")
        .select(
          `
          *,
          leads!inner (
            name,
            contact_whatsapp,
            organization_id
          ),
          ai_interaction_settings (
            name
          )
        `,
        )
        .eq("leads.organization_id", organizationId)
        .order("scheduled_at", { ascending: false });

      if (statusFilter !== "all") {
        if (statusFilter === "not_cancelled") {
          query = query.neq("status", "cancelled");
        } else if (statusFilter === "executed") {
          query = query.eq("status", "completed");
        } else if (statusFilter === "cancelled_or_completed") {
          query = query.in("status", ["cancelled", "completed"]);
        } else if (statusFilter === "pending_or_active") {
          query = query.in("status", ["pending", "active"]);
        } else {
          query = query.eq("status", statusFilter);
        }
      }

      if (scheduledDateFilterStart) {
        const startDate = new Date(scheduledDateFilterStart);
        startDate.setHours(0, 0, 0, 0);
        query = query.gte("scheduled_at", startDate.toISOString());
      }

      if (scheduledDateFilterEnd) {
        const endDate = new Date(scheduledDateFilterEnd);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte("scheduled_at", endDate.toISOString());
      }

      if (aiInteractionFilter !== "all") {
        query = query.eq("ai_interaction_id", aiInteractionFilter);
      }

      if (instanceFilter !== "all") {
        query = query.eq("instance_name", instanceFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const interactionsWithInfo: ScheduledInteractionRow[] = (data || []).map(
        (interaction: any) => ({
          id: interaction.id,
          lead_id: interaction.lead_id,
          lead_name: interaction.leads?.name || "Lead não encontrado",
          lead_whatsapp: interaction.leads?.contact_whatsapp || "",
          remote_jid: interaction.remote_jid,
          scheduled_at: interaction.scheduled_at,
          ai_interaction_id: interaction.ai_interaction_id,
          ai_interaction_name:
            interaction.ai_interaction_settings?.name ||
            "Configuração não encontrada",
          instance_name: interaction.instance_name,
          status: interaction.status,
          created_at: interaction.created_at,
          updated_at: interaction.updated_at,
        }),
      );

      setScheduledInteractions(interactionsWithInfo);
    } catch (error: any) {
      console.error("Erro ao carregar interações agendadas:", error);
      toast.error("Erro ao carregar interações agendadas");
    } finally {
      setLoadingScheduled(false);
    }
  }, [
    organizationId,
    statusFilter,
    scheduledDateFilterStart,
    scheduledDateFilterEnd,
    aiInteractionFilter,
    instanceFilter,
  ]);

  const fetchAvailableInstances = useCallback(async () => {
    if (!organizationId) return;
    try {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("instance_name")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAvailableInstances((data || []).map((i) => i.instance_name));
    } catch (error: any) {
      console.error("Erro ao carregar instâncias:", error);
    }
  }, [organizationId]);

  useEffect(() => {
    if (activeTab === "view") {
      fetchScheduledInteractions();
      fetchAvailableInstances();
    }
  }, [activeTab, fetchScheduledInteractions, fetchAvailableInstances]);

  const handleCancelScheduled = async (interactionId: string) => {
    try {
      const { error } = await supabase
        .from("scheduled_interactions")
        .update({ status: "cancelled" })
        .eq("id", interactionId);

      if (error) throw error;

      toast.success("Interação cancelada com sucesso");
      fetchScheduledInteractions();
    } catch (error: any) {
      console.error("Erro ao cancelar interação:", error);
      toast.error("Erro ao cancelar interação");
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      pending: {
        label: "Pendente",
        className: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
      },
      active: {
        label: "Ativa",
        className: "bg-blue-500/20 text-blue-600 border-blue-500/30",
      },
      completed: {
        label: "Concluída",
        className: "bg-green-500/20 text-green-600 border-green-500/30",
      },
      cancelled: {
        label: "Cancelada",
        className: "bg-gray-500/20 text-gray-600 border-gray-500/30",
      },
    };

    const config = configs[status] || configs.pending;

    return (
      <Badge
        variant="outline"
        className={`${config.className} border font-medium`}
      >
        {config.label}
      </Badge>
    );
  };

  const filteredScheduledInteractions = useMemo(() => {
    return scheduledInteractions.filter((interaction) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        interaction.lead_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        interaction.ai_interaction_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        formatPhoneDisplay(interaction.lead_whatsapp).includes(searchQuery);

      return matchesSearch;
    });
  }, [scheduledInteractions, searchQuery]);

  const updateScheduledTime = (leadId: string, dateTime: string) => {
    setLeads((prevLeads) =>
      prevLeads.map((lead) =>
        lead.leadId === leadId
          ? { ...lead, scheduledDateTime: dateTime }
          : lead,
      ),
    );
  };

  const updateAiInteraction = (leadId: string, aiInteractionId: string) => {
    setLeads((prevLeads) =>
      prevLeads.map((lead) =>
        lead.leadId === leadId ? { ...lead, aiInteractionId } : lead,
      ),
    );
  };

  const applyToAll = (field: "aiInteraction" | "time", value: string) => {
    if (field === "aiInteraction") {
      setLeads((prevLeads) =>
        prevLeads.map((lead) => ({ ...lead, aiInteractionId: value })),
      );
      setDefaultAiInteractionId(value);
    } else if (field === "time") {
      const baseDate = new Date(value);
      setLeads((prevLeads) =>
        prevLeads.map((lead, index) => {
          const newDate = new Date(baseDate);
          newDate.setMinutes(newDate.getMinutes() + index * 5);
          return {
            ...lead,
            scheduledDateTime: format(newDate, "yyyy-MM-dd'T'HH:mm"),
          };
        }),
      );
    }
  };

  const handleSchedule = async () => {
    if (leads.length === 0) {
      toast.error("Nenhum lead para agendar");
      return;
    }

    const invalidLeads = leads.filter(
      (lead) => !lead.aiInteractionId || !lead.remoteJid,
    );
    if (invalidLeads.length > 0) {
      toast.error(
        "Alguns leads não têm configuração de IA ou WhatsApp configurado",
      );
      return;
    }

    setSaving(true);

    try {
      const scheduledInteractions = leads.map((lead) => ({
        lead_id: lead.leadId,
        ai_interaction_id: lead.aiInteractionId,
        instance_name: lead.instanceName,
        remote_jid: lead.remoteJid,
        scheduled_at: new Date(lead.scheduledDateTime).toISOString(),
        status: "pending",
      }));

      const { data: insertedData, error: insertError } = await supabase
        .from("scheduled_interactions")
        .insert(scheduledInteractions)
        .select();

      if (insertError) {
        throw insertError;
      }

      if (!insertedData || insertedData.length === 0) {
        throw new Error("Nenhuma interação foi inserida no banco de dados");
      }

      toast.success(`${leads.length} interação(ões) agendada(s) com sucesso!`);

      setLeads([]);
      setActiveTab("view");
      fetchScheduledInteractions();

      navigate("/schedule-interactions", { replace: true });
    } catch (error: any) {
      console.error("Erro ao agendar interações:", error);
      toast.error(
        "Erro ao agendar interações: " + (error.message || "Erro desconhecido"),
      );
    } finally {
      setSaving(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    return format(now, "yyyy-MM-dd'T'HH:mm");
  };

  const removeLeadFromSchedule = (leadId: string) => {
    setSelectedLeadIds((prev) => prev.filter((id) => id !== leadId));
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleResize = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 400;
      const maxWidth = window.innerWidth * 0.9;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSheetWidth(newWidth);
      }
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleResize);
      document.addEventListener("mouseup", handleResizeEnd);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleResize);
      document.removeEventListener("mouseup", handleResizeEnd);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Interações Agendadas
              </h1>
              <p className="text-muted-foreground mt-2">
                Agende e visualize interações com IA programadas
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="schedule" className="gap-2">
              <Calendar className="w-4 h-4" />
              Agendar
            </TabsTrigger>
            <TabsTrigger value="view" className="gap-2">
              <Eye className="w-4 h-4" />
              Visualizar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-6 mt-6">
            {leads.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Nenhum lead selecionado
                  </h3>
                  <p className="text-muted-foreground text-center mb-6 max-w-md">
                    Para agendar interações, você precisa selecionar leads
                    primeiro. Use o botão abaixo para abrir o seletor de leads.
                  </p>
                  <Sheet open={leadsSheetOpen} onOpenChange={setLeadsSheetOpen}>
                    <SheetTrigger asChild>
                      <Button className="gap-2">
                        <Users className="w-4 h-4" />
                        Selecionar Leads
                      </Button>
                    </SheetTrigger>
                    <SheetContent
                      side="right"
                      className="overflow-y-auto"
                      style={{ width: `${sheetWidth}px`, maxWidth: "90vw" }}
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20 transition-colors z-50 group"
                        onMouseDown={handleResizeStart}
                      >
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-16 bg-border rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <SheetHeader>
                        <SheetTitle>Selecionar Leads</SheetTitle>
                        <SheetDescription>
                          Selecione os leads que deseja agendar. Você pode
                          arrastar os leads selecionados para reordená-los.
                        </SheetDescription>
                      </SheetHeader>
                      <div className="mt-6 space-y-4">
                        <div className="space-y-4 border-b pb-4">
                          <div className="flex items-center gap-2 mb-4">
                            <Settings2 className="w-4 h-4 text-muted-foreground" />
                            <h3 className="text-sm font-semibold">
                              Filtros de Busca
                            </h3>
                          </div>
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label
                                htmlFor="remote-jid-filter"
                                className="text-sm font-medium"
                              >
                                Status do WhatsApp
                              </Label>
                              <Select
                                value={remoteJidFilter}
                                onValueChange={setRemoteJidFilter}
                              >
                                <SelectTrigger id="remote-jid-filter">
                                  <SelectValue placeholder="Selecione o filtro" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todos</SelectItem>
                                  <SelectItem value="with">
                                    WhatsApp Disponível
                                  </SelectItem>
                                  <SelectItem value="without">
                                    WhatsApp Não Disponível
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label
                                  htmlFor="date-start"
                                  className="text-sm font-medium flex items-center gap-1.5"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                  Data Inicial
                                </Label>
                                <DatePicker
                                  value={dateFilterStart}
                                  onChange={setDateFilterStart}
                                  max={dateFilterEnd || undefined}
                                  placeholder="Selecione a data inicial"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label
                                  htmlFor="date-end"
                                  className="text-sm font-medium flex items-center gap-1.5"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                  Data Final
                                </Label>
                                <DatePicker
                                  value={dateFilterEnd}
                                  onChange={setDateFilterEnd}
                                  min={dateFilterStart || undefined}
                                  placeholder="Selecione a data final"
                                />
                              </div>
                            </div>
                          </div>
                          {(dateFilterStart ||
                            dateFilterEnd ||
                            remoteJidFilter !== "all") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDateFilterStart("");
                                setDateFilterEnd("");
                                setRemoteJidFilter("all");
                              }}
                              className="w-full mt-3"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Limpar Filtros
                            </Button>
                          )}
                        </div>
                        {loadingAvailableLeads ? (
                          <div className="text-center py-8 text-muted-foreground">
                            Carregando leads...
                          </div>
                        ) : (
                          <LeadsDragDrop
                            leads={availableLeads}
                            selectedLeadIds={selectedLeadIds}
                            onSelectionChange={setSelectedLeadIds}
                            filter={searchAvailableLeads}
                            onFilterChange={setSearchAvailableLeads}
                          />
                        )}
                      </div>
                    </SheetContent>
                  </Sheet>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          Leads Selecionados ({leads.length})
                        </CardTitle>
                        <CardDescription>
                          Leads que serão agendados para interações
                        </CardDescription>
                      </div>
                      <Sheet
                        open={leadsSheetOpen}
                        onOpenChange={setLeadsSheetOpen}
                      >
                        <SheetTrigger asChild>
                          <Button variant="outline" className="gap-2">
                            <Settings2 className="w-4 h-4" />
                            Gerenciar Leads
                            {selectedLeadIds.length > 0 && (
                              <Badge variant="secondary" className="ml-1">
                                {selectedLeadIds.length}
                              </Badge>
                            )}
                          </Button>
                        </SheetTrigger>
                        <SheetContent
                          side="right"
                          className="overflow-y-auto"
                          style={{ width: `${sheetWidth}px`, maxWidth: "90vw" }}
                        >
                          <div
                            className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20 transition-colors z-50 group"
                            onMouseDown={handleResizeStart}
                          >
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-16 bg-border rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <SheetHeader>
                            <SheetTitle>Selecionar Leads</SheetTitle>
                            <SheetDescription>
                              Selecione os leads que deseja agendar. Você pode
                              arrastar os leads selecionados para reordená-los.
                            </SheetDescription>
                          </SheetHeader>
                          <div className="mt-6 space-y-4">
                            <div className="space-y-4 border-b pb-4">
                              <div className="flex items-center gap-2 mb-4">
                                <Settings2 className="w-4 h-4 text-muted-foreground" />
                                <h3 className="text-sm font-semibold">
                                  Filtros de Busca
                                </h3>
                              </div>
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label
                                    htmlFor="remote-jid-filter-2"
                                    className="text-sm font-medium"
                                  >
                                    Status do WhatsApp
                                  </Label>
                                  <Select
                                    value={remoteJidFilter}
                                    onValueChange={setRemoteJidFilter}
                                  >
                                    <SelectTrigger id="remote-jid-filter-2">
                                      <SelectValue placeholder="Selecione o filtro" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">Todos</SelectItem>
                                      <SelectItem value="with">
                                        WhatsApp Conectado
                                      </SelectItem>
                                      <SelectItem value="without">
                                        WhatsApp Não Conectado
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label
                                      htmlFor="date-start-2"
                                      className="text-sm font-medium flex items-center gap-1.5"
                                    >
                                      <Calendar className="w-3.5 h-3.5" />
                                      Data Inicial
                                    </Label>
                                    <DatePicker
                                      value={dateFilterStart}
                                      onChange={setDateFilterStart}
                                      max={dateFilterEnd || undefined}
                                      placeholder="Selecione a data inicial"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label
                                      htmlFor="date-end-2"
                                      className="text-sm font-medium flex items-center gap-1.5"
                                    >
                                      <Calendar className="w-3.5 h-3.5" />
                                      Data Final
                                    </Label>
                                    <DatePicker
                                      value={dateFilterEnd}
                                      onChange={setDateFilterEnd}
                                      min={dateFilterStart || undefined}
                                      placeholder="Selecione a data final"
                                    />
                                  </div>
                                </div>
                              </div>
                              {(dateFilterStart ||
                                dateFilterEnd ||
                                remoteJidFilter !== "all") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setDateFilterStart("");
                                    setDateFilterEnd("");
                                    setRemoteJidFilter("all");
                                  }}
                                  className="w-full mt-3"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Limpar Filtros
                                </Button>
                              )}
                            </div>
                            {loadingAvailableLeads ? (
                              <div className="text-center py-8 text-muted-foreground">
                                Carregando leads...
                              </div>
                            ) : (
                              <LeadsDragDrop
                                leads={availableLeads}
                                selectedLeadIds={selectedLeadIds}
                                onSelectionChange={setSelectedLeadIds}
                                filter={searchAvailableLeads}
                                onFilterChange={setSearchAvailableLeads}
                              />
                            )}
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {leads.map((lead) => (
                        <Badge
                          key={lead.leadId}
                          variant="secondary"
                          className="px-3 py-1.5 text-sm flex items-center gap-2"
                        >
                          <span>{lead.leadName}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLeadFromSchedule(lead.leadId)}
                            className="h-4 w-4 p-0 hover:bg-destructive/20 rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {leads.length > 0 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="w-5 h-5" />
                      Configurações Gerais
                    </CardTitle>
                    <CardDescription>
                      Aplique configurações para todos os leads de uma vez
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="default-ai-interaction">
                        Configuração de IA Padrão
                      </Label>
                      <Select
                        value={defaultAiInteractionId}
                        onValueChange={(value) =>
                          applyToAll("aiInteraction", value)
                        }
                        disabled={loadingSettings}
                      >
                        <SelectTrigger id="default-ai-interaction">
                          <SelectValue placeholder="Selecione uma configuração de IA" />
                        </SelectTrigger>
                        <SelectContent>
                          {aiInteractionSettings.map((setting) => (
                            <SelectItem key={setting.id} value={setting.id}>
                              {setting.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {defaultAiInteractionId && (
                        <p className="text-xs text-muted-foreground">
                          {
                            aiInteractionSettings.find(
                              (s) => s.id === defaultAiInteractionId,
                            )?.conversation_focus
                          }
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="start-time">Horário de Início</Label>
                      <DateTimePicker
                        value={
                          leads.length > 0
                            ? leads[0].scheduledDateTime
                            : getMinDateTime()
                        }
                        onChange={(value) => {
                          if (value) {
                            applyToAll("time", value);
                          }
                        }}
                        min={getMinDateTime()}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Interações Agendadas ({leads.length})
                    </CardTitle>
                    <CardDescription>
                      Configure individualmente o horário e configuração de IA
                      para cada lead
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Lead</TableHead>
                            <TableHead>WhatsApp</TableHead>
                            <TableHead>Data e Hora</TableHead>
                            <TableHead className="min-w-[300px]">
                              Configuração de IA
                            </TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leads.map((lead) => (
                            <TableRow key={lead.leadId}>
                              <TableCell className="font-medium">
                                {lead.leadName}
                              </TableCell>
                              <TableCell>
                                {lead.leadWhatsApp
                                  ? formatPhoneDisplay(lead.leadWhatsApp)
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <DateTimePicker
                                  value={lead.scheduledDateTime}
                                  onChange={(value) =>
                                    updateScheduledTime(lead.leadId, value)
                                  }
                                  min={getMinDateTime()}
                                  className="w-[240px]"
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={lead.aiInteractionId}
                                  onValueChange={(value) =>
                                    updateAiInteraction(lead.leadId, value)
                                  }
                                  disabled={loadingSettings}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecione uma configuração" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {aiInteractionSettings.map((setting) => (
                                      <SelectItem
                                        key={setting.id}
                                        value={setting.id}
                                      >
                                        {setting.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    removeLeadFromSchedule(lead.leadId)
                                  }
                                  className="text-destructive hover:text-destructive"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {leads.length > 0 && (
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setLeads([]);
                    setActiveTab("view");
                    navigate("/schedule-interactions", { replace: true });
                  }}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSchedule}
                  disabled={saving || leads.length === 0}
                  className="gap-2"
                >
                  <Bot className="w-4 h-4" />
                  {saving
                    ? "Agendando..."
                    : `Agendar ${leads.length} Interação(ões)`}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="view" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Interações Agendadas
                    </CardTitle>
                    <CardDescription>
                      Visualize e gerencie todas as interações agendadas
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchScheduledInteractions}
                    disabled={loadingScheduled}
                    className="gap-2"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${
                        loadingScheduled ? "animate-spin" : ""
                      }`}
                    />
                    Atualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Filtros</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={viewMode === "table" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("table")}
                        className="gap-2"
                      >
                        <List className="w-4 h-4" />
                        Tabela
                      </Button>
                      <Button
                        variant={viewMode === "cards" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("cards")}
                        className="gap-2"
                      >
                        <Grid3x3 className="w-4 h-4" />
                        Cards
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-4 items-center flex-wrap">
                    <div className="flex-1 relative min-w-[250px]">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Buscar por lead ou configuração de IA..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filtrar por status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="not_cancelled">
                          Excluir Canceladas
                        </SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="active">Ativa</SelectItem>
                        <SelectItem value="completed">Concluída</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
                        <SelectItem value="executed">
                          Executadas (Concluídas)
                        </SelectItem>
                        <SelectItem value="cancelled_or_completed">
                          Canceladas ou Concluídas
                        </SelectItem>
                        <SelectItem value="pending_or_active">
                          Pendentes ou Ativas
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="scheduled-date-start"
                        className="text-sm font-medium flex items-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Data Inicial
                      </Label>
                      <DatePicker
                        value={scheduledDateFilterStart}
                        onChange={setScheduledDateFilterStart}
                        max={scheduledDateFilterEnd || undefined}
                        placeholder="Data inicial"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="scheduled-date-end"
                        className="text-sm font-medium flex items-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Data Final
                      </Label>
                      <DatePicker
                        value={scheduledDateFilterEnd}
                        onChange={setScheduledDateFilterEnd}
                        min={scheduledDateFilterStart || undefined}
                        placeholder="Data final"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="ai-interaction-filter"
                        className="text-sm font-medium flex items-center gap-1.5"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        Agente de IA
                      </Label>
                      <Select
                        value={aiInteractionFilter}
                        onValueChange={setAiInteractionFilter}
                      >
                        <SelectTrigger id="ai-interaction-filter">
                          <SelectValue placeholder="Todos os agentes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os agentes</SelectItem>
                          {aiInteractionSettings.map((setting) => (
                            <SelectItem key={setting.id} value={setting.id}>
                              {setting.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="instance-filter"
                        className="text-sm font-medium flex items-center gap-1.5"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        Instância
                      </Label>
                      <Select
                        value={instanceFilter}
                        onValueChange={setInstanceFilter}
                      >
                        <SelectTrigger id="instance-filter">
                          <SelectValue placeholder="Todas as instâncias" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            Todas as instâncias
                          </SelectItem>
                          {availableInstances.map((instance) => (
                            <SelectItem key={instance} value={instance}>
                              {instance}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(scheduledDateFilterStart ||
                    scheduledDateFilterEnd ||
                    aiInteractionFilter !== "all" ||
                    instanceFilter !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setScheduledDateFilterStart("");
                        setScheduledDateFilterEnd("");
                        setAiInteractionFilter("all");
                        setInstanceFilter("all");
                      }}
                      className="gap-2"
                    >
                      <X className="w-4 h-4" />
                      Limpar Filtros
                    </Button>
                  )}
                </div>

                {loadingScheduled ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando interações agendadas...
                  </div>
                ) : filteredScheduledInteractions.length > 0 ? (
                  viewMode === "table" ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Lead</TableHead>
                            <TableHead>WhatsApp</TableHead>
                            <TableHead>Data/Hora Agendada</TableHead>
                            <TableHead className="min-w-[200px]">
                              Configuração de IA
                            </TableHead>
                            <TableHead>Instância</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredScheduledInteractions.map((interaction) => (
                            <TableRow key={interaction.id}>
                              <TableCell className="font-medium">
                                {interaction.lead_name}
                              </TableCell>
                              <TableCell>
                                {interaction.lead_whatsapp
                                  ? formatPhoneDisplay(
                                      interaction.lead_whatsapp,
                                    )
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {format(
                                      new Date(interaction.scheduled_at),
                                      "dd/MM/yyyy",
                                      { locale: ptBR },
                                    )}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {format(
                                      new Date(interaction.scheduled_at),
                                      "HH:mm",
                                      { locale: ptBR },
                                    )}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-[300px]">
                                  <p
                                    className="text-sm font-medium"
                                    title={interaction.ai_interaction_name}
                                  >
                                    {interaction.ai_interaction_name}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  {interaction.instance_name || "-"}
                                </span>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(interaction.status)}
                              </TableCell>
                              <TableCell>
                                {interaction.status === "pending" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleCancelScheduled(interaction.id)
                                    }
                                    className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="w-4 h-4" />
                                    Cancelar
                                  </Button>
                                )}
                                {interaction.status !== "pending" && (
                                  <span className="text-sm text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredScheduledInteractions.map((interaction) => (
                        <Card key={interaction.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg">
                                  {interaction.lead_name}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                  {interaction.lead_whatsapp
                                    ? formatPhoneDisplay(
                                        interaction.lead_whatsapp,
                                      )
                                    : "Sem WhatsApp"}
                                </CardDescription>
                              </div>
                              {getStatusBadge(interaction.status)}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span className="font-medium">
                                  Agendado para:
                                </span>
                              </div>
                              <div className="pl-6">
                                <div className="font-medium">
                                  {format(
                                    new Date(interaction.scheduled_at),
                                    "dd/MM/yyyy 'às' HH:mm",
                                    { locale: ptBR },
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Bot className="w-4 h-4" />
                                <span className="font-medium">Agente:</span>
                              </div>
                              <div className="pl-6 text-sm">
                                {interaction.ai_interaction_name}
                              </div>
                            </div>
                            {interaction.instance_name && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Smartphone className="w-4 h-4" />
                                  <span className="font-medium">
                                    Instância:
                                  </span>
                                </div>
                                <div className="pl-6 text-sm">
                                  {interaction.instance_name}
                                </div>
                              </div>
                            )}
                            {interaction.status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleCancelScheduled(interaction.id)
                                }
                                className="w-full gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                                Cancelar
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    {searchQuery.trim() ||
                    statusFilter !== "not_cancelled" ||
                    scheduledDateFilterStart ||
                    scheduledDateFilterEnd ||
                    aiInteractionFilter !== "all" ||
                    instanceFilter !== "all"
                      ? "Nenhuma interação encontrada com os filtros aplicados"
                      : "Nenhuma interação agendada"}
                  </div>
                )}

                {filteredScheduledInteractions.length > 0 && (
                  <div className="text-sm text-muted-foreground text-center">
                    Mostrando {filteredScheduledInteractions.length} de{" "}
                    {scheduledInteractions.length} interação(ões)
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ScheduleInteractions;
