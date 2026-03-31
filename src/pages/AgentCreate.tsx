import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Agent,
  AgentTemplateService,
  IAgentData,
} from "@/services/agents/AgentDomain";
import { AgentRepository } from "@/services/agents/AgentRepository";
import { PersonalityTraitsDragDrop } from "@/components/agents/PersonalityTraitsDragDrop";
import { VisualLevelSelector } from "@/components/agents/VisualLevelSelector";
import { AgentPreview } from "@/components/agents/AgentPreview";
import { StepNavigation } from "@/components/agents/StepNavigation";
import { ComponentsDragDrop } from "@/components/agents/ComponentsDragDrop";
import { Save, ArrowLeft, Sparkles, Wand2, Loader2, Info } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { supabase } from "@/integrations/supabase/client";
import { ComponentRepository } from "@/services/components/ComponentRepository";
import { IComponentData } from "@/services/components/ComponentDomain";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AgentScriptSelector } from "@/components/agents/AgentScriptSelector";
import {
  AgentScriptRepository,
  IAgentScript,
} from "@/services/agents/AgentScriptRepository";

const AVAILABLE_TRAITS = [
  "empático",
  "analítico",
  "persuasivo",
  "paciente",
  "proativo",
  "criativo",
  "resolutivo",
  "prestativo",
  "entusiasmado",
  "focado",
  "diplomático",
  "atento",
  "organizado",
  "eficiente",
  "claro",
  "amigável",
  "curioso",
  "respeitoso",
  "objetivo",
];

const CONVERSATION_FOCUS_OPTIONS = [
  "Vendas de produtos",
  "Vendas de serviços",
  "Vendas de soluções de automação",
  "Atendimento ao cliente",
  "Suporte técnico",
  "Onboarding de clientes",
  "Qualificação de leads",
  "Agendamento de reuniões",
  "Follow-up de oportunidades",
  "Recuperação de clientes",
  "Upsell e cross-sell",
  "Coleta de feedback",
  "Educação sobre produtos",
  "Resolução de problemas",
  "Consultoria comercial",
];

const MAIN_OBJECTIVE_OPTIONS = [
  "Identificar necessidades e agendar reunião comercial",
  "Qualificar leads e entender o perfil do cliente",
  "Apresentar produtos e serviços disponíveis",
  "Resolver dúvidas e objeções do cliente",
  "Agendar demonstração ou reunião",
  "Coletar informações de contato e preferências",
  "Fazer follow-up de oportunidades em aberto",
  "Oferecer suporte técnico e resolver problemas",
  "Onboardar novos clientes e explicar processos",
  "Recuperar clientes inativos",
  "Coletar feedback sobre produtos ou serviços",
  "Educar clientes sobre funcionalidades",
  "Fechar vendas e processar pedidos",
  "Manter relacionamento e fidelização",
];

