import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useOrganization } from "@/hooks/useOrganization";
import { ComponentRepository } from "@/services/components/ComponentRepository";
import { IComponentData } from "@/services/components/ComponentDomain";
import { ComponentConfigService } from "@/services/components/ComponentConfig";
import { supabase } from "@/integrations/supabase/client";
import { whatsappInstanceAgentBindingService } from "@/services/whatsapp/WhatsappInstanceAgentBindingService";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Bot,
  MessageCircle,
  Mail,
  Calendar,
  BarChart2,
  FileText,
  MessageSquare,
  TrendingUp,
  Settings,
  PlugZap,
  AlertCircle,
  CheckCircle2,
  Target,
  Info,
  RefreshCw,
  Instagram,
} from "lucide-react";

type AbilityStatus = "inactive" | "active_unconfigured" | "active_configured";

interface AbilityViewModel {
  component: IComponentData;
  enabled: boolean;
  status: AbilityStatus;
  requiresConfig: boolean;
}

interface AbilityVisualInfo {
  icon: JSX.Element;
  hint: string;
}

const getAbilityVisualInfo = (identifier: string): AbilityVisualInfo => {
  if (identifier === "email_sender") {
    return {
      icon: <Mail className="w-5 h-5" />,
      hint: "Envio e agendamento de emails. Recomenda-se configurar usando Outlook ou Gmail.",
    };
  }

  if (identifier === "meeting_scheduler") {
    return {
      icon: <Calendar className="w-5 h-5" />,
      hint: "Agendamento de reuniões e compromissos. Pode ser integrado ao calendário do Outlook ou Google.",
    };
  }

  if (identifier === "whatsapp_integration") {
    return {
      icon: <MessageCircle className="w-5 h-5" />,
      hint: "Integração com WhatsApp para envio e recebimento de mensagens via instância conectada.",
    };
  }

  if (identifier === "instagram_integration") {
    return {
      icon: <Instagram className="w-5 h-5" />,
      hint: "Integração com Instagram Direct para envio e recebimento de mensagens via conta Professional conectada.",
    };
  }

  if (identifier === "crm_query") {
    return {
      icon: <FileText className="w-5 h-5" />,
      hint: "Consulta de informações e históricos diretamente no CRM.",
    };
  }

  if (identifier === "proposal_creator") {
    return {
      icon: <MessageSquare className="w-5 h-5" />,
      hint: "Criação e envio de propostas comerciais personalizadas.",
    };
  }

  if (identifier === "auto_followup") {
    return {
      icon: <TrendingUp className="w-5 h-5" />,
      hint: "Follow-ups automáticos com leads e clientes em momentos chave.",
    };
  }

  if (identifier === "sentiment_analysis") {
    return {
      icon: <BarChart2 className="w-5 h-5" />,
      hint: "Análise de sentimento das conversas para priorização de atendimentos.",
    };
  }

  if (identifier === "report_generator") {
    return {
      icon: <BarChart2 className="w-5 h-5" />,
      hint: "Geração de relatórios sobre desempenho, interações e conversões.",
    };
  }

  if (identifier === "bant_analysis") {
    return {
      icon: <Target className="w-5 h-5" />,
      hint: "Análise BANT para qualificação de leads: Budget (Orçamento), Authority (Autoridade), Need (Necessidade) e Timeline (Prazo).",
    };
  }

  if (identifier === "auto_lead_status_update") {
    return {
      icon: <RefreshCw className="w-5 h-5" />,
      hint: "Atualização automática de status do lead baseada no contexto da conversa e nos status definidos no painel.",
    };
  }

  return {
    icon: <Bot className="w-5 h-5" />,
    hint: "Habilidade adicional disponível para o seu agente.",
  };
};

