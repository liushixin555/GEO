import { Company, CompanyListItem, CreateCompanyRequest, UpdateCompanyRequest, CompanyDetail } from '../entity';

export interface ICompanyService {
  list(): Promise<CompanyListItem[]>;
  getById(id: number): Promise<CompanyDetail>;
  create(request: CreateCompanyRequest, userId: number): Promise<Company>;
  update(id: number, request: UpdateCompanyRequest, userId: number): Promise<Company>;
  toggleStatus(id: number, status: boolean, userId: number): Promise<Company>;
}
