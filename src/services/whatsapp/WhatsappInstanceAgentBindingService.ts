import { supabase } from "@/integrations/supabase/client";

type OrganizationComponentRow = {
  components: { identifier: string } | null;
};

export class WhatsappInstanceAgentBindingService {
  async isOrganizationWhatsappAbilityEnabled(
    organizationId: string,
  ): Promise<boolean> {
    const { data: rows, error } = await supabase
      .from("organization_components")
      .select("components(identifier)")
      .eq("organization_id", organizationId);

    if (error || !rows?.length) {
      return false;
    }

    return rows.some(
      (r: OrganizationComponentRow) =>
        r.components?.identifier === "whatsapp_integration",
    );
  }

  async getWhatsappInstanceIdsClaimedByOtherAgents(
    organizationId: string,
    exceptAgentId: string | null,
  ): Promise<Set<string>> {
    const { data: whatsappComponent } = await supabase
      .from("components")
      .select("id")
      .eq("identifier", "whatsapp_integration")
      .maybeSingle();

    if (!whatsappComponent?.id) {
      return new Set();
    }

    const { data: orgAgents } = await supabase
      .from("ai_interaction_settings")
      .select("id")
      .eq("organization_id", organizationId);

    const agentIds = orgAgents?.map((row) => row.id) ?? [];
    if (agentIds.length === 0) {
      return new Set();
    }

    const { data: configs } = await supabase
      .from("agent_component_configurations")
      .select("agent_id, config")
      .eq("component_id", whatsappComponent.id)
      .in("agent_id", agentIds);

    const result = new Set<string>();
    for (const row of configs ?? []) {
      if (exceptAgentId && row.agent_id === exceptAgentId) {
        continue;
      }
      const wid = (row.config as { whatsapp_instance_id?: string })
        ?.whatsapp_instance_id;
      if (typeof wid === "string") {
        result.add(wid);
      }
    }
    return result;
  }

  async getAgentIdsWithConnectedWhatsappInOrganization(
    organizationId: string,
  ): Promise<Set<string>> {
    const { data: whatsappComponent } = await supabase
      .from("components")
      .select("id")
      .eq("identifier", "whatsapp_integration")
      .maybeSingle();

    if (!whatsappComponent?.id) {
      return new Set();
    }

    const { data: orgAgents } = await supabase
      .from("ai_interaction_settings")
      .select("id")
      .eq("organization_id", organizationId);

    const agentIds = orgAgents?.map((row) => row.id) ?? [];
    if (agentIds.length === 0) {
      return new Set();
    }

    const { data: configs } = await supabase
      .from("agent_component_configurations")
      .select("agent_id, config")
      .eq("component_id", whatsappComponent.id)
      .in("agent_id", agentIds);

    const instanceIds = new Set<string>();
    const agentIdToInstanceId = new Map<string, string>();
    for (const row of configs ?? []) {
      const wid = (row.config as { whatsapp_instance_id?: string })
        ?.whatsapp_instance_id;
      if (typeof wid === "string") {
        instanceIds.add(wid);
        agentIdToInstanceId.set(row.agent_id, wid);
      }
    }

    if (instanceIds.size === 0) {
      return new Set();
    }

    const { data: connectedRows } = await supabase
      .from("whatsapp_instances")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("status", "connected")
      .in("id", [...instanceIds]);

    const connectedInstanceIds = new Set(
      (connectedRows ?? []).map((r) => r.id),
    );
    const result = new Set<string>();
    for (const [agentId, instId] of agentIdToInstanceId) {
      if (connectedInstanceIds.has(instId)) {
        result.add(agentId);
      }
    }
    return result;
  }

