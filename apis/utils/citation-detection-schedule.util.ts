import { isInternalPublishedLinkUrl } from './citation-url.util';

export const CITATION_DETECTION_DELAY_HOURS = 24;

export interface CitationDetectionLinkTiming {
  normalizedUrl?: string | null;
  domain?: string | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
}

export function isCitationDetectionEligibleLink(
  link: CitationDetectionLinkTiming,
  now: Date = new Date(),
  delayHours = CITATION_DETECTION_DELAY_HOURS,
): boolean {
  if (!link.normalizedUrl) return false;
  if (isInternalPublishedLinkUrl(link.normalizedUrl) || isInternalPublishedLinkUrl(link.domain || '')) {
    return false;
  }

  const timestamp = link.updatedAt || link.createdAt;
  if (!timestamp) return false;
  const linkTime = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(linkTime.getTime())) return false;

  return now.getTime() - linkTime.getTime() >= delayHours * 60 * 60 * 1000;
}
