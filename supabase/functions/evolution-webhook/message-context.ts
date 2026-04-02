/**
 * Leituras agregadas do banco para montar o contexto enviado na resposta HTTP e no payload do n8n.
 *
 * @module message-context
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

type StatusRow = {
  status_key?: string;
  is_required?: boolean;
  display_order?: number;
};

/**
 * Carrega o registro completo da organização (`organizations.*`).
 *
 * @returns `data` — linha ou `null`; `error` — erro do PostgREST/Supabase, se houver.
 */
export async function fetchOrganization(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<{ data: Record<string, unknown> | null; error: unknown }> {
  const { data, error } = await supabase.from('organizations').select('*').eq('id', organizationId).single();
  return { data: data as Record<string, unknown> | null, error };
}

/**
 * Lista status de lead da organização ordenados para exibição/automação:
 * obrigatórios (exceto `finished`), depois customizados, por fim `finished` quando existir.
 */
export async function fetchSortedLeadStatuses(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<unknown[]> {
  const { data: statusesData, error: statusesError } = await supabase
    .from('lead_statuses')
    .select('*')
    .eq('organization_id', organizationId)
    .order('display_order', { ascending: true });

  if (statusesError || !statusesData) {
    return [];
  }

  const rows = statusesData as StatusRow[];
  const finishedStatus = rows.find((s) => s.status_key === 'finished');
  const requiredStatuses = rows.filter((s) => s.is_required && s.status_key !== 'finished');
  const customStatuses = rows.filter((s) => !s.is_required && s.status_key !== 'finished');

  const sortedRequired = [...requiredStatuses].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  );
  const sortedCustom = [...customStatuses].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  );

  if (finishedStatus) {
    return [...sortedRequired, ...sortedCustom, finishedStatus];
  }
  return [...sortedRequired, ...sortedCustom];
}

/** Produtos ativos da organização, ordenados por nome, com campos usados pelo agente/orquestração. */
export async function fetchActiveProducts(supabase: SupabaseClient, organizationId: string): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, name, category, description, price, currency, features, target_audience, use_cases, differentiators, tags',
    )
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name');

  if (error || !data) {
    return [];
  }
  return data;
}

/** Configuração do agente (`ai_interaction_settings`) mais vínculos e configs de componentes. */
export type AiAgentBundle = {
  aiConfig: Record<string, unknown> | null;
  agentComponents: unknown[];
  agentComponentConfigurations: unknown[];
};

/**
 * Busca `ai_interaction_settings` com escopo da organização e, em seguida,
 * `agent_components` e `agent_component_configurations` (com join em `components`).
 *
 * Em falha parcial, retorna listas vazias e `aiConfig: null`; erros são logados no console.
 */
export async function fetchAiAgentBundle(
  supabase: SupabaseClient,
  organizationId: string,
  aiInteractionId: string,
): Promise<AiAgentBundle> {
  const { data: aiInteraction, error: aiError } = await supabase
    .from('ai_interaction_settings')
    .select('*')
    .eq('id', aiInteractionId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (aiError || !aiInteraction) {
    if (aiError) {
      console.error('Error loading AI config:', aiError);
    }
    return { aiConfig: null, agentComponents: [], agentComponentConfigurations: [] };
  }

  const config = aiInteraction as Record<string, unknown>;
  console.log('AI config loaded with all fields:', {
    id: config.id,
    name: config.name,
    hasPersonalityTraits: !!config.personality_traits,
    communicationStyle: config.communication_style,
    expertiseLevel: config.expertise_level,
    agentColor: config.agent_color,
    agentDescription: config.agent_description,
    empathyLevel: config.empathy_level,
    formalityLevel: config.formality_level,
    humorLevel: config.humor_level,
    proactivityLevel: config.proactivity_level,
    responseLength: config.response_length,
  });
  console.log('Full AI config object:', JSON.stringify(config, null, 2));

  const { data: components, error: componentsError } = await supabase
    .from('agent_components')
    .select(`
      id,
      agent_id,
      component_id,
      created_at,
      components(*)
    `)
    .eq('agent_id', aiInteractionId);

  let agentComponents: unknown[] = [];
  if (!componentsError && components) {
    agentComponents = components;
    console.log('Agent components loaded:', components.length);
  } else if (componentsError) {
    console.error('Error loading agent components:', componentsError);
  }

  const { data: configurations, error: configsError } = await supabase
    .from('agent_component_configurations')
    .select(`
      id,
      agent_id,
      component_id,
      config,
      created_at,
      updated_at,
      components(*)
    `)
    .eq('agent_id', aiInteractionId);

  let agentComponentConfigurations: unknown[] = [];
  if (!configsError && configurations) {
    agentComponentConfigurations = configurations;
    console.log('Agent component configurations loaded:', configurations.length);
  } else if (configsError) {
    console.error('Error loading agent component configurations:', configsError);
  }

  return {
    aiConfig: config,
    agentComponents,
    agentComponentConfigurations,
  };
}
