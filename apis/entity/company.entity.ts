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
  deleted_at: Date | null;
}

export interface CreateCompanyRequest {
  short_name: string;
  full_name: string;
  address?: string;
  contact_person: string;
  contact_phone: string;
  /** 运营者用户 ID 列表（全量替换，传入空数组将清空所有运营者） */
  operator_ids: number[];
  /** 查看者用户 ID 列表（可选，全量替换） */
  viewer_ids?: number[];
}

export interface UpdateCompanyRequest {
  short_name: string;
  full_name: string;
  address?: string;
  contact_person: string;
  contact_phone: string;
  /** 运营者用户 ID 列表（全量替换，传入空数组将清空所有运营者） */
  operator_ids: number[];
  /** 查看者用户 ID 列表（可选，全量替换） */
  viewer_ids?: number[];
}

export interface CompanyDetail extends Company {
  operator_ids: number[];
  operators: { id: number; cn_name: string; username: string }[];
  viewer_ids: number[];
  viewers: { id: number; cn_name: string; username: string }[];
}
