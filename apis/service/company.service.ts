import { Company, CreateCompanyRequest, UpdateCompanyRequest, CompanyDetail } from '../entity';

export interface ICompanyService {
  list(): Promise<Company[]>;
  getById(id: number): Promise<CompanyDetail>;
  create(request: CreateCompanyRequest): Promise<Company>;
  update(id: number, request: UpdateCompanyRequest): Promise<Company>;
}
