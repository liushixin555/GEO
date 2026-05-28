import { markdownToPublishHtml } from '../../apis/utils/publish-content.util';

describe('markdownToPublishHtml', () => {
  test('keeps paragraphs and markdown tables as styled publishable html', () => {
    const html = markdownToPublishHtml(
      [
        'First paragraph',
        '',
        '| Name | Qty |',
        '| --- | --- |',
        '| A | 1 |',
      ].join('\n'),
    );

    expect(html).toContain('<p style="color:#000;text-indent:2em;');
    expect(html).toContain('<table border="1" cellspacing="0" cellpadding="6" style="color:#000;border-collapse:collapse;border:1px solid #000;');
    expect(html).toContain('<th style="color:#000;border:1px solid #000;');
    expect(html).toContain('<td style="color:#000;border:1px solid #000;');
  });
});
