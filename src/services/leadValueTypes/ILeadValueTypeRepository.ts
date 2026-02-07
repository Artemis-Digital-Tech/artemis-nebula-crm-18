import type {
  LeadValueType,
  LeadValueEntry,
  CreateLeadValueTypeDTO,
  UpdateLeadValueTypeDTO,
} from "./LeadValueTypeDomain";

export interface ILeadValueTypeRepository {
  findAllByOrganization(organizationId: string): Promise<LeadValueType[]>;
  findById(id: string): Promise<LeadValueType | null>;
  create(organizationId: string, dto: CreateLeadValueTypeDTO): Promise<LeadValueType>;
  update(id: string, dto: UpdateLeadValueTypeDTO): Promise<LeadValueType>;
  delete(id: string): Promise<void>;
  getEntriesByLeadId(leadId: string): Promise<LeadValueEntry[]>;
  getEntriesByLeadIds(leadIds: string[]): Promise<LeadValueEntry[]>;
  upsertEntry(leadId: string, valueTypeId: string, value: number): Promise<LeadValueEntry>;
  deleteEntriesByLeadId(leadId: string): Promise<void>;
  replaceEntriesForLead(leadId: string, entries: Array<{ value_type_id: string; value: number }>): Promise<void>;
}
