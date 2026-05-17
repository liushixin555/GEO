import axios from 'axios';

const RMAPI_BASE = 'https://rmapi.ruan.net';

export interface RmAuthParams {
  mobile: string;
  password: string;
}

export interface RmAuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
  };
  status: number;
}

/**
 * 获取 rmapi token（全局有效，仅在 401 时需要重新获取）
 */
export async function getRmToken(params: RmAuthParams): Promise<string> {
  const res = await axios.post<RmAuthResponse>(`${RMAPI_BASE}/api/auth/authenticate`, {
    mobile: params.mobile,
    password: params.password,
    identity: 'advertiser',
    captcha_token: 'advertiser',
    captcha: 'advertiser',
    api_key: '3b98c40be00c15f9ec69131076646eb7',
  });

  if (!res.data.success) {
    throw new Error(`rmapi 认证失败: ${res.data.message}`);
  }

  return res.data.data.token;
}