  async listWhatsappInstanceIdsWithAgentInOrganization(
    organizationId: string,
  ): Promise<Set<string>> {
    const { data: whatsappComponent } = await supabase
      .from("components")
      .select("id")
      .eq("identifier", "whatsapp_integration")
      .maybeSingle();

    if (!whatsappComponent?.id) {
      return new Set();
    }

    const { data: orgAgents } = await supabase
      .from("ai_interaction_settings")
      .select("id")
      .eq("organization_id", organizationId);

    const agentIds = orgAgents?.map((row) => row.id) ?? [];
    if (agentIds.length === 0) {
      return new Set();
    }

    const { data: configs } = await supabase
      .from("agent_component_configurations")
      .select("agent_id, config")
      .eq("component_id", whatsappComponent.id)
      .in("agent_id", agentIds);

    const result = new Set<string>();
    for (const row of configs ?? []) {
      const wid = (row.config as { whatsapp_instance_id?: string })
        ?.whatsapp_instance_id;
      if (typeof wid === "string") {
        result.add(wid);
      }
    }
    return result;
  }

  async releaseInstanceFromOtherAgents(
    organizationId: string,
    whatsappInstanceId: string,
    keepAgentId: string,
  ): Promise<void> {
    const { data: whatsappComponent, error: compError } = await supabase
      .from("components")
      .select("id")
      .eq("identifier", "whatsapp_integration")
      .maybeSingle();

    if (compError || !whatsappComponent?.id) {
      return;
    }

    const { data: orgAgents, error: agentsError } = await supabase
      .from("ai_interaction_settings")
      .select("id")
      .eq("organization_id", organizationId);

    if (agentsError || !orgAgents?.length) {
      return;
    }

    const orgAgentIds = orgAgents.map((row) => row.id);

    const { data: configs, error: cfgError } = await supabase
      .from("agent_component_configurations")
      .select("agent_id, config")
      .eq("component_id", whatsappComponent.id)
      .in("agent_id", orgAgentIds);

    if (cfgError || !configs?.length) {
      return;
    }

    for (const row of configs) {
      const cfg = row.config as { whatsapp_instance_id?: string } | null;
      if (
        cfg?.whatsapp_instance_id === whatsappInstanceId &&
        row.agent_id !== keepAgentId
      ) {
        const { error: delError } = await supabase
          .from("agent_component_configurations")
          .delete()
          .eq("agent_id", row.agent_id)
          .eq("component_id", whatsappComponent.id);

        if (delError) {
          throw new Error(delError.message);
        }
      }
    }
  }

  async bindWhatsappInstanceToAgent(
    organizationId: string,
    agentId: string,
    whatsappInstanceId: string,
  ): Promise<void> {
    const { data: agentRow, error: agentError } = await supabase
      .from("ai_interaction_settings")
      .select("id")
      .eq("id", agentId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (agentError || !agentRow) {
      throw new Error("Agente não encontrado nesta organização");
    }

    const { data: whatsappComponent, error: compError } = await supabase
      .from("components")
      .select("id")
      .eq("identifier", "whatsapp_integration")
      .maybeSingle();

    if (compError || !whatsappComponent?.id) {
      throw new Error("Componente WhatsApp não encontrado");
    }

    const claimedByOthers = await this.getWhatsappInstanceIdsClaimedByOtherAgents(
      organizationId,
      agentId,
    );
    if (claimedByOthers.has(whatsappInstanceId)) {
      throw new Error(
        "Esta instância WhatsApp já está vinculada a outro agente",
      );
    }

    const { data: existingLink } = await supabase
      .from("agent_components")
      .select("id")
      .eq("agent_id", agentId)
      .eq("component_id", whatsappComponent.id)
      .maybeSingle();

    if (!existingLink) {
      const { error: insertAcError } = await supabase
        .from("agent_components")
        .insert({
          agent_id: agentId,
          component_id: whatsappComponent.id,
        });

      if (insertAcError) {
        throw new Error(insertAcError.message);
      }
    }

    await this.releaseInstanceFromOtherAgents(
      organizationId,
      whatsappInstanceId,
      agentId,
    );

    const { error: upsertError } = await supabase
      .from("agent_component_configurations")
      .upsert(
        {
          agent_id: agentId,
          component_id: whatsappComponent.id,
          config: { whatsapp_instance_id: whatsappInstanceId },
        },
        { onConflict: "agent_id,component_id" },
      );

    if (upsertError) {
      throw new Error(upsertError.message);
    }
  }
}

export const whatsappInstanceAgentBindingService =
  new WhatsappInstanceAgentBindingService();
