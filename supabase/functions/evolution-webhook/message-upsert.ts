/**
 * Pipeline do evento `messages.upsert` (mensagem recebida): normaliza telefone, resolve instância e organização,
 * cria ou atualiza lead, alinha `ai_interaction_id`, carrega contexto (IA, status, produtos) e
 * dispara POST assíncrono para `settings.n8n_webhook_url` quando configurado.
 *
 * @module message-upsert
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';
import { jsonResponse } from './http.ts';
import { resolveLeadAiInteractionId, type LeadRow } from './lead-ai-interaction.ts';
import {
  fetchAiAgentBundle,
  fetchActiveProducts,
  fetchOrganization,
  fetchSortedLeadStatuses,
} from './message-context.ts';
import { normalizePhoneNumber } from './phone.ts';

type PayloadRecord = Record<string, unknown>;

type MessageData = {
  key?: { remoteJid?: string; senderPn?: string; fromMe?: boolean; id?: string };
  message?: unknown;
  messageType?: string;
  pushName?: string;
};

function getMessageData(payload: PayloadRecord): MessageData | undefined {
  const raw = payload.data;
  if (raw !== null && typeof raw === 'object') {
    return raw as MessageData;
  }
  return undefined;
}

function buildEvolutionMeta(payload: PayloadRecord) {
  return {
    apikey: (payload.apikey as string | null | undefined) ?? null,
    serverUrl: (payload.server_url as string | null | undefined) ?? null,
    instance: (payload.instance as string | null | undefined) ?? null,
  };
}

function forwardToN8n(
  webhookUrl: string,
  accessToken: string | null,
  body: Record<string, unknown>,
): void {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
    .then((response) => {
      if (!response.ok) {
        console.error('n8n webhook returned error:', response.status, response.statusText);
      } else {
        console.log('n8n webhook called successfully');
      }
    })
    .catch((error) => {
      console.error('Error calling n8n webhook:', error);
    });
}

/**
 * Executa o fluxo completo de uma mensagem recebida (não `fromMe`).
 *
 * @param params.supabase — Cliente com service role.
 * @param params.payload — Corpo JSON bruto do webhook Evolution.
 * @param params.instanceName — Nome da instância (deve existir em `whatsapp_instances`).
 * @param params.accessToken — Token repassado ao n8n no corpo e em `Authorization` quando presente.
 * @returns Respostas JSON com códigos 200 (sucesso), 400 (telefone/`remoteJid` inválidos), 404 (instância).
 * @throws Repassa erros de insert/update/select críticos de lead para o `catch` do `index`.
 */
