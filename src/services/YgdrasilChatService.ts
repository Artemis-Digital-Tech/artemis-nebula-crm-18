import { supabase } from '@/integrations/supabase/client';

export interface IYgdrasilChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface IYgdrasilMediaMessage {
  url: string;
  type: "image" | "video" | "document";
  caption?: string;
}

export interface IYgdrasilChatRequest {
  event: string;
  instance: string;
  lead: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    status: string;
    contact_email: string | null;
    contact_whatsapp: string;
    source: string;
    integration_start_time: string | null;
    payment_link_url: string | null;
    payment_stripe_id: string | null;
    payment_status: string;
    created_at: string;
    updated_at: string;
    payment_amount: number | null;
    paid_at: string | null;
    whatsapp_verified: boolean;
    ai_interaction_id: string | null;
    remote_jid: string;
    organization_id: string;
  };
  organization: {
    id: string;
    name: string;
    plan: string;
    trial_ends_at: string | null;
    stripe_customer_id: string | null;
    logo_url: string | null;
    created_at: string;
    updated_at: string;
    company_name: string;
    cnpj: string;
    phone: string;
    address: string;
    website: string | null;
  };
  ai_config: {
    id: string;
    name: string;
    nickname?: string | null;
    conversation_focus: string;
    priority: string;
    rejection_action: string;
    tone: string;
    main_objective: string;
    additional_instructions: string | null;
    created_at: string;
    updated_at: string;
    closing_instructions: string | null;
    organization_id: string;
    personality_traits?: string[] | null;
    communication_style?: string;
    expertise_level?: string;
    response_length?: string;
    empathy_level?: string;
    formality_level?: string;
    humor_level?: string;
    proactivity_level?: string;
    agent_description?: string | null;
    agent_avatar_url?: string | null;
    agent_color?: string;
    should_introduce_itself?: boolean;
    memory_amount?: string;
  };
  agent_components?: string[] | Array<{
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
  }>;
  agent_component_configurations?: Array<{
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
  }>;
  component_configurations?: Record<string, {
    mediaItems?: Array<{
      id: string;
      type: "image" | "video" | "document";
      url: string;
      fileName: string;
      usageDescription: string;
    }>;
  }>;
  lead_statuses: Array<{
    id: string;
    organization_id: string;
    status_key: string;
    label: string;
    is_required: boolean;
    display_order: number;
    created_at: string;
    updated_at: string;
  }>;
  organization_products?: Array<{
    id: string;
    name: string;
    category: string | null;
    description: string | null;
    price: number | null;
    currency: string;
    features: string | null;
    target_audience: string | null;
    use_cases: string | null;
    differentiators: string | null;
    tags: string[];
  }>;
  message: {
    conversation: string;
    messageContextInfo?: Record<string, unknown>;
  };
  messageType: string;
  conversation: string;
  messageId: string;
  contactName: string;
  phoneNumber: string;
  remoteJid: string;
  fromMe: boolean;
  timestamp: string;
  msg_content: string;
}

export interface IYgdrasilChatResponse {
  success: boolean;
  message?: string;
  response?: string;
  error?: string;
  mediaMessages?: IYgdrasilMediaMessage[];
}

export interface IYgdrasilChatService {
  sendMessage(request: IYgdrasilChatRequest): Promise<IYgdrasilChatResponse>;
}

class YgdrasilChatService implements IYgdrasilChatService {
  private readonly endpointUrl: string;

  constructor() {
    const baseUrl = import.meta.env.VITE_YGDRASIL_API_URL || 'https://n8n-n8n.kltkek.easypanel.host';
    this.endpointUrl = `https://n8n-n8n.kltkek.easypanel.host/webhook/5ee4a8fe-8dcc-49a4-b6ae-b34b5a4b800c`;
  }

  async sendMessage(request: IYgdrasilChatRequest): Promise<IYgdrasilChatResponse> {
    try {
      const payload = [request];

      // Obter token de acesso do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token || '';

      console.log('Enviando mensagem para Ygdrasil:', {
        url: this.endpointUrl,
        msg_content: request.msg_content,
        conversation: request.conversation,
        message: request.message,
        payload: payload,
        hasToken: !!accessToken,
      });

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Adicionar token de acesso se disponível
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(this.endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      console.log('Resposta do Ygdrasil:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta do Ygdrasil:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `Erro HTTP: ${response.status} - ${response.statusText}` };
        }
        
        return {
          success: false,
          error: errorData.error || errorData.message || `Erro HTTP: ${response.status} - ${response.statusText}`,
        };
      }

      const responseText = await response.text();
      console.log('Resposta completa do Ygdrasil:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Erro ao fazer parse da resposta:', parseError);
        return {
          success: false,
          error: 'Resposta inválida do servidor',
        };
      }

      const extractMediaMessages = (item: unknown): IYgdrasilMediaMessage[] | undefined => {
        if (!item) return undefined;

        if (typeof item !== "object" || item === null) {
          return undefined;
        }

        const typedItem = item as {
          mediaMessages?: unknown;
          media_messages?: unknown;
          media?: unknown;
          media_to_send?: unknown;
        };

        const raw =
          typedItem.mediaMessages ||
          typedItem.media_messages ||
          typedItem.media ||
          typedItem.media_to_send;

        if (!raw || !Array.isArray(raw)) return undefined;

        const mapped = (raw as unknown[])
          .map((m) => {
            if (!m || typeof m !== "object") {
              return null;
            }

            const media = m as {
              url?: string;
              mediaUrl?: string;
              type?: string;
              mediaType?: string;
              caption?: string;
              text?: string;
            };

            const url = media.url || media.mediaUrl;
            const type = media.type || media.mediaType;
            const caption = media.caption || media.text || undefined;

            if (
              !url ||
              (type !== "image" && type !== "video" && type !== "document")
            ) {
              return null;
            }

            return { url, type, caption } as IYgdrasilMediaMessage;
          })
          .filter(
            (m: IYgdrasilMediaMessage | null): m is IYgdrasilMediaMessage =>
              m !== null
          );

        return mapped.length > 0 ? mapped : undefined;
      };

      if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];
        const mediaMessages = extractMediaMessages(firstItem);

        return {
          success: true,
          message: firstItem.message || 'Mensagem enviada com sucesso',
          response:
            firstItem.output ||
            firstItem.response ||
            firstItem.message ||
            firstItem.text ||
            '',
          mediaMessages,
        };
      }

      const mediaMessages = extractMediaMessages(data);

      return {
        success: true,
        message: data.message || 'Mensagem enviada com sucesso',
        response:
          data.output || data.response || data.message || data.text || '',
        mediaMessages,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao enviar mensagem para Ygdrasil:', error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

export const ygdrasilChatService = new YgdrasilChatService();

