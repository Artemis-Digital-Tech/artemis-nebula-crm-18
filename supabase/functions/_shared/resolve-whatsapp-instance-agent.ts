import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

export async function resolveAgentIdForWhatsappInstanceId(
  supabase: SupabaseClient,
  whatsappInstanceId: string,
): Promise<string | null> {
  const { data: whatsappComponent } = await supabase
    .from('components')
    .select('id')
    .eq('identifier', 'whatsapp_integration')
    .maybeSingle();

  if (!whatsappComponent?.id) {
    return null;
  }

  const { data: integrationConfig } = await supabase
    .from('agent_component_configurations')
    .select('agent_id')
    .eq('component_id', whatsappComponent.id)
    .contains('config', { whatsapp_instance_id: whatsappInstanceId })
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return integrationConfig?.agent_id ?? null;
}
