import axios from 'axios';

const apiClient = axios.create({ baseURL: '/api/v1' });

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    // CORS rejection — backend returns 403
    if (error.response?.status === 403 && error.response?.data?.message === '跨域请求被拒绝') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('selected_company');
      localStorage.removeItem('selected_project');
      window.location.href = '/login';
      return new Promise(() => {});
    }
    // CORS blocked by browser or server unreachable — network error with no response
    if (!error.response && error.request) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('selected_company');
      localStorage.removeItem('selected_project');
      window.location.href = '/login';
      return new Promise(() => {});
    }
    // 401 Unauthorized — token expired or invalid
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('selected_company');
      localStorage.removeItem('selected_project');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

export function getPublishingScheduleOrders(scheduleId: number) {
  return apiClient.get(`/publishing-schedule/${scheduleId}/orders`);
}

export function syncPublishingScheduleOrders(scheduleId: number) {
  return apiClient.post(`/publishing-schedule/${scheduleId}/orders/sync`);
}
