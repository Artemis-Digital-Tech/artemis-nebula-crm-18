/**
 * Resolução do agente de IA (`ai_interaction_settings`) associado ao lead e à instância WhatsApp.
 *
 * @module lead-ai-interaction
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

/** Subconjunto de campos de `leads` usado na resolução do agente de IA. */
export type LeadRow = {
  id?: string;
  ai_interaction_id?: string | null;
};

/**
 * Define qual registro de `ai_interaction_settings` (agente) deve atender o lead, nesta ordem:
 * 1. `lead.ai_interaction_id` já preenchido;
 * 2. `scheduled_interactions` ativa para o lead e instância;
 * 3. Agente vinculado ao componente WhatsApp da instância (`agent_component_configurations`);
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
  if (lead?.ai_interaction_id) {
    return lead.ai_interaction_id;
  }

  if (lead?.id && instanceName) {
    const { data: activeScheduledInteraction } = await supabase
      .from('scheduled_interactions')
      .select('ai_interaction_id')
      .eq('lead_id', lead.id)
      .eq('instance_name', instanceName)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeScheduledInteraction?.ai_interaction_id) {
      return activeScheduledInteraction.ai_interaction_id;
    }
  }

  if (instanceName) {
    const { data: whatsappInstance } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('instance_name', instanceName)
      .maybeSingle();

    if (whatsappInstance?.id) {
      const { data: whatsappComponent } = await supabase
        .from('components')
        .select('id')
        .eq('identifier', 'whatsapp_integration')
        .maybeSingle();

      if (whatsappComponent?.id) {
        const { data: integrationConfig } = await supabase
          .from('agent_component_configurations')
          .select('agent_id')
          .eq('component_id', whatsappComponent.id)
          .contains('config', { whatsapp_instance_id: whatsappInstance.id })
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (integrationConfig?.agent_id) {
          return integrationConfig.agent_id;
        }
      }
    }
  }

  const { data: settings } = await supabase
    .from('settings')
    .select('default_ai_interaction_id')
    .eq('organization_id', organizationId)
    .maybeSingle();

  return settings?.default_ai_interaction_id ?? null;
}
