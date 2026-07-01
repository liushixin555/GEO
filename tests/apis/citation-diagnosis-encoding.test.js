const fs = require('fs');
const path = require('path');

const files = [
  'apis/controller/citation-diagnosis.controller.ts',
  'apis/service/impl/citation-diagnosis.service.impl.ts',
  'apis/scheduler/citation-diagnosis.scheduler.ts',
  'apis/utils/citation-collector.util.ts',
  'apis/utils/citation-question-bank.util.ts',
  'pages/citation-diagnosis/index.tsx',
];

const mojibakePatterns = [
  '寮曠敤',
  '璇婃柇',
  '鏂囩珷',
  '鍙戝竷',
  '鎼滅储',
  '澶辫触',
  '锟',
  '�',
];

describe('citation diagnosis source encoding', () => {
  it('does not contain common mojibake fragments in user-facing text', () => {
    for (const file of files) {
      const fullPath = path.resolve(process.cwd(), file);
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of mojibakePatterns) {
        expect(content).not.toContain(pattern);
      }
    }
  });
});
