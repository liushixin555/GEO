import {
  CreateEvidenceCardRequest,
  EvidenceCard,
  EvidenceCardListParams,
  UpdateEvidenceCardRequest,
} from '../entity';

export interface IEvidenceCardService {
  list(params: EvidenceCardListParams): Promise<{ list: EvidenceCard[]; total: number }>;
  getById(id: number): Promise<EvidenceCard>;
  create(request: CreateEvidenceCardRequest): Promise<EvidenceCard>;
  update(id: number, request: UpdateEvidenceCardRequest): Promise<EvidenceCard>;
  deleteMany(ids: number[]): Promise<number>;
}
