import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextarea } from "@/components/ui/rich-textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Send, Calendar, Eye, X, Search, RefreshCw, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatPhoneDisplay } from "@/lib/utils";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { formatLeadMessage } from "@/utils/messageTemplate";

interface ScheduledMessage {
  leadId: string;
  leadName: string;
  leadOrganization?: string;
  leadWhatsApp: string;
  remoteJid: string;
  scheduledDateTime: string;
  message: string;
  imageUrl?: string;
  instanceName: string;
}

interface ScheduledMessageRow {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_whatsapp: string;
  remote_jid: string;
  scheduled_at: string;
  message: string;
  image_url: string | null;
  instance_name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const ScheduleMessages = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("schedule");
  const [leads, setLeads] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [defaultMessage, setDefaultMessage] = useState("");
  const [defaultImageUrl, setDefaultImageUrl] = useState<string | undefined>();
  const [instanceName, setInstanceName] = useState<string>("");
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessageRow[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingMessages, setProcessingMessages] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (activeTab !== "schedule") return;
      try {
        const state = location.state as { leads?: any[]; message?: string; imageUrl?: string; instanceName?: string };

        if (!state?.leads || state.leads.length === 0) {
          return;
        }

        const { data: settings } = await supabase
          .from("settings")
          .select("default_message, default_image_url")
          .maybeSingle();

        const message = state.message || settings?.default_message || "";
        const imageUrl = state.imageUrl || (settings?.default_image_url && settings.default_image_url.startsWith('http')
          ? settings.default_image_url
          : undefined);

        const { data: whatsappInstances } = await supabase
          .from("whatsapp_instances")
          .select("instance_name")
          .eq("status", "connected")
          .order("created_at", { ascending: false })
          .limit(1);

        const instance = state.instanceName || whatsappInstances?.[0]?.instance_name || "";

        setDefaultMessage(message);
        setDefaultImageUrl(imageUrl);
        setInstanceName(instance);

        const now = new Date();
        const scheduledLeads: ScheduledMessage[] = state.leads.map((lead, index) => {
          const scheduledDate = new Date(now);
          scheduledDate.setMinutes(scheduledDate.getMinutes() + index * 5);

          const leadOrganization =
            lead.organization_name ||
            lead.company ||
            lead.company_name ||
            undefined;

          const formattedMessage = formatLeadMessage(message, {
            leadName: lead.name,
            organizationName: leadOrganization,
          });

          return {
            leadId: lead.id,
            leadName: lead.name,
            leadOrganization,
            leadWhatsApp: lead.contact_whatsapp,
            remoteJid: lead.remote_jid,
            scheduledDateTime: format(scheduledDate, "yyyy-MM-dd'T'HH:mm"),
            message: formattedMessage,
            imageUrl: imageUrl,
            instanceName: instance,
          };
        });

        setLeads(scheduledLeads);
      } catch (error: any) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar dados");
      }
    };

    loadData();
  }, [location.state, navigate, activeTab]);

  const fetchScheduledMessages = useCallback(async () => {
    setLoadingScheduled(true);
    try {
      let query = supabase
        .from("scheduled_messages")
        .select(`
          *,
          leads (
            name,
            contact_whatsapp
          )
        `)
        .order("scheduled_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const messagesWithLeadInfo: ScheduledMessageRow[] = (data || []).map(
        (msg: any) => ({
          id: msg.id,
          lead_id: msg.lead_id,
          lead_name: msg.leads?.name || "Lead não encontrado",
          lead_whatsapp: msg.leads?.contact_whatsapp || "",
          remote_jid: msg.remote_jid,
          scheduled_at: msg.scheduled_at,
          message: msg.message,
          image_url: msg.image_url,
          instance_name: msg.instance_name,
          status: msg.status,
          created_at: msg.created_at,
          updated_at: msg.updated_at,
        }),
      );

      setScheduledMessages(messagesWithLeadInfo);
    } catch (error: any) {
      console.error("Erro ao carregar mensagens agendadas:", error);
      toast.error("Erro ao carregar mensagens agendadas");
    } finally {
      setLoadingScheduled(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (activeTab === "view") {
      fetchScheduledMessages();
    }
  }, [activeTab, fetchScheduledMessages]);

  const handleCancelScheduled = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("scheduled_messages")
        .update({ status: "cancelled" })
        .eq("id", messageId);

      if (error) throw error;

      toast.success("Mensagem cancelada com sucesso");
      fetchScheduledMessages();
    } catch (error: any) {
      console.error("Erro ao cancelar mensagem:", error);
      toast.error("Erro ao cancelar mensagem");
    }
  };

  const handleProcessScheduledMessages = async () => {
    setProcessingMessages(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-scheduled-messages", {
        body: {},
      });

      if (error) throw error;

      if (data && typeof data === 'object' && 'error' in data) {
        throw new Error((data as any).error || "Erro ao processar mensagens");
      }

      const result = data as { processed?: number; success?: number; errors?: number; message?: string };

      toast.success(
        result.message ||
        `Processadas ${result.processed || 0} mensagem(ns). Sucesso: ${result.success || 0}, Erros: ${result.errors || 0}`
      );

      await fetchScheduledMessages();
    } catch (error: any) {
      console.error("Erro ao processar mensagens agendadas:", error);
      toast.error("Erro ao processar mensagens: " + (error.message || "Erro desconhecido"));
    } finally {
      setProcessingMessages(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      pending: { label: "Pendente", className: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" },
      sent: { label: "Enviada", className: "bg-green-500/20 text-green-600 border-green-500/30" },
      failed: { label: "Falhou", className: "bg-red-500/20 text-red-600 border-red-500/30" },
      cancelled: { label: "Cancelada", className: "bg-gray-500/20 text-gray-600 border-gray-500/30" },
    };

    const config = configs[status] || configs.pending;

    return (
      <Badge variant="outline" className={`${config.className} border font-medium`}>
        {config.label}
      </Badge>
    );
  };

  const filteredScheduledMessages = scheduledMessages.filter((msg) => {
    const matchesSearch = searchQuery.trim() === "" ||
      msg.lead_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatPhoneDisplay(msg.lead_whatsapp).includes(searchQuery);

    return matchesSearch;
  });

  const updateScheduledTime = (leadId: string, dateTime: string) => {
    setLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.leadId === leadId
          ? { ...lead, scheduledDateTime: dateTime }
          : lead
      )
    );
  };

  const updateMessage = (leadId: string, message: string) => {
    setLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.leadId === leadId
          ? { ...lead, message }
          : lead
      )
    );
  };

  const applyToAll = (field: "message" | "time", value: string) => {
    if (field === "message") {
      setLeads(prevLeads =>
        prevLeads.map(lead => ({ ...lead, message: value }))
      );
      setDefaultMessage(value);
    } else if (field === "time") {
      const baseDate = new Date(value);
      setLeads(prevLeads =>
        prevLeads.map((lead, index) => {
          const newDate = new Date(baseDate);
          newDate.setMinutes(newDate.getMinutes() + (index * 5));
          return {
            ...lead,
            scheduledDateTime: format(newDate, "yyyy-MM-dd'T'HH:mm")
          };
        })
      );
    }
  };

  const handleSchedule = async () => {
    if (leads.length === 0) {
      toast.error("Nenhum lead para agendar");
      return;
    }

    setSaving(true);

    try {
      const scheduledMessages = leads.map(lead => {
        const formattedMessage = formatLeadMessage(lead.message, {
          leadName: lead.leadName,
          organizationName: lead.leadOrganization,
        });

        return {
          lead_id: lead.leadId,
          instance_name: lead.instanceName,
          remote_jid: lead.remoteJid,
          message: formattedMessage,
          image_url: lead.imageUrl,
          scheduled_at: new Date(lead.scheduledDateTime).toISOString(),
          status: "pending",
        };
      });

      const { error: insertError } = await supabase
        .from("scheduled_messages")
        .insert(scheduledMessages);

      if (insertError) {
        throw insertError;
      }

      toast.success(`${leads.length} mensagem(ns) agendada(s) com sucesso!`);
      // Após agendar, mostrar a lista de mensagens agendadas
      setActiveTab("view");
      await fetchScheduledMessages();
      navigate("/schedule-messages", { replace: true });
    } catch (error: any) {
      console.error("Erro ao agendar mensagens:", error);
      toast.error("Erro ao agendar mensagens: " + (error.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    return format(now, "yyyy-MM-dd'T'HH:mm");
  };

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
                Mensagens Agendadas
              </h1>
              <p className="text-muted-foreground mt-2">
                Agende e visualize mensagens programadas
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Configurações Gerais
                </CardTitle>
                <CardDescription>
                  Aplique configurações para todos os leads de uma vez
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="default-message">Mensagem Padrão</Label>
                  <RichTextarea
                    id="default-message"
                    className="min-h-[100px]"
                    value={defaultMessage}
                    onChange={(val) => applyToAll("message", val)}
                    placeholder="Digite a mensagem padrão..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Suporta marcadores dinâmicos como{" "}
                    <code className="px-1 py-0.5 rounded bg-muted">{`{name}`}</code> (nome do lead) e{" "}
                    <code className="px-1 py-0.5 rounded bg-muted">{`{organization}`}</code> (empresa do lead),
                    que serão substituídos automaticamente ao agendar.
                  </p>
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
                  <Clock className="w-5 h-5" />
                  Mensagens Agendadas ({leads.length})
                </CardTitle>
                <CardDescription>
                  Configure individualmente o horário e mensagem para cada lead
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
                        <TableHead className="min-w-[300px]">Mensagem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map((lead) => (
                        <TableRow key={lead.leadId}>
                          <TableCell className="font-medium">
                            {lead.leadName}
                          </TableCell>
                          <TableCell>
                            {lead.leadWhatsApp ? formatPhoneDisplay(lead.leadWhatsApp) : "-"}
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
                            <RichTextarea
                              className="min-h-[80px] text-sm"
                              value={lead.message}
                              onChange={(val) => updateMessage(lead.leadId, val)}
                              placeholder="Digite a mensagem..."
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSchedule}
                disabled={saving || leads.length === 0}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                {saving ? "Agendando..." : `Agendar ${leads.length} Mensagem(ns)`}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="view" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Conversas Agendadas
                    </CardTitle>
                    <CardDescription>
                      Visualize e gerencie todas as mensagens agendadas
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleProcessScheduledMessages}
                      disabled={processingMessages || loadingScheduled}
                      className="gap-2"
                    >
                      <Play className={`w-4 h-4 ${processingMessages ? "animate-pulse" : ""}`} />
                      {processingMessages ? "Processando..." : "Processar Pendentes"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchScheduledMessages}
                      disabled={loadingScheduled || processingMessages}
                      className="gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingScheduled ? "animate-spin" : ""}`} />
                      Atualizar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 items-center">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Buscar por lead, mensagem ou WhatsApp..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="sent">Enviada</SelectItem>
                      <SelectItem value="failed">Falhou</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {loadingScheduled ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando mensagens agendadas...
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lead</TableHead>
                          <TableHead>WhatsApp</TableHead>
                          <TableHead>Data/Hora Agendada</TableHead>
                          <TableHead className="min-w-[200px]">Mensagem</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredScheduledMessages.length > 0 ? (
                          filteredScheduledMessages.map((msg) => (
                            <TableRow key={msg.id}>
                              <TableCell className="font-medium">
                                {msg.lead_name}
                              </TableCell>
                              <TableCell>
                                {msg.lead_whatsapp ? formatPhoneDisplay(msg.lead_whatsapp) : "-"}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {format(new Date(msg.scheduled_at), "dd/MM/yyyy", { locale: ptBR })}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {format(new Date(msg.scheduled_at), "HH:mm", { locale: ptBR })}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-[300px]">
                                  <p
                                    className="text-sm truncate"
                                    title={formatLeadMessage(msg.message, {
                                      leadName: msg.lead_name,
                                      organizationName: undefined,
                                    })}
                                  >
                                    {formatLeadMessage(msg.message, {
                                      leadName: msg.lead_name,
                                      organizationName: undefined,
                                    })}
                                  </p>
                                  {msg.image_url && (
                                    <Badge variant="outline" className="mt-1 text-xs">
                                      Com imagem
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(msg.status)}
                              </TableCell>
                              <TableCell>
                                {msg.status === "pending" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancelScheduled(msg.id)}
                                    className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="w-4 h-4" />
                                    Cancelar
                                  </Button>
                                )}
                                {msg.status !== "pending" && (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              {searchQuery.trim() || statusFilter !== "all"
                                ? "Nenhuma mensagem encontrada com os filtros aplicados"
                                : "Nenhuma mensagem agendada"}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {filteredScheduledMessages.length > 0 && (
                  <div className="text-sm text-muted-foreground text-center">
                    Mostrando {filteredScheduledMessages.length} de {scheduledMessages.length} mensagem(ns)
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

export default ScheduleMessages;

