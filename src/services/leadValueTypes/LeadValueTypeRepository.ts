import { supabase } from "@/integrations/supabase/client";
import type { ILeadValueTypeRepository } from "./ILeadValueTypeRepository";
import type {
  LeadValueType,
  LeadValueEntry,
  CreateLeadValueTypeDTO,
  UpdateLeadValueTypeDTO,
} from "./LeadValueTypeDomain";

export class LeadValueTypeRepository implements ILeadValueTypeRepository {
  async findAllByOrganization(organizationId: string): Promise<LeadValueType[]> {
    const { data, error } = await supabase
      .from("lead_value_types")
      .select("*")
      .eq("organization_id", organizationId)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw new Error(`Erro ao buscar tipos de valor: ${error.message}`);
    return (data || []) as LeadValueType[];
  }

  async findById(id: string): Promise<LeadValueType | null> {
    const { data, error } = await supabase
      .from("lead_value_types")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`Erro ao buscar tipo de valor: ${error.message}`);
    return data as LeadValueType | null;
  }

  async create(organizationId: string, dto: CreateLeadValueTypeDTO): Promise<LeadValueType> {
    const { data, error } = await supabase
      .from("lead_value_types")
      .insert({
        organization_id: organizationId,
        name: dto.name,
        description: dto.description ?? null,
        key: dto.key,
        display_order: dto.display_order ?? 0,
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar tipo de valor: ${error.message}`);
    return data as LeadValueType;
  }

  async update(id: string, dto: UpdateLeadValueTypeDTO): Promise<LeadValueType> {
    const { data, error } = await supabase
      .from("lead_value_types")
      .update({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.key !== undefined && { key: dto.key }),
        ...(dto.display_order !== undefined && { display_order: dto.display_order }),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar tipo de valor: ${error.message}`);
    return data as LeadValueType;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("lead_value_types").delete().eq("id", id);
    if (error) throw new Error(`Erro ao excluir tipo de valor: ${error.message}`);
  }

  async getEntriesByLeadId(leadId: string): Promise<LeadValueEntry[]> {
    const { data, error } = await supabase
      .from("lead_value_entries")
      .select("*")
      .eq("lead_id", leadId);

    if (error) throw new Error(`Erro ao buscar valores do lead: ${error.message}`);
    return (data || []) as LeadValueEntry[];
  }

  async getEntriesByLeadIds(leadIds: string[]): Promise<LeadValueEntry[]> {
    if (leadIds.length === 0) return [];
    const { data, error } = await supabase
      .from("lead_value_entries")
      .select("*")
      .in("lead_id", leadIds);

    if (error) throw new Error(`Erro ao buscar valores dos leads: ${error.message}`);
    return (data || []) as LeadValueEntry[];
  }

  async upsertEntry(leadId: string, valueTypeId: string, value: number): Promise<LeadValueEntry> {
    const { data, error } = await supabase
      .from("lead_value_entries")
      .upsert(
        { lead_id: leadId, value_type_id: valueTypeId, value },
        { onConflict: "lead_id,value_type_id" }
      )
      .select()
      .single();

    if (error) throw new Error(`Erro ao salvar valor: ${error.message}`);
    return data as LeadValueEntry;
  }

  async deleteEntriesByLeadId(leadId: string): Promise<void> {
    const { error } = await supabase.from("lead_value_entries").delete().eq("lead_id", leadId);
    if (error) throw new Error(`Erro ao remover valores do lead: ${error.message}`);
  }

  async replaceEntriesForLead(
    leadId: string,
    entries: Array<{ value_type_id: string; value: number }>
  ): Promise<void> {
    await this.deleteEntriesByLeadId(leadId);
    const toInsert = entries.filter((e) => e.value != null && Number(e.value) > 0);
    if (toInsert.length === 0) return;
    const { error } = await supabase.from("lead_value_entries").insert(
      toInsert.map((e) => ({
        lead_id: leadId,
        value_type_id: e.value_type_id,
        value: Number(e.value),
      }))
    );
    if (error) throw new Error(`Erro ao salvar valores do lead: ${error.message}`);
  }
}
