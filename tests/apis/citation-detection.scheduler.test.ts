import { isCitationDetectionEligibleLink } from '../../apis/utils/citation-detection-schedule.util';

describe('citation detection scheduler eligibility', () => {
  const now = new Date('2026-07-03T12:00:00.000Z');

  it('waits 24 hours after the final published link is saved before auto detection', () => {
    expect(isCitationDetectionEligibleLink({
      normalizedUrl: 'www.cnblogs.com/123456hhcm/p/21046837',
      domain: 'www.cnblogs.com',
      updatedAt: new Date('2026-07-02T11:59:59.000Z'),
      createdAt: new Date('2026-07-02T11:59:59.000Z'),
    }, now)).toBe(true);

    expect(isCitationDetectionEligibleLink({
      normalizedUrl: 'www.cnblogs.com/123456hhcm/p/21046837',
      domain: 'www.cnblogs.com',
      updatedAt: new Date('2026-07-02T12:00:01.000Z'),
      createdAt: new Date('2026-07-02T12:00:01.000Z'),
    }, now)).toBe(false);
  });

  it('does not auto-detect soft media backend URLs', () => {
    expect(isCitationDetectionEligibleLink({
      normalizedUrl: 'i.ruan.net/manuscripts',
      domain: 'i.ruan.net',
      updatedAt: new Date('2026-07-01T12:00:00.000Z'),
      createdAt: new Date('2026-07-01T12:00:00.000Z'),
    }, now)).toBe(false);
  });
});
