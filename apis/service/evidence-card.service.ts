import {
  CreateEvidenceCardRequest,
  EvidenceCard,
  EvidenceCardListParams,
  ExtractEvidenceCardRequest,
  ExtractEvidenceCardsResult,
  UpdateEvidenceCardRequest,
} from '../entity';

export interface IEvidenceCardService {
  list(params: EvidenceCardListParams): Promise<{ list: EvidenceCard[]; total: number }>;
  getById(id: number): Promise<EvidenceCard>;
  create(request: CreateEvidenceCardRequest, actorUserId?: number): Promise<EvidenceCard>;
  update(id: number, request: UpdateEvidenceCardRequest, actorUserId?: number): Promise<EvidenceCard>;
  deleteMany(ids: number[]): Promise<number>;
  extractEvidenceCards(request: ExtractEvidenceCardRequest, actorUserId: number, actorRole: string): Promise<ExtractEvidenceCardsResult>;
}
