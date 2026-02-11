import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { LeadCard } from "@/components/LeadCard";
import { LeadListView } from "@/components/LeadListView";
import { LeadTableView } from "@/components/LeadTableView";
import { LeadTimelineView } from "@/components/LeadTimelineView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search, Filter, CheckSquare, Square, Trash2, Upload, Bot, Calendar, Grid3x3, List, Table2, Clock, DollarSign, Phone, Mail, X, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadImportDialog } from "@/components/LeadImportDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { cleanPhoneNumber } from "@/lib/utils";

const Leads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<any[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [contactTypeFilter, setContactTypeFilter] = useState("all");
  const [categories, setCategories] = useState<any[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "table" | "timeline">("timeline");
  const [isValidatingWhatsApp, setIsValidatingWhatsApp] = useState(false);
  const [validationProgress, setValidationProgress] = useState({ current: 0, total: 0 });

  const fetchLeads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .or("is_test.is.null,is_test.eq.false")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
      setFilteredLeads(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar leads");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("lead_categories").select("*");
    setCategories(data || []);
  };

  const fetchSources = () => {
    const uniqueSources = Array.from(new Set(leads.map(lead => lead.source).filter(Boolean))) as string[];
    setSources(uniqueSources.sort());
  };

  useEffect(() => {
    fetchLeads();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchSources();
  }, [leads]);

  useEffect(() => {
    let filtered = leads;

    if (searchQuery) {
      filtered = filtered.filter(
        (lead) =>
          lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.contact_email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((lead) => lead.status === statusFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((lead) => lead.category === categoryFilter);
    }

    if (sourceFilter !== "all") {
      filtered = filtered.filter((lead) => lead.source === sourceFilter);
    }

    if (paymentStatusFilter !== "all") {
      filtered = filtered.filter((lead) => lead.payment_status === paymentStatusFilter);
    }

    if (dateRangeFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter((lead) => {
        const leadDate = new Date(lead.created_at);
        const leadDateOnly = new Date(leadDate.getFullYear(), leadDate.getMonth(), leadDate.getDate());
        
        switch (dateRangeFilter) {
          case "today":
            return leadDateOnly.getTime() === today.getTime();
          case "week":
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return leadDateOnly >= weekAgo;
          case "month":
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return leadDateOnly >= monthAgo;
          case "quarter":
            const quarterAgo = new Date(today);
            quarterAgo.setMonth(quarterAgo.getMonth() - 3);
            return leadDateOnly >= quarterAgo;
          case "year":
            const yearAgo = new Date(today);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            return leadDateOnly >= yearAgo;
          default:
            return true;
        }
      });
    }

    if (contactTypeFilter !== "all") {
      filtered = filtered.filter((lead) => {
        const hasWhatsApp = !!lead.contact_whatsapp;
        const hasEmail = !!lead.contact_email;
        
        switch (contactTypeFilter) {
          case "whatsapp_only":
            return hasWhatsApp && !hasEmail;
          case "email_only":
            return !hasWhatsApp && hasEmail;
          case "both":
            return hasWhatsApp && hasEmail;
          case "none":
            return !hasWhatsApp && !hasEmail;
          default:
            return true;
        }
      });
    }

    setFilteredLeads(filtered);
  }, [searchQuery, statusFilter, categoryFilter, sourceFilter, paymentStatusFilter, dateRangeFilter, contactTypeFilter, leads]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map(l => l.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    if (!confirm(`Deseja realmente excluir ${selectedIds.length} lead(s)?`)) return;

    setLoading(true);
    const { error } = await supabase
      .from("leads")
      .delete()
      .in("id", selectedIds);

    if (error) {
      toast.error("Erro ao excluir leads");
      console.error(error);
    } else {
      toast.success(`${selectedIds.length} lead(s) excluído(s) com sucesso!`);
      setSelectedIds([]);
      setIsSelectionMode(false);
      fetchLeads();
    }
    setLoading(false);
  };

  const handleScheduleInteractions = async () => {
    if (selectedIds.length === 0) {
      toast.error("Selecione pelo menos um lead para agendar interações");
      return;
    }

    const selectedLeadsData = filteredLeads.filter(lead => selectedIds.includes(lead.id));
    const validLeads = selectedLeadsData.filter(lead =>
      lead.contact_whatsapp && lead.remote_jid
    );

    if (validLeads.length === 0) {
      toast.error("Nenhum lead válido selecionado. Os leads devem ter WhatsApp e remote_jid configurados.");
      return;
    }

    if (validLeads.length < selectedIds.length) {
      toast.warning(`${validLeads.length} de ${selectedIds.length} lead(s) são válidos para agendamento.`);
    }

    try {
      const { data: settings } = await supabase
        .from("settings")
        .select("default_ai_interaction_id")
        .maybeSingle();

      const { data: whatsappInstances, error: instancesError } = await supabase
        .from("whatsapp_instances")
        .select("instance_name")
        .eq("status", "connected")
        .order("created_at", { ascending: false })
        .limit(1);

      if (instancesError || !whatsappInstances || whatsappInstances.length === 0) {
        toast.error("Nenhuma instância WhatsApp conectada. Configure em WhatsApp > Conectar");
        return;
      }

      const instanceName = whatsappInstances[0].instance_name;
      const aiInteractionId = settings?.default_ai_interaction_id || null;

      navigate("/schedule-interactions", {
        state: {
          leads: validLeads,
          aiInteractionId: aiInteractionId,
          instanceName: instanceName
        }
      });
    } catch (error: any) {
      console.error("Erro ao preparar agendamento de interações:", error);
      toast.error("Erro ao preparar agendamento de interações");
    }
  };

  const handleScheduleMessages = () => {
    if (selectedIds.length === 0) {
      toast.error("Selecione pelo menos um lead para agendar mensagens");
      return;
    }

    const selectedLeadsData = filteredLeads.filter(lead => selectedIds.includes(lead.id));
    const validLeads = selectedLeadsData.filter(lead =>
      lead.contact_whatsapp && lead.remote_jid
    );

    if (validLeads.length === 0) {
      toast.error("Nenhum lead válido selecionado. Os leads devem ter WhatsApp e remote_jid configurados.");
      return;
    }

    if (validLeads.length < selectedIds.length) {
      toast.warning(`${validLeads.length} de ${selectedIds.length} lead(s) são válidos para agendamento.`);
    }

    navigate("/schedule-messages", {
      state: {
        leads: validLeads,
      },
    });
  };

  const handleBulkValidateWhatsApp = async () => {
    if (selectedIds.length === 0) {
      toast.error("Selecione pelo menos um lead para validar WhatsApp");
      return;
    }

    const selectedLeadsData = filteredLeads.filter(lead => selectedIds.includes(lead.id));
    const leadsWithWhatsApp = selectedLeadsData.filter(lead => lead.contact_whatsapp);

    if (leadsWithWhatsApp.length === 0) {
      toast.error("Nenhum lead selecionado possui número de WhatsApp");
      return;
    }

    setIsValidatingWhatsApp(true);
    setValidationProgress({ current: 0, total: leadsWithWhatsApp.length });

    const BATCH_SIZE = 10;
    let validatedCount = 0;
    let errorCount = 0;
    let processedCount = 0;

    try {
      for (let i = 0; i < leadsWithWhatsApp.length; i += BATCH_SIZE) {
        const batch = leadsWithWhatsApp.slice(i, i + BATCH_SIZE);
        const phoneNumbers = batch.map(lead => cleanPhoneNumber(lead.contact_whatsapp));

        processedCount += batch.length;
        setValidationProgress({ current: processedCount, total: leadsWithWhatsApp.length });

        const { data: checkData, error: checkError } = await supabase.functions.invoke(
          'evolution-check-whatsapp',
          { body: { numbers: phoneNumbers } }
        );

        if (checkError) {
          if (checkError.message?.includes("No connected WhatsApp instance")) {
            toast.error("Nenhuma instância WhatsApp conectada. Configure em WhatsApp > Conectar", {
              duration: 5000,
              action: {
                label: "Configurar",
                onClick: () => navigate("/whatsapp"),
              },
            });
            setIsValidatingWhatsApp(false);
            return;
          }
          console.error("Erro ao validar batch:", checkError);
          errorCount += batch.length;
          continue;
        }

        if (checkData?.results) {
          const phoneToResultMap = new Map<string, { exists: boolean; jid?: string }>();
          
          checkData.results.forEach((result: { number: string; exists: boolean; jid?: string }) => {
            const cleanedNumber = cleanPhoneNumber(result.number);
            phoneToResultMap.set(cleanedNumber, result);
          });

          const updates = [];

          for (const lead of batch) {
            const cleanedPhone = cleanPhoneNumber(lead.contact_whatsapp);
            const result = phoneToResultMap.get(cleanedPhone);

            if (result?.exists && result.jid) {
              updates.push({
                id: lead.id,
                remote_jid: result.jid,
                whatsapp_verified: true
              });
            }
          }

          if (updates.length > 0) {
            for (const update of updates) {
              const { error: updateError } = await supabase
                .from("leads")
                .update({
                  remote_jid: update.remote_jid,
                  whatsapp_verified: update.whatsapp_verified
                })
                .eq("id", update.id);

              if (!updateError) {
                validatedCount++;
                setLeads(prevLeads =>
                  prevLeads.map(l =>
                    l.id === update.id
                      ? { ...l, remote_jid: update.remote_jid, whatsapp_verified: true }
                      : l
                  )
                );
              } else {
                errorCount++;
              }
            }
          }
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setValidationProgress({ current: leadsWithWhatsApp.length, total: leadsWithWhatsApp.length });

      if (validatedCount > 0) {
        toast.success(`${validatedCount} lead(s) validado(s) com sucesso! ✅`);
      }

      if (errorCount > 0) {
        toast.warning(`${errorCount} lead(s) não puderam ser validados.`);
      }

      if (validatedCount === 0 && errorCount === 0) {
        toast.warning("Nenhum número foi encontrado no WhatsApp.");
      }
    } catch (error: any) {
      console.error("Erro ao validar WhatsApps:", error);
      toast.error("Erro ao validar WhatsApp: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsValidatingWhatsApp(false);
      setValidationProgress({ current: 0, total: 0 });
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Todos os Leads</h1>
            <p className="text-muted-foreground mt-1">
              {filteredLeads.length} lead(s) encontrado(s)
            </p>
          </div>
          <div className="flex gap-2">
            {filteredLeads.length > 0 && (
              <>
                {isSelectionMode ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={toggleSelectAll}
                    >
                      {selectedIds.length === filteredLeads.length ? (
                        <>
                          <Square className="w-4 h-4 mr-2" />
                          Desmarcar Todos
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-4 h-4 mr-2" />
                          Selecionar Todos
                        </>
                      )}
                    </Button>
                    {selectedIds.length > 0 && (
                      <>
                        <Button
                          variant="default"
                          onClick={handleBulkValidateWhatsApp}
                          disabled={isValidatingWhatsApp}
                          className="gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {isValidatingWhatsApp 
                            ? `Validando... (${validationProgress.current}/${validationProgress.total})`
                            : `Validar WhatsApp (${selectedIds.length})`
                          }
                        </Button>
                        <Button
                          variant="default"
                          onClick={handleScheduleInteractions}
                          className="gap-2"
                        >
                          <Bot className="w-4 h-4" />
                          Agendar Interações ({selectedIds.length})
                        </Button>
                        <Button
                          variant="default"
                          onClick={handleScheduleMessages}
                          className="gap-2"
                        >
                          <Calendar className="w-4 h-4" />
                          Agendar Mensagens ({selectedIds.length})
                        </Button>
                      </>
                    )}
                    <Button
                      variant="destructive"
                      onClick={handleBulkDelete}
                      disabled={selectedIds.length === 0 || loading}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir {selectedIds.length > 0 && `(${selectedIds.length})`}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsSelectionMode(false);
                        setSelectedIds([]);
                      }}
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setIsSelectionMode(true)}
                  >
                    Selecionar Múltiplos
                  </Button>
                )}
              </>
            )}
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(true)}
              size="lg"
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Importar Leads
            </Button>
            <Button onClick={() => navigate("/lead/new")} size="lg" className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Lead
            </Button>
          </div>
        </div>

        {/* Filters and View Selector */}
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="conversa_iniciada">Conversa Iniciada</SelectItem>
                <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
                <SelectItem value="link_pagamento_enviado">Link Pagamento</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="perdido">Perdido</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="Categoria" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="Fonte" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as fontes</SelectItem>
                {sources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <SelectValue placeholder="Status Pagamento" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="nao_criado">Não Criado</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="expirado">Expirado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <SelectValue placeholder="Período" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o período</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Últimos 7 dias</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
                <SelectItem value="quarter">Últimos 3 meses</SelectItem>
                <SelectItem value="year">Último ano</SelectItem>
              </SelectContent>
            </Select>
            <Select value={contactTypeFilter} onValueChange={setContactTypeFilter}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <SelectValue placeholder="Tipo de Contato" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="whatsapp_only">Apenas WhatsApp</SelectItem>
                <SelectItem value="email_only">Apenas Email</SelectItem>
                <SelectItem value="both">WhatsApp e Email</SelectItem>
                <SelectItem value="none">Sem contato</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              {(statusFilter !== "all" || categoryFilter !== "all" || sourceFilter !== "all" || 
                paymentStatusFilter !== "all" || dateRangeFilter !== "all" || contactTypeFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("all");
                    setCategoryFilter("all");
                    setSourceFilter("all");
                    setPaymentStatusFilter("all");
                    setDateRangeFilter("all");
                    setContactTypeFilter("all");
                    setSearchQuery("");
                  }}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Limpar Filtros
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList>
                <TabsTrigger value="grid" className="gap-2">
                  <Grid3x3 className="w-4 h-4" />
                  Grid
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <List className="w-4 h-4" />
                  Lista
                </TabsTrigger>
                <TabsTrigger value="table" className="gap-2">
                  <Table2 className="w-4 h-4" />
                  Tabela
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-2">
                  <Clock className="w-4 h-4" />
                  Timeline
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Leads Views */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando leads...</p>
          </div>
        ) : filteredLeads.length > 0 ? (
          <>
            {viewMode === "grid" && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
                {filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className={`relative transition-all flex ${isSelectionMode ? 'cursor-pointer' : ''
                      } ${selectedIds.includes(lead.id) ? 'ring-2 ring-primary rounded-lg' : ''
                      }`}
                    onClick={isSelectionMode ? () => toggleSelection(lead.id) : undefined}
                  >
                    {isSelectionMode && (
                      <div className="absolute top-4 right-4 z-10 pointer-events-none bg-background/80 backdrop-blur-sm rounded p-1">
                        <Checkbox
                          checked={selectedIds.includes(lead.id)}
                          onCheckedChange={() => toggleSelection(lead.id)}
                        />
                      </div>
                    )}
                    <div className={isSelectionMode ? 'pointer-events-none w-full' : 'w-full'}>
                      <LeadCard
                        lead={lead}
                        onLeadUpdate={(updatedLead) => {
                          setLeads(prevLeads =>
                            prevLeads.map(l => l.id === updatedLead.id ? updatedLead : l)
                          );
                        }}
                        onClick={() => navigate(`/lead/${lead.id}`)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {viewMode === "list" && (
              <LeadListView
                leads={filteredLeads}
                selectedIds={selectedIds}
                isSelectionMode={isSelectionMode}
                onToggleSelection={toggleSelection}
                onLeadUpdate={(updatedLead) => {
                  setLeads(prevLeads =>
                    prevLeads.map(l => l.id === updatedLead.id ? updatedLead : l)
                  );
                }}
              />
            )}
            
            {viewMode === "table" && (
              <LeadTableView
                leads={filteredLeads}
                selectedIds={selectedIds}
                isSelectionMode={isSelectionMode}
                onToggleSelection={toggleSelection}
                onSelectAll={toggleSelectAll}
                onLeadUpdate={(updatedLead) => {
                  setLeads(prevLeads =>
                    prevLeads.map(l => l.id === updatedLead.id ? updatedLead : l)
                  );
                }}
              />
            )}
            
            {viewMode === "timeline" && (
              <LeadTimelineView
                leads={filteredLeads}
                selectedIds={selectedIds}
                isSelectionMode={isSelectionMode}
                onToggleSelection={toggleSelection}
                onLeadUpdate={(updatedLead) => {
                  setLeads(prevLeads =>
                    prevLeads.map(l => l.id === updatedLead.id ? updatedLead : l)
                  );
                }}
              />
            )}
          </>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">Nenhum lead encontrado</p>
          </div>
        )}
      </div>

      <LeadImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={fetchLeads}
      />

      {isValidatingWhatsApp && (
        <LoadingOverlay 
          message={`Validando WhatsApp... ${validationProgress.current} de ${validationProgress.total} lead(s)`}
        />
      )}
    </Layout>
  );
};

export default Leads;
