import { isInternalPublishedLinkUrl, normalizeCitationUrl } from '../../apis/utils/citation-url.util';

describe('citation URL normalization', () => {
  it('detects soft media backend URLs that are not final public article links', () => {
    expect(isInternalPublishedLinkUrl('https://i.ruan.net/manuscripts/')).toBe(true);
    expect(isInternalPublishedLinkUrl('https://www.ruan.net/order/123')).toBe(true);
    expect(isInternalPublishedLinkUrl('https://www.cnblogs.com/123456hhcm/p/21046837')).toBe(false);
  });

  it('normalizes final public article URLs for matching', () => {
    expect(normalizeCitationUrl('https://www.cnblogs.com/123456hhcm/p/21046837').normalizedUrl)
      .toBe('www.cnblogs.com/123456hhcm/p/21046837');
  });
});
