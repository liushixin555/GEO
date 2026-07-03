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

export function stripUrlProtocol(input: string): string {
  return input.trim().replace(/^https?:\/\//i, '');
}

export function isInternalPublishedLinkUrl(input: string | null | undefined): boolean {
  if (!input) return false;
  const normalized = normalizeCitationUrl(input);
  const domain = normalized.domain || normalized.normalizedUrl.split('/')[0] || '';
  return domain === 'ruan.net' || domain.endsWith('.ruan.net');
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
    return { normalizedUrl: stripUrlProtocol(raw.toLowerCase()).replace(/\/+$/, ''), domain: null };
  }
}
