import { IComponentData } from "./ComponentDomain";

export type ComponentConfigType = "oauth" | "none" | "custom";

export interface ComponentConfigDefinition {
  requiresConfiguration: boolean;
  configType: ComponentConfigType;
  oauthProviders?: Array<{
    provider: string;
    name: string;
    description: string;
  }>;
  customConfigPath?: string;
}

export interface ComponentDetailedInfo {
  title: string;
  description: string;
  features: string[];
  useCases: string[];
  requirements?: string[];
}

export class ComponentConfigService {
  private static configMap: Record<string, ComponentConfigDefinition> = {
    email_sender: {
      requiresConfiguration: true,
      configType: "oauth",
      oauthProviders: [
        {
          provider: "gmail",
          name: "Gmail",
          description: "Conecte sua conta Gmail para envio de emails",
        },
        {
          provider: "outlook",
          name: "Outlook",
          description: "Conecte sua conta Outlook para envio de emails",
        },
      ],
    },
    meeting_scheduler: {
      requiresConfiguration: true,
      configType: "oauth",
      oauthProviders: [
        {
          provider: "google_calendar",
          name: "Google Calendar",
          description: "Conecte seu Google Calendar para agendamento",
        },
        {
          provider: "outlook_calendar",
          name: "Outlook Calendar",
          description: "Conecte seu Outlook Calendar para agendamento",
        },
      ],
    },
    whatsapp_integration: {
      requiresConfiguration: true,
      configType: "custom",
      customConfigPath: "/whatsapp",
    },
    bant_analysis: {
      requiresConfiguration: false,
      configType: "none",
    },
    crm_query: {
      requiresConfiguration: false,
      configType: "none",
    },
    proposal_creator: {
      requiresConfiguration: false,
      configType: "none",
    },
    auto_followup: {
      requiresConfiguration: false,
      configType: "none",
    },
    sentiment_analysis: {
      requiresConfiguration: false,
      configType: "none",
    },
    report_generator: {
      requiresConfiguration: false,
      configType: "none",
    },
    auto_lead_status_update: {
      requiresConfiguration: false,
      configType: "none",
    },
    media_sender: {
      requiresConfiguration: true,
      configType: "custom",
      customConfigPath: "/media-sender",
    },
    product_selection: {
      requiresConfiguration: false,
      configType: "none",
    },
    instagram_integration: {
      requiresConfiguration: true,
      configType: "custom",
      customConfigPath: "/instagram",
    },
  };

  static getConfig(identifier: string): ComponentConfigDefinition {
    return (
      this.configMap[identifier] || {
        requiresConfiguration: false,
        configType: "none",
      }
    );
  }

  static requiresConfiguration(identifier: string): boolean {
    return this.getConfig(identifier).requiresConfiguration;
  }

  static getConfigType(identifier: string): ComponentConfigType {
    return this.getConfig(identifier).configType;
  }

  static getOAuthProviders(identifier: string) {
    return this.getConfig(identifier).oauthProviders || [];
  }

  static getCustomConfigPath(identifier: string): string | undefined {
    return this.getConfig(identifier).customConfigPath;
  }

  static registerComponent(
    identifier: string,
    config: ComponentConfigDefinition
  ): void {
    this.configMap[identifier] = config;
  }