export async function processMessageUpsert(params: {
  supabase: SupabaseClient;
  payload: PayloadRecord;
  instanceName: string | undefined;
  accessToken: string | null;
}): Promise<Response> {
  const { supabase, payload, instanceName, accessToken } = params;
  const messageData = getMessageData(payload);

  const remoteJid = messageData?.key?.remoteJid;
  const senderPn = messageData?.key?.senderPn;

  if (!remoteJid) {
    return jsonResponse({ message: 'Invalid payload: missing remoteJid' }, 400);
  }

  let phoneNumber =
    senderPn && typeof senderPn === 'string' ? senderPn.split('@')[0] : remoteJid.split('@')[0];

  phoneNumber = normalizePhoneNumber(phoneNumber);

  if (phoneNumber.length < 10) {
    console.log('Invalid phone number format:', phoneNumber);
    return jsonResponse({ message: 'Invalid phone number format' }, 400);
  }

  const contactName =
    typeof messageData?.pushName === 'string' && messageData.pushName.length > 0
      ? messageData.pushName
      : '';

  console.log(
    'Processing message from:',
    phoneNumber,
    'name:',
    contactName,
    'remoteJid:',
    remoteJid,
    'senderPn:',
    senderPn,
  );

  const { data: instance, error: instanceError } = await supabase
    .from('whatsapp_instances')
    .select('organization_id')
    .eq('instance_name', instanceName)
    .single();

  if (instanceError || !instance) {
    console.error('Instance not found:', instanceError);
    return jsonResponse({ error: 'Instance not found' }, 404);
  }

  const organizationId = instance.organization_id as string;

  const { data: existingLead, error: findError } = await supabase
    .from('leads')
    .select('*')
    .eq('contact_whatsapp', phoneNumber)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (findError) {
    console.error('Error finding lead:', findError);
    throw findError;
  }

  let leadId: string | undefined;
  let lead: Record<string, unknown> | null = existingLead as Record<string, unknown> | null;

  if (existingLead) {
    console.log('Updating existing lead:', existingLead.id);
    leadId = existingLead.id as string;

    const updateData: Record<string, unknown> = {
      status: 'conversation_started',
      remote_jid: remoteJid,
    };

    const existingName = existingLead.name as string | undefined;
    if (contactName && !existingName) {
      updateData.name = contactName;
    }

    const { error: updateError } = await supabase.from('leads').update(updateData).eq('id', leadId);

    if (updateError) {
      console.error('Error updating lead:', updateError);
      throw updateError;
    }

    console.log('Lead updated successfully');
  } else {
    console.log('Creating new lead for:', phoneNumber);

    const preResolvedAiInteractionId = await resolveLeadAiInteractionId(
      supabase,
      organizationId,
      instanceName ?? null,
      null,
    );

    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert({
        name: contactName || `Lead ${phoneNumber}`,
        contact_whatsapp: phoneNumber,
        status: 'conversation_started',
        organization_id: organizationId,
        whatsapp_verified: true,
        source: 'whatsapp',
        remote_jid: remoteJid,
        ai_interaction_id: preResolvedAiInteractionId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating lead:', insertError);
      throw insertError;
    }

    if (!newLead) {
      throw new Error('Failed to create lead: no data returned');
    }

    leadId = newLead.id as string;
    lead = newLead as Record<string, unknown>;

    console.log('Lead created successfully');
  }

  if (!lead && leadId !== undefined) {
    const { data: fetchedLead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (!fetchError && fetchedLead) {
      lead = fetchedLead as Record<string, unknown>;
    }
  }

  if (lead) {
    const resolvedAiInteractionId = await resolveLeadAiInteractionId(
      supabase,
      organizationId,
      instanceName ?? null,
      lead as LeadRow,
    );

    const currentAiId = lead.ai_interaction_id as string | null | undefined;
    if (resolvedAiInteractionId && currentAiId !== resolvedAiInteractionId) {
      const { error: leadAiUpdateError } = await supabase
        .from('leads')
        .update({ ai_interaction_id: resolvedAiInteractionId })
        .eq('id', lead.id as string);

      if (!leadAiUpdateError) {
        lead.ai_interaction_id = resolvedAiInteractionId;
      } else {
        console.error('Error updating lead ai_interaction_id:', leadAiUpdateError);
      }
    }
  }

  const messageType = messageData?.messageType ?? null;
  const messagePayload = messageData?.message as { conversation?: string | null } | undefined;
  const conversation = messagePayload?.conversation ?? null;
  const messageId = messageData?.key?.id ?? null;
  const fromMe = messageData?.key?.fromMe ?? false;

  const { data: organization, error: orgError } = await fetchOrganization(supabase, organizationId);
  if (orgError) {
    console.error('Error fetching organization:', orgError);
  }

  let aiConfig: Record<string, unknown> | null = null;
  let agentComponents: unknown[] = [];
  let agentComponentConfigurations: unknown[] = [];

  const aiInteractionId =
    lead && typeof lead.ai_interaction_id === 'string' ? lead.ai_interaction_id : null;

  if (lead && aiInteractionId) {
    const bundle = await fetchAiAgentBundle(supabase, organizationId, aiInteractionId);
    aiConfig = bundle.aiConfig;
    agentComponents = bundle.agentComponents;
    agentComponentConfigurations = bundle.agentComponentConfigurations;
  }

  const leadStatuses = await fetchSortedLeadStatuses(supabase, organizationId);
  const organizationProducts = await fetchActiveProducts(supabase, organizationId);

  const evolutionMeta = buildEvolutionMeta(payload);

  const responseData = {
    success: true,
    message: 'Lead processed',
    lead,
    organization,
    ai_config: aiConfig,
    agent_components: agentComponents,
    agent_component_configurations: agentComponentConfigurations,
    lead_statuses: leadStatuses,
    organization_products: organizationProducts,
    messageType,
    conversation,
    messageId,
    fromMe,
    access_token: accessToken,
    evolution: evolutionMeta,
  };

  if (lead) {
    const { data: settings } = await supabase
      .from('settings')
      .select('n8n_webhook_url')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (settings?.n8n_webhook_url) {
      forwardToN8n(settings.n8n_webhook_url, accessToken, {
        event: payload.event,
        instance: payload.instance,
        lead,
        organization,
        ai_config: aiConfig,
        agent_components: agentComponents,
        agent_component_configurations: agentComponentConfigurations,
        lead_statuses: leadStatuses,
        organization_products: organizationProducts,
        message: messageData?.message,
        messageType,
        conversation,
        messageId,
        contactName,
        phoneNumber,
        remoteJid,
        fromMe,
        access_token: accessToken,
        evolution: evolutionMeta,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log('No n8n webhook URL configured for organization');
    }
  }

  return jsonResponse(responseData, 200);
}
