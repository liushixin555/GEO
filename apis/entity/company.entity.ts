export interface Company {
  id: number;
  short_name: string;
  full_name: string;
  address: string | null;
  contact_person: string;
  contact_phone: string;
  status: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCompanyRequest {
  short_name: string;
  full_name: string;
  address?: string;
  contact_person: string;
  contact_phone: string;
  operator_ids: number[];
  viewer_ids?: number[];
}

export interface UpdateCompanyRequest {
  short_name: string;
  full_name: string;
  address?: string;
  contact_person: string;
  contact_phone: string;
  operator_ids: number[];
  viewer_ids?: number[];
}

export interface CompanyDetail extends Company {
  operator_ids: number[];
  operators: { id: number; cn_name: string; username: string }[];
  viewer_ids: number[];
  viewers: { id: number; cn_name: string; username: string }[];
}
