/**
 * Resolução do agente de IA (`ai_interaction_settings`) associado ao lead e à instância WhatsApp.
 *
 * @module lead-ai-interaction
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';
import { resolveAgentIdForWhatsappInstanceId } from '../_shared/resolve-whatsapp-instance-agent.ts';

/** Subconjunto de campos de `leads` usado na resolução do agente de IA. */
export type LeadRow = {
  id?: string;
  ai_interaction_id?: string | null;
};

async function resolveScheduledAiInteractionId(
  supabase: SupabaseClient,
  leadId: string,
  instanceName: string,
): Promise<string | null> {
  const { data: activeScheduledInteraction } = await supabase
    .from('scheduled_interactions')
    .select('ai_interaction_id')
    .eq('lead_id', leadId)
    .eq('instance_name', instanceName)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return activeScheduledInteraction?.ai_interaction_id ?? null;
}

async function resolveInstanceBoundAgentId(
  supabase: SupabaseClient,
  organizationId: string,
  instanceName: string,
): Promise<string | null> {
  const { data: whatsappInstance } = await supabase
    .from('whatsapp_instances')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('instance_name', instanceName)
    .maybeSingle();

  if (!whatsappInstance?.id) {
    return null;
  }

  return resolveAgentIdForWhatsappInstanceId(supabase, whatsappInstance.id);
}

/**
 * Define qual registro de `ai_interaction_settings` (agente) deve atender o lead, nesta ordem:
 * 1. Agente vinculado à instância Evolution (`agent_component_configurations` com `whatsapp_instance_id`);
 * 2. `scheduled_interactions` ativa para o lead e instância;
 * 3. `lead.ai_interaction_id` já preenchido;
 * 4. `settings.default_ai_interaction_id` da organização.
 *
 * @param lead — Lead existente ou `null` na criação (usa apenas `id`/`ai_interaction_id` quando presentes).
 * @returns UUID do agente ou `null` se nenhuma regra aplicar.
 */
export async function resolveLeadAiInteractionId(
  supabase: SupabaseClient,
  organizationId: string,
  instanceName: string | null,
  lead: LeadRow | null,
): Promise<string | null> {
  if (instanceName) {
    const instanceAgentId = await resolveInstanceBoundAgentId(
      supabase,
      organizationId,
      instanceName,
    );
    if (instanceAgentId) {
      return instanceAgentId;
    }
  }

  if (lead?.id && instanceName) {
    const scheduledId = await resolveScheduledAiInteractionId(
      supabase,
      lead.id,
      instanceName,
    );
    if (scheduledId) {
      return scheduledId;
    }
  }

  if (lead?.ai_interaction_id) {
    return lead.ai_interaction_id;
  }

  const { data: settings } = await supabase
    .from('settings')
    .select('default_ai_interaction_id')
    .eq('organization_id', organizationId)
    .maybeSingle();

  return settings?.default_ai_interaction_id ?? null;
}
