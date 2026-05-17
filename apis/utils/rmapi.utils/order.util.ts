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
