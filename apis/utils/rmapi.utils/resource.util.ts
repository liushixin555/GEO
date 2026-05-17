import axios from 'axios';
import fs from 'fs';
import path from 'path';

const RMAPI_BASE = 'https://rmapi.ruan.net';

export interface RmResourcePagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface RmResourceItem {
  id: number;
  taxonomy: string;
  title_limit: number;
  name: string;
  price: number;
  in_level: number;
  url_type: string[];
  baidu: number;
  remark: string;
  url: string;
  case_url: string;
  include_rate: number;
  publish_rate: number;
  publish_type_name: string | null;
  price_market: number;
  price_agenta: number;
  price_agentb: number;
  price_agentc: number;
}

export interface RmResourceResponse {
  success: boolean;
  pagination: RmResourcePagination;
  data: RmResourceItem[];
  status: number;
}

export interface RmResourceParams {
  token: string;
  page?: number;
}

/**
 * 获取资源列表（单页）
 */
export async function getRmResources(
  params: RmResourceParams
): Promise<RmResourceResponse> {
  const res = await axios.get<RmResourceResponse>(
    `${RMAPI_BASE}/api/news_resource/data`,
    {
      params: {
        token: params.token,
        page: params.page ?? 1,
      },
    }
  );

  return res.data;
}

/**
 * 获取所有资源（自动分页）
 */
export async function getAllRmResources(
  token: string
): Promise<RmResourceItem[]> {
  const outPath = path.resolve(process.cwd(), `data/rmdata/resources-page1.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  let first: RmResourceResponse;
  if (!fs.existsSync(outPath)) {
    first = await getRmResources({ token, page: 1 });
    fs.writeFileSync(outPath, JSON.stringify(first, null, 2), 'utf-8');
  } else {
    const firstData = fs.readFileSync(outPath, 'utf-8');
    first = JSON.parse(firstData);
  }
  const all: RmResourceItem[] = [...first.data];

  const totalPages = first.pagination.last_page;
  for (let page = 2; page <= totalPages; page++) {
    const outPath = path.resolve(process.cwd(), `data/rmdata/resources-page${page}.json`);
    let res: RmResourceResponse;
    if (!fs.existsSync(outPath)) {
      res = await getRmResources({ token, page });
      fs.writeFileSync(outPath, JSON.stringify(res, null, 2), 'utf-8');
    } else {
      const pageData = fs.readFileSync(outPath, 'utf-8');
      res = JSON.parse(pageData);
    }
    all.push(...res.data);
  }

  return all;
}
