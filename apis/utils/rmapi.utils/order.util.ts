import axios from 'axios';

const RMAPI_BASE = 'https://rmapi.ruan.net';

export interface RmOrderParams {
  token: string;
  title: string;
  content: string;
  resource_id: number;
}

export interface RmOrderResponse {
  success: boolean;
  message: string;
  data: any;
  status: number;
}

export interface RmOrderQueryParams {
  token: string;
  page?: number;
  order_id?: string;
}

export interface RmOrderItem {
  id?: number;
  user_id?: number;
  resource_id?: number;
  order_id: string;
  scheduled_time?: number;
  manuscript_id?: string;
  title?: string;
  status: number;
  pay_time?: string | null;
  response_message?: string | null;
  price?: number;
  resource_name?: string | null;
  url?: string | null;
  link?: string | null;
  publish_url?: string | null;
  article_url?: string | null;
  source_url?: string | null;
  [key: string]: any;
}

export interface RmOrderQueryResponse {
  success: boolean;
  message?: string;
  pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  data: RmOrderItem[];
  status: number;
}

/**
 * 提交订单到 rmapi
 */
export async function submitRmOrder(
  params: RmOrderParams
): Promise<RmOrderResponse> {
  const res = await axios.post<RmOrderResponse>(
    `${RMAPI_BASE}/api/news_order`,
    {
      token: params.token,
      title: params.title,
      content: params.content,
      resource_id: params.resource_id,
    }
  );

  return res.data;
}

export async function getRmOrders(params: RmOrderQueryParams): Promise<RmOrderQueryResponse> {
  const res = await axios.get<RmOrderQueryResponse>(`${RMAPI_BASE}/api/news_order`, {
    params: {
      page: params.page ?? 1,
      ...(params.order_id ? { order_id: params.order_id } : {}),
    },
    headers: {
      Authorization: `Bearer ${params.token}`,
      'Content-Type': 'application/json',
    },
  });

  return res.data;
}

export async function getRmOrderById(token: string, orderId: string): Promise<RmOrderQueryResponse> {
  return getRmOrders({ token, order_id: orderId });
}
