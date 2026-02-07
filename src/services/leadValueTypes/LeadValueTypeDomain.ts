export interface LeadValueType {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  key: string;
  display_order: number;
  created_at: string | null;
}

export interface LeadValueEntry {
  id: string;
  lead_id: string;
  value_type_id: string;
  value: number;
  created_at: string | null;
}

export interface CreateLeadValueTypeDTO {
  name: string;
  description?: string | null;
  key: string;
  display_order?: number;
}

export interface UpdateLeadValueTypeDTO {
  name?: string;
  description?: string | null;
  key?: string;
  display_order?: number;
}

export interface UpsertLeadValueEntryDTO {
  value_type_id: string;
  value: number;
}
