import type { ILeadValueTypeRepository } from "./ILeadValueTypeRepository";
import type {
  LeadValueType,
  CreateLeadValueTypeDTO,
  UpdateLeadValueTypeDTO,
} from "./LeadValueTypeDomain";

function slugFromName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export class LeadValueTypeService {
  constructor(private readonly repository: ILeadValueTypeRepository) {}

  async getAll(organizationId: string): Promise<LeadValueType[]> {
    return this.repository.findAllByOrganization(organizationId);
  }

  async getById(id: string): Promise<LeadValueType | null> {
    return this.repository.findById(id);
  }

  async create(organizationId: string, dto: CreateLeadValueTypeDTO): Promise<LeadValueType> {
    const key = dto.key?.trim() || slugFromName(dto.name);
    if (!key) {
      throw new Error("Nome ou chave do tipo de valor é obrigatório");
    }
    return this.repository.create(organizationId, {
      ...dto,
      key,
      display_order: dto.display_order ?? 0,
    });
  }

  async update(id: string, dto: UpdateLeadValueTypeDTO): Promise<LeadValueType> {
    const payload: UpdateLeadValueTypeDTO = { ...dto };
    if (dto.name !== undefined && !dto.key) {
      payload.key = slugFromName(dto.name);
    }
    return this.repository.update(id, payload);
  }

  async delete(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