  private static detailedInfoMap: Record<string, ComponentDetailedInfo> = {
    email_sender: {
      title: "Envio de Emails",
      description:
        "Permite ao agente enviar emails automaticamente para clientes e leads. O agente pode criar mensagens personalizadas, agendar envios e fazer follow-ups automáticos.",
      features: [
        "Envio automático de emails personalizados",
        "Agendamento de envios futuros",
        "Templates de mensagens pré-configurados",
        "Follow-ups automáticos baseados em eventos",
        "Rastreamento de abertura e cliques",
        "Integração com Gmail e Outlook",
      ],
      useCases: [
        "Enviar propostas comerciais por email",
        "Follow-up automático após reuniões",
        "Lembretes de compromissos agendados",
        "Boletins informativos para clientes",
        "Confirmações de pedidos e serviços",
      ],
      requirements: [
        "Conexão com conta de email (Gmail ou Outlook)",
        "Permissões para envio de emails",
      ],
    },
    meeting_scheduler: {
      title: "Agendamento de Reuniões",
      description:
        "Permite ao agente agendar reuniões e consultas automaticamente. O agente pode verificar disponibilidade, criar eventos no calendário e enviar convites.",
      features: [
        "Verificação automática de disponibilidade",
        "Criação de eventos no calendário",
        "Envio de convites por email",
        "Lembretes automáticos antes das reuniões",
        "Sincronização com Google Calendar e Outlook",
        "Gestão de múltiplos calendários",
      ],
      useCases: [
        "Agendar demonstrações de produtos",
        "Marcar consultas comerciais",
        "Organizar reuniões de follow-up",
        "Gerenciar agenda de vendas",
        "Coordenar reuniões de equipe",
      ],
      requirements: [
        "Conexão com Google Calendar ou Outlook Calendar",
        "Permissões de leitura e escrita no calendário",
      ],
    },
    crm_query: {
      title: "Consulta de Informações",
      description:
        "Permite ao agente consultar informações diretamente do CRM durante as conversas. O agente pode acessar histórico de interações, dados de clientes e informações relevantes.",
      features: [
        "Consulta de histórico de interações",
        "Acesso a dados de clientes e leads",
        "Busca de informações relevantes",
        "Análise de padrões de comportamento",
        "Integração direta com o banco de dados",
      ],
      useCases: [
        "Verificar histórico de conversas anteriores",
        "Consultar informações de contato",
        "Acessar dados de pedidos e serviços",
        "Verificar status de leads",
        "Analisar interações passadas",
      ],
    },
    proposal_creator: {
      title: "Criação de Propostas",
      description:
        "Permite ao agente criar e enviar propostas comerciais personalizadas automaticamente. O agente pode gerar documentos profissionais baseados em templates e dados do cliente.",
      features: [
        "Geração automática de propostas",
        "Templates personalizáveis",
        "Cálculo automático de valores",
        "Inclusão de termos e condições",
        "Envio automático por email",
        "Rastreamento de propostas enviadas",
      ],
      useCases: [
        "Criar propostas comerciais personalizadas",
        "Gerar orçamentos baseados em necessidades",
        "Enviar cotações de produtos e serviços",
        "Preparar documentos comerciais",
        "Automatizar processo de vendas",
      ],
    },
    auto_followup: {
      title: "Follow-up Automático",
      description:
        "Permite ao agente realizar follow-ups automáticos com leads e clientes em momentos estratégicos. O agente pode criar sequências de mensagens e acompanhar o engajamento.",
      features: [
        "Sequências de follow-up configuráveis",
        "Agendamento automático de mensagens",
        "Personalização baseada em comportamento",
        "Múltiplos canais de comunicação",
        "Análise de engajamento",
        "Pausa automática em respostas",
      ],
      useCases: [
        "Follow-up após primeira interação",
        "Lembretes de propostas pendentes",
        "Reengajamento de leads frios",
        "Acompanhamento pós-venda",
        "Nurturing de leads",
      ],
    },
    whatsapp_integration: {
      title: "Integração com WhatsApp",
      description:
        "Permite ao agente interagir via WhatsApp de forma integrada ao CRM. O agente pode enviar e receber mensagens, gerenciar conversas e manter histórico completo.",
      features: [
        "Envio e recebimento de mensagens",
        "Gestão de múltiplas conversas",
        "Histórico completo de interações",
        "Envio de mídias (imagens, documentos)",
        "Status de entrega e leitura",
        "Integração com instâncias WhatsApp Business",
      ],
      useCases: [
        "Atendimento ao cliente via WhatsApp",
        "Envio de propostas e documentos",
        "Follow-up por mensagem",
        "Suporte técnico",
        "Comunicação rápida com leads",
      ],
      requirements: [
        "Instância WhatsApp Business conectada",
        "Número de telefone verificado",
      ],
    },
    sentiment_analysis: {
      title: "Análise de Sentimento",
      description:
        "Permite ao agente analisar o sentimento das conversas para identificar emoções, satisfação e necessidades dos clientes. Ajuda a priorizar atendimentos e melhorar a experiência.",
      features: [
        "Análise de sentimento em tempo real",
        "Identificação de emoções (positivo, neutro, negativo)",
        "Detecção de urgência",
        "Priorização automática de atendimentos",
        "Métricas de satisfação",
        "Alertas para situações críticas",
      ],
      useCases: [
        "Priorizar leads com maior interesse",
        "Identificar clientes insatisfeitos",
        "Detectar oportunidades de upsell",
        "Melhorar qualidade de atendimento",
        "Monitorar satisfação do cliente",
      ],
    },
    report_generator: {
      title: "Geração de Relatórios",
      description:
        "Permite ao agente gerar relatórios sobre desempenho, interações e conversões. O agente pode criar análises detalhadas e insights acionáveis.",
      features: [
        "Geração automática de relatórios",
        "Métricas de desempenho",
        "Análise de conversões",
        "Relatórios personalizáveis",
        "Exportação em múltiplos formatos",
        "Agendamento de relatórios periódicos",
      ],
      useCases: [
        "Relatórios de vendas",
        "Análise de performance de agentes",
        "Métricas de conversão",
        "Relatórios de atendimento",
        "Dashboards executivos",
      ],
    },
    bant_analysis: {
      title: "Análise BANT",
      description:
        "Permite ao agente realizar análise BANT (Budget, Authority, Need, Timeline) para qualificação de leads. O agente avalia sistematicamente se um lead tem potencial de compra.",
      features: [
        "Avaliação de Budget (Orçamento)",
        "Verificação de Authority (Autoridade de decisão)",
        "Identificação de Need (Necessidade real)",
        "Análise de Timeline (Prazo para compra)",
        "Score de qualificação automático",
        "Recomendações de abordagem",
      ],
      useCases: [
        "Qualificação inicial de leads",
        "Priorização de oportunidades",
        "Identificação de leads quentes",
        "Otimização de esforço comercial",
        "Aumento de taxa de conversão",
      ],
    },
    auto_lead_status_update: {
      title: "Atualização Automática de Status",
      description:
        "Permite ao agente atualizar automaticamente o status do lead durante as conversas, baseado no contexto e nas interações. O agente identifica quando o lead deve avançar para o próximo estágio do funil de vendas, respeitando os status definidos no painel.",
      features: [
        "Atualização automática de status baseada em contexto",
        "Reconhecimento de sinais de interesse e progresso",
        "Identificação de objeções e bloqueios",
        "Transição automática entre estágios do funil",
        "Respeito aos status definidos no painel",
        "Histórico completo de mudanças de status",
        "Sincronização com o contexto da conversa",
      ],
      useCases: [
        "Atualizar status quando lead demonstra interesse",
        "Mover lead para 'Em negociação' após envio de proposta",
        "Marcar como 'Aguardando resposta' após follow-up",
        "Atualizar para 'Fechado' após confirmação de venda",
        "Identificar leads frios e atualizar status apropriado",
        "Sincronizar status com progresso real da conversa",
        "Manter funil de vendas sempre atualizado",
      ],
    },
    product_selection: {
      title: "Seleção de produtos",
      description:
        "Permite ao agente usar o catálogo de produtos da organização na conversa e acionar a ferramenta list_products para obter a lista atualizada quando precisar detalhar ofertas ou comparar opções.",
      features: [
        "Catálogo da organização enviado no contexto do webhook",
        "Consulta sob demanda via ferramenta list_products no n8n",
        "Nome, categoria, preço, descrição e diferenciais por produto",
        "Apenas produtos ativos",
      ],
      useCases: [
        "Responder dúvidas sobre produtos e planos",
        "Sugerir o item mais adequado ao perfil do lead",
        "Atualizar a lista após mudanças no cadastro sem redeploy",
      ],
    },
    media_sender: {
      title: "Envio de Mídia",
      description:
        "Permite ao agente enviar imagens e vídeos durante as conversas em ocasiões específicas. Configure quais mídias devem ser enviadas e em quais situações a IA deve utilizá-las.",
      features: [
        "Upload de imagens e vídeos",
        "Configuração de ocasiões de uso",
        "Descrição de quando cada mídia deve ser enviada",
        "Múltiplas mídias por agente",
        "Armazenamento seguro de arquivos",
        "Integração com WhatsApp e outros canais",
      ],
      useCases: [
        "Enviar catálogo de produtos quando solicitado",
        "Compartilhar imagens de demonstração",
        "Enviar vídeos explicativos de produtos",
        "Compartilhar materiais promocionais",
        "Enviar documentos visuais quando relevante",
        "Compartilhar cases de sucesso em formato visual",
      ],
      requirements: [
        "Arquivos de imagem (JPG, PNG, GIF)",
        "Arquivos de vídeo (MP4, MOV)",
        "Descrição clara de quando usar cada mídia",
      ],
    },
    instagram_integration: {
      title: "Integração com Instagram",
      description:
        "Permite ao agente interagir via Instagram Direct (DMs) de forma integrada ao CRM. O agente pode enviar e receber mensagens, gerenciar conversas e manter histórico, usando o mesmo fluxo do n8n com canal Instagram.",
      features: [
        "Envio e recebimento de mensagens via Direct",
        "Gestão de conversas no CRM",
        "Histórico de interações",
        "Envio de mídias (imagens, vídeos)",
        "Integração com conta Instagram Professional",
        "Mesmo webhook n8n com campo channel: instagram",
      ],
      useCases: [
        "Atendimento ao cliente via Instagram DM",
        "Envio de propostas e materiais por Direct",
        "Follow-up por mensagem no Instagram",
        "Captação de leads que iniciam contato pelo Instagram",
        "Comunicação omnicanal (WhatsApp + Instagram)",
      ],
      requirements: [
        "Conta Instagram Professional (Business ou Creator)",
        "App Meta configurado com permissões instagram_manage_messages",
        "Webhook configurado no Meta apontando para Edge Function",
      ],
    },
  };

  static getDetailedInfo(identifier: string): ComponentDetailedInfo | null {
    return this.detailedInfoMap[identifier] || null;
  }
}

