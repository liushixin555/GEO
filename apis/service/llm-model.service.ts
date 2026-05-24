import { LlmModel, CreateLlmModelRequest, UpdateLlmModelRequest } from '../entity';

export interface ILlmModelService {
  list(): Promise<LlmModel[]>;
  listEnabled(): Promise<Pick<LlmModel, 'id' | 'provider' | 'model_name'>[]>;
  getById(id: number): Promise<LlmModel>;
  create(request: CreateLlmModelRequest): Promise<LlmModel>;
  update(id: number, request: UpdateLlmModelRequest): Promise<LlmModel>;
  delete(id: number): Promise<void>;
}
