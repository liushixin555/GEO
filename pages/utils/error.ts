export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as any).response;
    if (resp?.status >= 500) {
      console.error('[API Error]', resp.status, resp.data);
      return fallback;
    }
    return resp?.data?.message || fallback;
  }
  return fallback;
}