const LabelWithTooltip = ({
  htmlFor,
  children,
  tooltip,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  tooltip: string;
}) => {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={htmlFor}>{children}</Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-4 h-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

const AgentCreate = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrganization();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>(
    []
  );
  const [availableComponentIds, setAvailableComponentIds] = useState<string[]>(
    []
  );
  const [components, setComponents] = useState<IComponentData[]>([]);
  const [whatsappInstances, setWhatsappInstances] = useState<
    Array<{
      id: string;
      instance_name: string;
      phone_number: string | null;
      status: string;
    }>
  >([]);
  const [selectedWhatsappInstanceId, setSelectedWhatsappInstanceId] = useState<
    string | null
  >(null);
  const [whatsappIntentionallyRemoved, setWhatsappIntentionallyRemoved] =
    useState(false);
  const [agent, setAgent] = useState<Agent>(
    new Agent({
      name: "",
      nickname: null,
      agent_description: null,
      conversation_focus: "",
      priority: "medium",
      rejection_action: "follow_up",
      tone: "professional",
      main_objective: "",
      additional_instructions: null,
      closing_instructions: null,
      personality_traits: [],
      communication_style: "balanced",
      expertise_level: "intermediate",
      response_length: "medium",
      empathy_level: "moderate",
      formality_level: "professional",
      humor_level: "none",
      proactivity_level: "moderate",
      agent_avatar_url: null,
      agent_color: "#3b82f6",
      should_introduce_itself: true,
      memory_amount: "20",
      script_id: null,
    })
  );

  const repository = useMemo(() => new AgentRepository(), []);
  const componentRepository = useMemo(() => new ComponentRepository(), []);
  const scriptRepository = useMemo(() => new AgentScriptRepository(), []);

  const steps = [
    { id: "basic", label: "Básico", description: "Informações principais" },
    {
      id: "personality",
      label: "Personalidade",
      description: "Traços e comportamento",
    },
    {
      id: "advanced",
      label: "Avançado",
      description: "Configurações detalhadas",
    },
    {
      id: "components",
      label: "Habilidades",
      description: "Componentes e capacidades do agente",
    },
    { id: "review", label: "Revisão", description: "Confirme e salve" },
  ];

  const loadAgent = useCallback(
    async (agentId: string) => {
      setLoading(true);
      try {
        const data = await repository.findById(agentId);
        if (data) {
          setAgent(new Agent(data));
          setCurrentStep(0);

          const componentIds = await repository.getAgentComponentIds(agentId);
          setSelectedComponentIds(componentIds);
          setWhatsappIntentionallyRemoved(false);
        }
      } catch (error) {
        toast.error("Erro ao carregar agente");
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [repository]
  );

  const whatsappComponent = useMemo(() => {
    return components.find((c) => c.identifier === "whatsapp_integration");
  }, [components]);

  const hasWhatsappSelected = useMemo(() => {
    if (!whatsappComponent) return false;
    return selectedComponentIds.includes(whatsappComponent.id);
  }, [selectedComponentIds, whatsappComponent]);

  const shouldShowWhatsappInstanceSelector = useMemo(() => {
    return hasWhatsappSelected && whatsappInstances.length > 1;
  }, [hasWhatsappSelected, whatsappInstances.length]);

  const handleComponentSelectionChange = useCallback(
    (newSelectedIds: string[]) => {
      const whatsappWasSelected =
        whatsappComponent &&
        selectedComponentIds.includes(whatsappComponent.id);
      const whatsappIsNowSelected =
        whatsappComponent && newSelectedIds.includes(whatsappComponent.id);

      if (whatsappWasSelected && !whatsappIsNowSelected && whatsappComponent) {
        setWhatsappIntentionallyRemoved(true);
      } else if (!whatsappWasSelected && whatsappIsNowSelected) {
        setWhatsappIntentionallyRemoved(false);
      }

      setSelectedComponentIds(newSelectedIds);
    },
    [selectedComponentIds, whatsappComponent]
  );

  const loadAvailableComponents = useCallback(async () => {
    if (!organization?.id) return;

    try {
      const allComponents = await componentRepository.findAll();
      setComponents(allComponents);

      const availableComponents =
        await componentRepository.findAvailableForOrganization(organization.id);
      const availableIds = availableComponents.map((c) => c.id);
      setAvailableComponentIds(availableIds);

      if (availableIds.length === 0 && allComponents.length > 0) {
        const allIds = allComponents.map((c) => c.id);
        setAvailableComponentIds(allIds);
      }
    } catch (error) {
      console.error("Erro ao carregar componentes disponíveis:", error);
      const allComponents = await componentRepository.findAll();
      setComponents(allComponents);
      const allIds = allComponents.map((c) => c.id);
      setAvailableComponentIds(allIds);
    }
  }, [componentRepository, organization?.id]);

  const loadWhatsappInstances = useCallback(async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("id, instance_name, phone_number, status")
        .eq("organization_id", organization.id)
        .eq("status", "connected")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setWhatsappInstances(data || []);
    } catch (error) {
      console.error("Erro ao carregar instâncias WhatsApp:", error);
      setWhatsappInstances([]);
    }
  }, [organization?.id]);

  const loadAgentComponentConfig = useCallback(
    async (agentId: string) => {
      if (!organization?.id) return;

      try {
        const whatsappComponent = components.find(
          (c) => c.identifier === "whatsapp_integration"
        );

        if (whatsappComponent) {
          const session = await supabase.auth.getSession();
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

          const response = await fetch(
            `${supabaseUrl}/rest/v1/agent_component_configurations?agent_id=eq.${agentId}&component_id=eq.${whatsappComponent.id}&select=config`,
            {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${
                  session.data.session?.access_token || ""
                }`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data && data[0]?.config?.whatsapp_instance_id) {
              setSelectedWhatsappInstanceId(data[0].config.whatsapp_instance_id);
            }
          }
        }

      } catch (error) {
        console.error("Erro ao carregar configuração do componente:", error);
      }
    },
    [components, organization?.id]
  );


  useEffect(() => {
    if (id) {
      loadAgent(id);
      setWhatsappIntentionallyRemoved(false);
    } else {
      setWhatsappIntentionallyRemoved(false);
    }
  }, [id, loadAgent]);

  useEffect(() => {
    if (organization?.id) {
      loadAvailableComponents();
      loadWhatsappInstances();
    }
  }, [organization?.id, loadAvailableComponents, loadWhatsappInstances]);

  useEffect(() => {
    if (id && components.length > 0) {
      loadAgentComponentConfig(id);
    }
  }, [id, components, loadAgentComponentConfig]);

  useEffect(() => {
    if (
      !id &&
      whatsappComponent &&
      !selectedComponentIds.includes(whatsappComponent.id) &&
      !whatsappIntentionallyRemoved
    ) {
      setSelectedComponentIds((prev) => [...prev, whatsappComponent.id]);

      if (whatsappInstances.length === 1 && !selectedWhatsappInstanceId) {
        setSelectedWhatsappInstanceId(whatsappInstances[0].id);
      }
    }
  }, [
    id,
    whatsappInstances,
    whatsappComponent,
    selectedComponentIds,
    selectedWhatsappInstanceId,
    whatsappIntentionallyRemoved,
  ]);

  const handleTemplateSelect = (
    template: ReturnType<typeof AgentTemplateService.getTemplates>[0]
  ) => {
    const newAgent = new Agent({
      name: "",
      nickname: null,
      agent_description: null,
      conversation_focus: "",
      priority: "medium",
      rejection_action: "follow_up",
      tone: "professional",
      main_objective: "",
      additional_instructions: null,
      closing_instructions: null,
      personality_traits: [],
      communication_style: "balanced",
      expertise_level: "intermediate",
      response_length: "medium",
      empathy_level: "moderate",
      formality_level: "professional",
      humor_level: "none",
      proactivity_level: "moderate",
      agent_avatar_url: template.icon ? `emoji:${template.icon}` : null,
      agent_color: "#3b82f6",
      should_introduce_itself: true,
      memory_amount: "20",
    });
    AgentTemplateService.applyTemplate(newAgent, template);
    setAgent(newAgent);
    toast.success(`Template "${template.name}" aplicado!`);
  };

  const handleFieldChange = <K extends keyof IAgentData>(
    field: K,
    value: IAgentData[K]
  ) => {
    const newAgent = new Agent(agent.getData());
    newAgent.updateField(field, value);
    setAgent(newAgent);
  };

  const applyScriptToAgent = (script: IAgentScript | null) => {
    const current = agent.getData();
    const nextAgent = new Agent({
      ...current,
      scenario_detection_enabled: script?.scenario_detection_enabled ?? false,
      proactive_opening_message: script?.proactive_opening_message ?? null,
      proactive_hook_message: script?.proactive_hook_message ?? null,
      proactive_development_paper:
        script?.proactive_development_paper ?? null,
      proactive_development_system:
        script?.proactive_development_system ?? null,
      receptive_welcome_template: script?.receptive_welcome_template ?? null,
      receptive_qualification_question:
        script?.receptive_qualification_question ?? null,
      receptive_deepening_question:
        script?.receptive_deepening_question ?? null,
      receptive_value_proposition:
        script?.receptive_value_proposition ?? null,
      company_clients: script?.company_clients ?? [],
      total_clients: script?.total_clients ?? null,
    });
    setAgent(nextAgent);
  };

  const handleScriptChange = async (scriptId: string | null) => {
    handleFieldChange("script_id", scriptId);

    if (!scriptId) {
      applyScriptToAgent(null);
      return;
    }

    try {
      const script = await scriptRepository.findById(scriptId);
      if (!script) {
        toast.error("Roteiro selecionado não encontrado");
        applyScriptToAgent(null);
        return;
      }
      applyScriptToAgent(script);
      toast.success("Roteiro aplicado ao agente");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao carregar roteiro";
      toast.error(errorMessage);
    }
  };

  const handleTraitsChange = (traits: string[]) => {
    handleFieldChange("personality_traits", traits);
  };

  const generateDescription = async () => {
    if (
      !agentData.name &&
      !agentData.conversation_focus &&
      !agentData.main_objective
    ) {
      toast.error(
        "Preencha pelo menos o nome do agente para gerar a descrição"
      );
      return;
    }

    setGeneratingDescription(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-agent-description",
        {
          body: {
            name: agentData.name || "",
            conversation_focus: agentData.conversation_focus || "",
            main_objective: agentData.main_objective || "",
          },
        }
      );

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      const generatedDescription = data.description || "";
      if (generatedDescription) {
        handleFieldChange("agent_description", generatedDescription);
        toast.success("Descrição gerada com sucesso!");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Error generating description:", error);
      toast.error("Erro ao gerar descrição: " + errorMessage);
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateMediaPaths = async (agentId: string) => {
    if (!organization?.id) return;

    const updatedMediaItems = mediaItems.map((media) => {
      if (media.url.includes("/temp-")) {
        const urlParts = media.url.split("/");
        const fileName = urlParts[urlParts.length - 1];
        const newPath = `${organization.id}/${agentId}/${fileName}`;
        const {
          data: { publicUrl },
        } = supabase.storage.from("media-sender").getPublicUrl(newPath);
        return { ...media, url: publicUrl };
      }
      return media;
    });

    if (JSON.stringify(updatedMediaItems) !== JSON.stringify(mediaItems)) {
      setMediaItems(updatedMediaItems);
    }
  };

  const saveAgentComponentConfig = async (agentId: string) => {
    if (whatsappComponent && hasWhatsappSelected) {
      if (shouldShowWhatsappInstanceSelector && !selectedWhatsappInstanceId) {
        toast.error(
          "Selecione uma instância WhatsApp para o agente ou remova a habilidade WhatsApp"
        );
        throw new Error("Instância WhatsApp não selecionada");
      }

      if (shouldShowWhatsappInstanceSelector && selectedWhatsappInstanceId) {
        const { error } = await supabase
          .from("agent_component_configurations")
          .upsert(
            {
              agent_id: agentId,
              component_id: whatsappComponent.id,
              config: {
                whatsapp_instance_id: selectedWhatsappInstanceId,
              },
            },
            {
              onConflict: "agent_id,component_id",
            }
          );

        if (error) {
          throw new Error(
            `Erro ao salvar configuração do componente: ${error.message}`
          );
        }
      } else if (hasWhatsappSelected && !shouldShowWhatsappInstanceSelector) {
        if (whatsappInstances.length === 1) {
          const { error } = await supabase
            .from("agent_component_configurations")
            .upsert(
              {
                agent_id: agentId,
                component_id: whatsappComponent.id,
                config: {
                  whatsapp_instance_id: whatsappInstances[0].id,
                },
              },
              {
                onConflict: "agent_id,component_id",
              }
            );

          if (error) {
            throw new Error(
              `Erro ao salvar configuração do componente: ${error.message}`
            );
          }
        }
      } else if (!hasWhatsappSelected && whatsappComponent) {
        const { error } = await supabase
          .from("agent_component_configurations")
          .delete()
          .eq("agent_id", agentId)
          .eq("component_id", whatsappComponent.id);

        if (error) {
          console.error("Erro ao remover configuração do componente:", error);
        }
      }
    }

  };

  const handleSave = async () => {
    const validation = agent.validate();
    if (!validation.isValid) {
      toast.error(validation.errors[0]);
      return;
    }

    if (!organization?.id) {
      toast.error("Organização não encontrada");
      return;
    }

    setLoading(true);
    try {
      const agentData = agent.getData();
      const dataToSave = {
        ...agentData,
        organization_id: organization.id,
      };

      let agentId: string;
      if (id) {
        await repository.update(id, dataToSave, selectedComponentIds);
        agentId = id;
        toast.success("Agente atualizado com sucesso!");
      } else {
        agentId = await repository.save(dataToSave, selectedComponentIds);
        toast.success("Agente criado com sucesso!");
      }

      await saveAgentComponentConfig(agentId);

      navigate("/ai-interaction");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao salvar agente";
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const agentData = agent.getData();

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in-50 duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/ai-interaction")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {id ? "Editar Agente" : "Criar Novo Agente"}
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Configure seu agente de IA de forma interativa e intuitiva
              </p>
            </div>
          </div>
        </div>

        <StepNavigation
          steps={steps}
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          onNext={handleNext}
          onPrevious={handlePrevious}
          canGoNext={currentStep < steps.length - 1}
          canGoPrevious={currentStep > 0}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6">
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">
                      Informações Básicas
                    </h3>

                    <div className="space-y-4 mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <LabelWithTooltip
                            htmlFor="name"
                            tooltip="Nome identificador do agente. Este será o nome principal usado para referenciar o agente no sistema e nas conversas."
                          >
                            Nome do Agente *
                          </LabelWithTooltip>
                          <Input
                            id="name"
                            value={agentData.name}
                            onChange={(e) =>
                              handleFieldChange("name", e.target.value)
                            }
                            placeholder="Ex: Vendedor Consultivo"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <LabelWithTooltip
                              htmlFor="nickname"
                              tooltip="Apelido usado quando o agente se apresenta ao cliente. Se não preenchido, o nome do agente será usado. Exemplo: 'Olá, eu sou o Dom, seu assistente comercial'."
                            >
                              Apelido (Opcional)
                            </LabelWithTooltip>
                            <span className="text-[10px] text-muted-foreground">
                              Usado quando o agente se apresenta
                            </span>
                          </div>
                          <Input
                            id="nickname"
                            value={agentData.nickname || ""}
                            onChange={(e) =>
                              handleFieldChange(
                                "nickname",
                                e.target.value || null
                              )
                            }
                            placeholder="Ex: Dom, Assistente Comercial"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <LabelWithTooltip
                            htmlFor="description"
                            tooltip="Descrição detalhada do agente que será usada para contextualizar sua personalidade, função e comportamento. Pode ser gerada automaticamente pela IA com base no nome, foco e objetivo do agente."
                          >
                            Descrição
                          </LabelWithTooltip>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={generateDescription}
                            disabled={generatingDescription || !agentData.name}
                            className="h-7 text-xs"
                          >
                            {generatingDescription ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Gerando...
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-3 h-3 mr-1" />
                                Gerar com IA
                              </>
                            )}
                          </Button>
                        </div>
                        <Textarea
                          id="description"
                          value={agentData.agent_description || ""}
                          onChange={(e) =>
                            handleFieldChange(
                              "agent_description",
                              e.target.value || null
                            )
                          }
                          placeholder="Breve descrição do agente... (opcional - pode ser gerada automaticamente)"
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <LabelWithTooltip
                          htmlFor="conversation_focus"
                          tooltip="Define o tema principal das conversas que o agente terá. Isso ajuda a direcionar o contexto e o tipo de interação esperada. Você pode selecionar uma opção pré-definida ou criar um foco personalizado."
                        >
                          Foco da Conversa *
                        </LabelWithTooltip>
                        <Combobox
                          options={CONVERSATION_FOCUS_OPTIONS}
                          value={agentData.conversation_focus}
                          onChange={(value) =>
                            handleFieldChange("conversation_focus", value)
                          }
                          placeholder="Selecione ou digite o foco da conversa..."
                          searchPlaceholder="Buscar foco..."
                          allowCustom={true}
                        />
                      </div>

                      <div className="space-y-2">
                        <LabelWithTooltip
                          htmlFor="main_objective"
                          tooltip="O objetivo principal que o agente deve alcançar em cada conversa. Este é o resultado desejado que guiará o comportamento e as estratégias do agente durante as interações."
                        >
                          Objetivo Principal *
                        </LabelWithTooltip>
                        <Combobox
                          options={MAIN_OBJECTIVE_OPTIONS}
                          value={agentData.main_objective}
                          onChange={(value) =>
                            handleFieldChange("main_objective", value)
                          }
                          placeholder="Selecione ou digite o objetivo principal..."
                          searchPlaceholder="Buscar objetivo..."
                          allowCustom={true}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <LabelWithTooltip
                            htmlFor="priority"
                            tooltip="Define a prioridade de processamento das mensagens deste agente. Agentes com prioridade alta terão preferência no processamento quando houver múltiplas conversas simultâneas."
                          >
                            Prioridade
                          </LabelWithTooltip>
                          <Select
                            value={agentData.priority}
                            onValueChange={(value) =>
                              handleFieldChange("priority", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Baixa</SelectItem>
                              <SelectItem value="medium">Média</SelectItem>
                              <SelectItem value="high">Alta</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <LabelWithTooltip
                            htmlFor="tone"
                            tooltip="Define o tom geral de comunicação do agente. O tom influencia como o agente se expressa e se relaciona com os clientes, desde formal e profissional até amigável e empático."
                          >
                            Tom de Voz
                          </LabelWithTooltip>
                          <Select
                            value={agentData.tone}
                            onValueChange={(value) =>
                              handleFieldChange("tone", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="professional">
                                Profissional
                              </SelectItem>
                              <SelectItem value="friendly">Amigável</SelectItem>
                              <SelectItem value="enthusiastic">
                                Entusiasmado
                              </SelectItem>
                              <SelectItem value="direct">Direto</SelectItem>
                              <SelectItem value="empathetic">
                                Empático
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <LabelWithTooltip
                          htmlFor="rejection_action"
                          tooltip="Define como o agente deve reagir quando um lead rejeitar uma proposta ou oferta. Isso ajuda a manter a relação profissional e pode abrir oportunidades futuras."
                        >
                          Ação quando Lead Rejeitar
                        </LabelWithTooltip>
                        <Select
                          value={agentData.rejection_action}
                          onValueChange={(value) =>
                            handleFieldChange("rejection_action", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="follow_up">
                              Agendar Follow-up
                            </SelectItem>
                            <SelectItem value="offer_alternative">
                              Oferecer Alternativas
                            </SelectItem>
                            <SelectItem value="ask_reason">
                              Perguntar Motivo
                            </SelectItem>
                            <SelectItem value="thank_and_close">
                              Encerrar Educadamente
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Card className="p-6 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/5 to-primary/10 mt-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-primary" />
                          <h4 className="text-lg font-semibold text-foreground">
                            Comportamento Inicial e Memória
                          </h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Configure como o agente inicia conversas e quanta
                          informação ele mantém em memória
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                          <div className="space-y-3">
                            <LabelWithTooltip
                              htmlFor="should_introduce_itself"
                              tooltip="Define se o agente deve se apresentar automaticamente no início de cada conversa. Quando ativado, o agente se apresenta usando seu nome ou apelido de forma amigável e profissional."
                            >
                              Deve Começar Se Apresentando
                            </LabelWithTooltip>
                            <Select
                              value={
                                agentData.should_introduce_itself
                                  ? "true"
                                  : "false"
                              }
                              onValueChange={(value) =>
                                handleFieldChange(
                                  "should_introduce_itself",
                                  value === "true"
                                )
                              }
                            >
                              <SelectTrigger className="h-11">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">
                                  Sim - Agente se apresenta automaticamente
                                </SelectItem>
                                <SelectItem value="false">
                                  Não - Agente responde diretamente
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              {agentData.should_introduce_itself
                                ? "O agente começará cada conversa se apresentando com seu nome ou apelido"
                                : "O agente responderá diretamente às mensagens sem se apresentar"}
                            </p>
                          </div>

                          <div className="space-y-3">
                            <LabelWithTooltip
                              htmlFor="memory_amount"
                              tooltip="Define quantas mensagens anteriores o agente deve considerar ao responder (máximo 20). Um número maior permite que o agente mantenha mais contexto da conversa, enquanto um número menor foca apenas no contexto imediato."
                            >
                              Número de Mensagens em Memória (Máx: 20)
                            </LabelWithTooltip>
                            <div className="flex items-center gap-2">
                              <Input
                                id="memory_amount"
                                type="number"
                                min="5"
                                max="20"
                                step="5"
                                value={
                                  typeof agentData.memory_amount === "string" &&
                                  !isNaN(Number(agentData.memory_amount))
                                    ? Math.min(
                                        Number(agentData.memory_amount),
                                        20
                                      ).toString()
                                    : "20"
                                }
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (
                                    value === "" ||
                                    (!isNaN(Number(value)) &&
                                      Number(value) >= 5 &&
                                      Number(value) <= 20)
                                  ) {
                                    const numValue =
                                      value === ""
                                        ? 20
                                        : Math.min(Number(value), 20);
                                    handleFieldChange(
                                      "memory_amount",
                                      numValue.toString()
                                    );
                                  }
                                }}
                                className="h-11"
                                placeholder="20"
                              />
                              <span className="text-sm text-muted-foreground whitespace-nowrap">
                                mensagens
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() =>
                                  handleFieldChange("memory_amount", "10")
                                }
                              >
                                10
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() =>
                                  handleFieldChange("memory_amount", "20")
                                }
                              >
                                20
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() =>
                                  handleFieldChange("memory_amount", "15")
                                }
                              >
                                15
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() =>
                                  handleFieldChange("memory_amount", "5")
                                }
                              >
                                5
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Limite máximo: 20 mensagens. Recomendado: 10-15
                              para conversas curtas, 20 para conversas longas
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <div className="pt-6 mt-6 border-t">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-sm text-muted-foreground">
                          Template (Opcional)
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Comece com uma configuração pré-definida ou pule para
                        criar do zero
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {AgentTemplateService.getTemplates().map((template) => (
                          <button
                            key={template.name}
                            type="button"
                            onClick={() => handleTemplateSelect(template)}
                            className="p-2 border rounded-md hover:border-primary/50 hover:bg-muted/50 transition-all text-left group"
                          >
                            <div className="flex items-start gap-2">
                              <div className="text-xl">{template.icon}</div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-xs mb-0.5 truncate">
                                  {template.name}
                                </h4>
                                <p className="text-[10px] text-muted-foreground line-clamp-2">
                                  {template.description}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-xl font-semibold">
                        Habilidades e Componentes
                      </h3>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">
                              Componentes são habilidades específicas que o
                              agente pode usar durante as conversas, como
                              consultar documentos, fazer cálculos, buscar
                              informações, etc. Selecione e ordene por
                              prioridade arrastando e soltando. A ordem define
                              qual componente será usado primeiro quando
                              múltiplos forem aplicáveis.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Defina quais componentes e habilidades este agente poderá
                      utilizar e a prioridade de cada um.
                    </p>
                    <ComponentsDragDrop
                      components={components}
                      selectedComponentIds={selectedComponentIds}
                      availableComponentIds={availableComponentIds}
                      onSelectionChange={handleComponentSelectionChange}
                    />
                  </div>

                  {shouldShowWhatsappInstanceSelector && (
                    <Card className="p-6 border-primary/20 bg-primary/5">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <LabelWithTooltip tooltip="Selecione qual instância WhatsApp este agente deve usar. Se você tem múltiplas instâncias conectadas, cada agente pode usar uma instância diferente.">
                            Instância WhatsApp para este Agente
                          </LabelWithTooltip>
                        </div>
                        <Select
                          value={selectedWhatsappInstanceId || ""}
                          onValueChange={setSelectedWhatsappInstanceId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma instância WhatsApp..." />
                          </SelectTrigger>
                          <SelectContent>
                            {whatsappInstances.map((instance) => (
                              <SelectItem key={instance.id} value={instance.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {instance.instance_name}
                                  </span>
                                  {instance.phone_number && (
                                    <span className="text-xs text-muted-foreground">
                                      {instance.phone_number}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!selectedWhatsappInstanceId && (
                          <p className="text-sm text-destructive">
                            Você deve selecionar uma instância WhatsApp para
                            este agente.
                          </p>
                        )}
                      </div>
                    </Card>
                  )}

                  {hasWhatsappSelected && whatsappInstances.length === 0 && (
                    <Card className="p-6 border-yellow-500/20 bg-yellow-500/5">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                          Nenhuma instância WhatsApp conectada
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Para usar a habilidade WhatsApp, você precisa ter pelo
                          menos uma instância conectada.{" "}
                          <Button
                            variant="link"
                            className="h-auto p-0 text-xs"
                            onClick={() => navigate("/whatsapp")}
                          >
                            Conectar instância WhatsApp
                          </Button>
                        </p>
                      </div>
                    </Card>
                  )}

                  {hasWhatsappSelected && whatsappInstances.length === 1 && (
                    <Card className="p-6 border-muted">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          Instância WhatsApp selecionada automaticamente
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Como você tem apenas uma instância conectada, ela será
                          usada automaticamente:{" "}
                          <span className="font-medium">
                            {whatsappInstances[0].instance_name}
                          </span>
                          {whatsappInstances[0].phone_number && (
                            <span className="text-muted-foreground">
                              {" "}
                              ({whatsappInstances[0].phone_number})
                            </span>
                          )}
                        </p>
                      </div>
                    </Card>
                  )}

                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">
                      Personalidade e Comportamento
                    </h3>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>Traços de Personalidade</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">
                                  Selecione os traços de personalidade que
                                  melhor descrevem como o agente deve se
                                  comportar. Você pode arrastar e soltar para
                                  ordenar por prioridade. A IA pode sugerir
                                  traços baseados no contexto do agente.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <PersonalityTraitsDragDrop
                          traits={agentData.personality_traits}
                          availableTraits={AVAILABLE_TRAITS}
                          onTraitsChange={handleTraitsChange}
                          agentContext={{
                            name: agentData.name,
                            conversation_focus: agentData.conversation_focus,
                            main_objective: agentData.main_objective,
                          }}
                        />
                      </div>

                      <VisualLevelSelector
                        label="Estilo de Comunicação"
                        value={agentData.communication_style}
                        onChange={(value) =>
                          handleFieldChange("communication_style", value)
                        }
                        tooltip="Define a abordagem geral de comunicação do agente. Direto foca em objetividade, Consultivo em entender necessidades (fazendo mais perguntas quando necessário, inclusive ao buscar mídias), Suportivo em empatia (evitando muitas perguntas e escolhendo recursos automaticamente com base na conversa), e Equilibrado combina diferentes estilos conforme a situação."
                        options={[
                          {
                            value: "direct",
                            label: "Direto",
                            emoji: "🎯",
                            description: "Objetivo e direto ao ponto",
                          },
                          {
                            value: "consultative",
                            label: "Consultivo",
                            emoji: "💡",
                            description: "Foca em entender e aconselhar",
                          },
                          {
                            value: "supportive",
                            label: "Suportivo",
                            emoji: "🤝",
                            description: "Empático e acolhedor",
                          },
                          {
                            value: "balanced",
                            label: "Equilibrado",
                            emoji: "⚖️",
                            description: "Combina diferentes estilos",
                          },
                        ]}
                      />

                      <VisualLevelSelector
                        label="Nível de Expertise"
                        value={agentData.expertise_level}
                        onChange={(value) =>
                          handleFieldChange("expertise_level", value)
                        }
                        tooltip="Define o nível de conhecimento técnico e profundo que o agente demonstra. Níveis mais altos permitem respostas mais detalhadas e técnicas, enquanto níveis mais baixos mantêm a simplicidade."
                        options={[
                          {
                            value: "beginner",
                            label: "Iniciante",
                            emoji: "🌱",
                            description: "Básico e simples",
                          },
                          {
                            value: "intermediate",
                            label: "Intermediário",
                            emoji: "📚",
                            description: "Conhecimento moderado",
                          },
                          {
                            value: "advanced",
                            label: "Avançado",
                            emoji: "🎓",
                            description: "Alto conhecimento",
                          },
                          {
                            value: "expert",
                            label: "Especialista",
                            emoji: "🏆",
                            description: "Máximo conhecimento",
                          },
                        ]}
                      />

                      <VisualLevelSelector
                        label="Comprimento da Resposta"
                        value={agentData.response_length}
                        onChange={(value) =>
                          handleFieldChange("response_length", value)
                        }
                        tooltip="Controla o tamanho médio das respostas do agente. Respostas curtas são mais diretas, médias oferecem contexto adequado, e longas fornecem explicações detalhadas e completas."
                        options={[
                          { value: "short", label: "Curta", emoji: "📝" },
                          { value: "medium", label: "Média", emoji: "📄" },
                          { value: "long", label: "Longa", emoji: "📑" },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">
                      Configurações Avançadas
                    </h3>
                    <div className="space-y-6">
                      <VisualLevelSelector
                        label="Nível de Empatia"
                        value={agentData.empathy_level}
                        onChange={(value) =>
                          handleFieldChange("empathy_level", value)
                        }
                        tooltip="Define o quanto o agente demonstra compreensão e sensibilidade às emoções e necessidades do cliente. Níveis mais altos resultam em respostas mais calorosas e acolhedoras e, combinados com um estilo mais Suportivo, tendem a reduzir a quantidade de perguntas extras (por exemplo, ao enviar mídias, o agente prefere escolher sozinho algo acolhedor em vez de pedir muitos detalhes)."
                        options={[
                          { value: "low", label: "Baixa", emoji: "😐" },
                          { value: "moderate", label: "Moderada", emoji: "🙂" },
                          { value: "high", label: "Alta", emoji: "😊" },
                        ]}
                      />

                      <VisualLevelSelector
                        label="Nível de Formalidade"
                        value={agentData.formality_level}
                        onChange={(value) =>
                          handleFieldChange("formality_level", value)
                        }
                        tooltip="Controla o grau de formalidade na linguagem. Casual usa linguagem mais descontraída, Profissional mantém um tom equilibrado, e Formal utiliza linguagem mais cerimoniosa e respeitosa."
                        options={[
                          { value: "casual", label: "Casual", emoji: "👕" },
                          {
                            value: "professional",
                            label: "Profissional",
                            emoji: "👔",
                          },
                          { value: "formal", label: "Formal", emoji: "🎩" },
                        ]}
                      />

                      <VisualLevelSelector
                        label="Nível de Humor"
                        value={agentData.humor_level}
                        onChange={(value) =>
                          handleFieldChange("humor_level", value)
                        }
                        tooltip="Define se e como o agente usa humor nas conversas. Pode tornar as interações mais leves e agradáveis, mas deve ser usado com cuidado dependendo do contexto e tipo de cliente."
                        options={[
                          { value: "none", label: "Nenhum", emoji: "😐" },
                          { value: "subtle", label: "Sutil", emoji: "😊" },
                          { value: "moderate", label: "Moderado", emoji: "😄" },
                          { value: "high", label: "Alto", emoji: "😂" },
                        ]}
                      />

                      <VisualLevelSelector
                        label="Nível de Proatividade"
                        value={agentData.proactivity_level}
                        onChange={(value) =>
                          handleFieldChange("proactivity_level", value)
                        }
                        tooltip="Define o quanto o agente toma iniciativa nas conversas. Agentes mais proativos fazem perguntas, sugerem próximos passos e conduzem a conversa (por exemplo, em estilo mais Consultivo podem conduzir uma ‘busca guiada’ ao escolher mídias), enquanto níveis mais baixos focam em responder de forma simples e com menos perguntas extras."
                        options={[
                          { value: "passive", label: "Passivo", emoji: "⏸️" },
                          { value: "moderate", label: "Moderado", emoji: "▶️" },
                          { value: "high", label: "Alto", emoji: "🚀" },
                        ]}
                      />

                      <div className="space-y-2">
                        <LabelWithTooltip
                          htmlFor="closing_instructions"
                          tooltip="Instruções específicas sobre como o agente deve finalizar a conversa quando não conseguir fechar uma venda ou atingir o objetivo principal. Útil para manter uma experiência positiva mesmo em situações de rejeição."
                        >
                          Instruções de Fechamento (Opcional)
                        </LabelWithTooltip>
                        <Textarea
                          id="closing_instructions"
                          value={agentData.closing_instructions || ""}
                          onChange={(e) =>
                            handleFieldChange(
                              "closing_instructions",
                              e.target.value || null
                            )
                          }
                          placeholder="Como finalizar quando não fechar a venda..."
                          rows={4}
                        />
                      </div>

                      <div className="space-y-2">
                        <LabelWithTooltip
                          htmlFor="additional_instructions"
                          tooltip="Instruções adicionais específicas que o agente deve seguir durante as conversas. Use este campo para regras de negócio, políticas específicas, ou comportamentos particulares que não são cobertos pelos outros campos."
                        >
                          Instruções Adicionais (Opcional)
                        </LabelWithTooltip>
                        <Textarea
                          id="additional_instructions"
                          value={agentData.additional_instructions || ""}
                          onChange={(e) =>
                            handleFieldChange(
                              "additional_instructions",
                              e.target.value || null
                            )
                          }
                          placeholder="Instruções específicas adicionais..."
                          rows={4}
                        />
                      </div>
                    </div>

                    <Card className="p-6 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/5 to-primary/10 mt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            <h4 className="text-lg font-semibold text-foreground">
                              Roteiro de Conversação
                            </h4>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/agent-scripts")}
                          >
                            Gerenciar Roteiros
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Selecione um roteiro pré-configurado ou deixe em branco para não usar roteiro específico
                        </p>

                        <div className="space-y-2">
                          <LabelWithTooltip
                            htmlFor="script_id"
                            tooltip="Selecione um roteiro de conversação pré-configurado. Os roteiros definem como o agente deve se comportar em diferentes cenários (prospecção ativa ou atendimento receptivo)."
                          >
                            Roteiro (Opcional)
                          </LabelWithTooltip>
                          <AgentScriptSelector
                            organizationId={organization?.id || ""}
                            value={agentData.script_id || null}
                            onChange={handleScriptChange}
                          />
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">
                      Revisão Final
                    </h3>
                    <div className="space-y-4">
                      <Card className="p-4">
                        <h4 className="font-semibold mb-2">
                          Informações Básicas
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="text-muted-foreground">Nome:</span>{" "}
                            {agentData.name || "Não definido"}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Foco:</span>{" "}
                            {agentData.conversation_focus || "Não definido"}
                          </p>
                          <p>
                            <span className="text-muted-foreground">
                              Objetivo:
                            </span>{" "}
                            {agentData.main_objective || "Não definido"}
                          </p>
                        </div>
                      </Card>

                      <Card className="p-4">
                        <h4 className="font-semibold mb-2">Personalidade</h4>
                        <div className="flex flex-wrap gap-2">
                          {agentData.personality_traits.length > 0 ? (
                            agentData.personality_traits.map((trait) => (
                              <span
                                key={trait}
                                className="px-2 py-1 bg-secondary rounded text-sm"
                              >
                                {trait}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Nenhum traço definido
                            </span>
                          )}
                        </div>
                      </Card>

                      <Card className="p-4">
                        <h4 className="font-semibold mb-2">Configurações</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <p>
                            <span className="text-muted-foreground">
                              Prioridade:
                            </span>{" "}
                            <span className="capitalize">
                              {agentData.priority}
                            </span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">Tom:</span>{" "}
                            <span className="capitalize">{agentData.tone}</span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">
                              Estilo:
                            </span>{" "}
                            <span className="capitalize">
                              {agentData.communication_style}
                            </span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">
                              Expertise:
                            </span>{" "}
                            <span className="capitalize">
                              {agentData.expertise_level}
                            </span>
                          </p>
                        </div>
                      </Card>

                      <div className="flex gap-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handlePrevious}
                          className="flex-1"
                        >
                          Voltar
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSave}
                          disabled={loading}
                          className="flex-1"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {loading
                            ? "Salvando..."
                            : id
                            ? "Atualizar"
                            : "Criar Agente"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="lg:col-span-1">
            <AgentPreview
              agent={agentData}
              onIconChange={(value) =>
                handleFieldChange("agent_avatar_url", value)
              }
              onColorChange={(value) => handleFieldChange("agent_color", value)}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AgentCreate;