export const AbilitiesConfiguration = () => {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [components, setComponents] = useState<IComponentData[]>([]);
  const [enabledComponentIds, setEnabledComponentIds] = useState<string[]>([]);
  const [configuredComponentIds, setConfiguredComponentIds] = useState<
    Set<string>
  >(new Set());
  const [hasConnectedWhatsAppInstance, setHasConnectedWhatsAppInstance] =
    useState(false);
  const [connectedWhatsappInstanceIds, setConnectedWhatsappInstanceIds] =
    useState<string[]>([]);
  const [boundWhatsappInstanceIds, setBoundWhatsappInstanceIds] = useState<
    string[]
  >([]);
  const [hasConnectedInstagramInstance, setHasConnectedInstagramInstance] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const componentRepository = useMemo(() => new ComponentRepository(), []);

  useEffect(() => {
    if (!organization) {
      return;
    }
    loadData();
  }, [organization]);

  const loadData = async () => {
    if (!organization) {
      return;
    }

    setLoading(true);

    try {
      const allComponents = await componentRepository.findAll();
      setComponents(allComponents);

      const availableForOrganization =
        await componentRepository.findAvailableForOrganization(organization.id);
      const availableIds = availableForOrganization.map(
        (component) => component.id
      );
      setEnabledComponentIds(availableIds);

      if (allComponents.length > 0) {
        const componentIds = allComponents.map((component) => component.id);
        const { data: configurations, error: configurationsError } =
          await supabase
            .from("component_configurations")
            .select("component_id")
            .in("component_id", componentIds);

        if (configurationsError) {
          throw configurationsError;
        }

        const configuredIds = new Set<string>();
        (configurations || []).forEach((configuration) => {
          if (configuration.component_id) {
            configuredIds.add(configuration.component_id as string);
          }
        });
        setConfiguredComponentIds(configuredIds);
      }

      const { data: whatsappInstances, error: whatsappError } = await supabase
        .from("whatsapp_instances")
        .select("id, status")
        .eq("organization_id", organization.id)
        .eq("status", "connected");

      if (whatsappError) {
        throw whatsappError;
      }

      const connectedIds = Array.isArray(whatsappInstances)
        ? whatsappInstances.map((row) => row.id as string)
        : [];

      setConnectedWhatsappInstanceIds(connectedIds);
      setHasConnectedWhatsAppInstance(connectedIds.length > 0);

      const boundSet =
        await whatsappInstanceAgentBindingService.listWhatsappInstanceIdsWithAgentInOrganization(
          organization.id,
        );
      setBoundWhatsappInstanceIds(Array.from(boundSet));

      setHasConnectedInstagramInstance(false);
    } catch (error: any) {
      toast.error(
        error?.message || "Erro ao carregar habilidades e configurações"
      );

      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAbility = (componentId: string, enabled: boolean) => {
    setEnabledComponentIds((currentIds) => {
      if (enabled) {
        if (currentIds.includes(componentId)) {
          return currentIds;
        }
        return [...currentIds, componentId];
      }
      return currentIds.filter((id) => id !== componentId);
    });
  };

  const handleSave = async () => {
    if (!organization) {
      return;
    }

    setSaving(true);

    try {
      await componentRepository.enableForOrganization(
        organization.id,
        enabledComponentIds
      );
      toast.success("Habilidades atualizadas com sucesso");
      await loadData();
    } catch (error: any) {
      toast.error(
        error?.message || "Erro ao salvar habilidades da organização"
      );

      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleConfigureAbility = (component: IComponentData) => {
    const configType = ComponentConfigService.getConfigType(
      component.identifier
    );

    if (configType === "custom") {
      const customPath = ComponentConfigService.getCustomConfigPath(
        component.identifier
      );
      if (customPath) {
        navigate(customPath);
        return;
      }
    }

    if (!ComponentConfigService.requiresConfiguration(component.identifier)) {
      return;
    }

    navigate(`/components/${component.id}/configure`);
  };

  const abilities: AbilityViewModel[] = useMemo(() => {
    return components.map((component) => {
      const enabled = enabledComponentIds.includes(component.id);
      const requiresConfig = ComponentConfigService.requiresConfiguration(
        component.identifier
      );
      let status: AbilityStatus = "inactive";

      if (enabled) {
        if (component.identifier === "whatsapp_integration") {
          const everyConnectedHasAgent =
            connectedWhatsappInstanceIds.length > 0 &&
            connectedWhatsappInstanceIds.every((instanceId) =>
              boundWhatsappInstanceIds.includes(instanceId),
            );
          status =
            hasConnectedWhatsAppInstance && everyConnectedHasAgent
              ? "active_configured"
              : "active_unconfigured";
        } else if (component.identifier === "instagram_integration") {
          status = hasConnectedInstagramInstance
            ? "active_configured"
            : "active_unconfigured";
        } else if (requiresConfig) {
          const isConfigured = configuredComponentIds.has(component.id);
          status = isConfigured ? "active_configured" : "active_unconfigured";
        } else {
          status = "active_configured";
        }
      }

      return {
        component,
        enabled,
        status,
        requiresConfig,
      };
    });
  }, [
    components,
    enabledComponentIds,
    configuredComponentIds,
    hasConnectedWhatsAppInstance,
    hasConnectedInstagramInstance,
    connectedWhatsappInstanceIds,
    boundWhatsappInstanceIds,
  ]);

  const getStatusBadge = (status: AbilityStatus, requiresConfig: boolean) => {
    if (status === "active_configured") {
      if (requiresConfig) {
        return (
          <Badge className="bg-emerald-600 text-white flex items-center gap-1 text-[11px] px-2 py-0.5">
            <CheckCircle2 className="w-3 h-3" />
            Configurada
          </Badge>
        );
      }
      return null;
    }

    if (status === "active_unconfigured" && requiresConfig) {
      return (
        <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/40 text-[11px] px-2 py-0.5 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Ativa, falta configurar
        </Badge>
      );
    }

    if (status === "inactive") {
      return (
        <Badge
          variant="outline"
          className="text-xs px-2 py-0.5 border-dashed text-muted-foreground"
        >
          Desativada
        </Badge>
      );
    }

    return null;
  };

  if (!organization) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            Carregando informações da organização...
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <PlugZap className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold">Habilidades e Integrações</h1>
              <p className="text-sm text-muted-foreground">
                Ative e personalize as capacidades padrão do seu agente, como
                WhatsApp, email e agenda.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Badge
              variant="outline"
              className="hidden md:inline-flex items-center gap-1 text-xs"
            >
              <Bot className="w-3 h-3" />
              {abilities.length} habilidade(s) disponível(is)
            </Badge>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)] items-start">
          <Card className="space-y-5 border-border/60 bg-muted/40 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-base font-semibold">
                  Biblioteca de habilidades
                </p>
                <p className="text-xs text-muted-foreground max-w-xl">
                  Use os controles para ligar ou desligar habilidades. Cada card
                  mostra o status de configuração e um atalho para detalhes.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">
                  {abilities.length} habilidade(s)
                </Badge>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {abilities.map((ability) => {
                const visualInfo = getAbilityVisualInfo(
                  ability.component.identifier
                );

                return (
                  <button
                    key={ability.component.id}
                    type="button"
                    className="group flex flex-col gap-3 rounded-2xl border border-border/40 bg-card/40 px-4 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 hover:shadow-md"
                    onClick={() =>
                      ability.enabled &&
                      handleConfigureAbility(ability.component)
                    }
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {visualInfo.icon}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 space-y-0.5 pr-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold break-words">
                                {ability.component.name}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase tracking-wide flex-shrink-0"
                              >
                                {ability.component.identifier.replace(
                                  /_/g,
                                  " "
                                )}
                              </Badge>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 hover:bg-primary/10 flex-shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                  >
                                    <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle className="text-2xl flex items-center gap-3">
                                      {visualInfo.icon}
                                      {ability.component.name}
                                    </DialogTitle>
                                    <DialogDescription className="text-base">
                                      {ComponentConfigService.getDetailedInfo(
                                        ability.component.identifier
                                      )?.description ||
                                        ability.component.description}
                                    </DialogDescription>
                                  </DialogHeader>
                                  {(() => {
                                    const detailedInfo =
                                      ComponentConfigService.getDetailedInfo(
                                        ability.component.identifier
                                      );
                                    if (!detailedInfo) return null;

                                    return (
                                      <div className="space-y-6 mt-4">
                                        {detailedInfo.features.length > 0 && (
                                          <div>
                                            <h4 className="font-semibold mb-3 text-sm">
                                              Funcionalidades
                                            </h4>
                                            <ul className="space-y-2">
                                              {detailedInfo.features.map(
                                                (feature, index) => (
                                                  <li
                                                    key={index}
                                                    className="flex items-start gap-2 text-sm text-muted-foreground"
                                                  >
                                                    <span className="text-primary mt-1.5">
                                                      •
                                                    </span>
                                                    <span>{feature}</span>
                                                  </li>
                                                )
                                              )}
                                            </ul>
                                          </div>
                                        )}

                                        {detailedInfo.useCases.length > 0 && (
                                          <div>
                                            <h4 className="font-semibold mb-3 text-sm">
                                              Casos de Uso
                                            </h4>
                                            <ul className="space-y-2">
                                              {detailedInfo.useCases.map(
                                                (useCase, index) => (
                                                  <li
                                                    key={index}
                                                    className="flex items-start gap-2 text-sm text-muted-foreground"
                                                  >
                                                    <span className="text-primary mt-1.5">
                                                      •
                                                    </span>
                                                    <span>{useCase}</span>
                                                  </li>
                                                )
                                              )}
                                            </ul>
                                          </div>
                                        )}

                                        {detailedInfo.requirements &&
                                          detailedInfo.requirements.length >
                                            0 && (
                                            <div>
                                              <h4 className="font-semibold mb-3 text-sm">
                                                Requisitos
                                              </h4>
                                              <ul className="space-y-2">
                                                {detailedInfo.requirements.map(
                                                  (requirement, index) => (
                                                    <li
                                                      key={index}
                                                      className="flex items-start gap-2 text-sm text-muted-foreground"
                                                    >
                                                      <span className="text-primary mt-1.5">
                                                        •
                                                      </span>
                                                      <span>{requirement}</span>
                                                    </li>
                                                  )
                                                )}
                                              </ul>
                                            </div>
                                          )}
                                      </div>
                                    );
                                  })()}
                                </DialogContent>
                              </Dialog>
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                              {ability.component.description}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 min-w-[110px] flex-shrink-0">
                            <div className="min-h-[20px] flex items-center justify-end w-full">
                              {getStatusBadge(
                                ability.status,
                                ability.requiresConfig
                              )}
                            </div>
                            <Switch
                              id={`ability-${ability.component.id}`}
                              checked={ability.enabled}
                              onClick={(event) => event.stopPropagation()}
                              onCheckedChange={(checked) =>
                                handleToggleAbility(
                                  ability.component.id,
                                  Boolean(checked)
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border/40 bg-background/40 px-3 py-2 text-[11px] text-muted-foreground">
                      <p className="line-clamp-2 flex-1">{visualInfo.hint}</p>
                      {ComponentConfigService.requiresConfiguration(
                        ability.component.identifier
                      ) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!ability.enabled}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleConfigureAbility(ability.component);
                          }}
                          className="h-7 rounded-full px-3 text-[11px] gap-1.5 group-hover:border-primary/60 flex-shrink-0"
                        >
                          <Settings className="w-3 h-3" />
                          Configurar
                        </Button>
                      ) : (
                        <div className="w-[80px] flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}

              {!loading && abilities.length === 0 && (
                <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                  Nenhuma habilidade disponível no momento.
                </div>
              )}

              {loading && (
                <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                  Carregando habilidades...
                </div>
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-4 space-y-3 bg-card/60 border-border/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">
                    Status da sua instância de WhatsApp.
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Para considerar a habilidade de WhatsApp como{" "}
                <span className="font-semibold">configurada</span>, cada
                instância conectada precisa estar vinculada a um agente em{" "}
                <span className="font-semibold">Conectar WhatsApp</span> ou na
                edição do agente.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => navigate("/whatsapp")}
              >
                <MessageCircle className="w-4 h-4" />
                Gerenciar instâncias de WhatsApp
              </Button>
            </Card>

            <Card className="p-4 space-y-3 bg-card/60 border-border/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    Envio e agendamento de emails
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Configure utilizando Outlook ou Gmail.
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Utilize as credenciais SMTP do{" "}
                <span className="font-semibold">Outlook</span> ou{" "}
                <span className="font-semibold">Gmail</span> na configuração do
                componente de email para permitir envio e agendamento de
                mensagens.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Após ativar a habilidade de envio de emails na lista ao lado,
                clique em &quot;Configurar&quot; para definir servidor, porta,
                usuário e senha.
              </p>
            </Card>

            <Card className="p-4 space-y-3 bg-card/60 border-border/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Agenda e calendário</p>
                  <p className="text-xs text-muted-foreground">
                    Integre com o calendário do Outlook ou Google.
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Ao configurar a habilidade de{" "}
                <span className="font-semibold">Agendamento de Reuniões</span>,
                você pode utilizar tokens e IDs de calendário para integrar com
                sua agenda do Outlook ou Google Calendar.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Certifique-se de ativar a habilidade correspondente e preencher
                os dados de calendário na configuração do componente.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};
