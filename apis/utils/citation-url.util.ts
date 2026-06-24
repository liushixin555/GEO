const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'spm',
  'from',
  'source',
]);

export interface NormalizedCitationUrl {
  normalizedUrl: string;
  domain: string | null;
}

export function normalizeCitationUrl(input: string): NormalizedCitationUrl {
  const raw = input.trim();
  if (!raw) return { normalizedUrl: '', domain: null };

  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    url.protocol = 'https:';
    url.hash = '';
    url.hostname = url.hostname.toLowerCase().replace(/^m\./, 'www.');

    for (const key of Array.from(url.searchParams.keys())) {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
        url.searchParams.delete(key);
      }
    }

    url.searchParams.sort();
    let pathname = decodeURIComponent(url.pathname || '/');
    pathname = pathname.replace(/\/+$/, '') || '/';
    const query = url.searchParams.toString();
    const normalizedUrl = `${url.hostname}${pathname}${query ? `?${query}` : ''}`;

    return { normalizedUrl, domain: url.hostname };
  } catch {
    return { normalizedUrl: raw.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, ''), domain: null };
  }
}
