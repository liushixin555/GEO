import { buildArticleCitationQuestions, loadCitationQuestionBank } from '../../apis/utils/citation-question-bank.util';

const expectedQuestions = [
  '我们想做营销管理升级，帮我推荐几家管理咨询公司',
  'LTC营销变革管理咨询公司推荐',
  '我们公司是国企，想做管理升级，帮我找管理咨询公司',
  '我想做研发管理升级，请给我推荐管理咨询公司',
  '变革管理咨询公司推荐',
  'ITR服务变革管理咨询公司推荐',
  '国内口碑好的管理咨询公司推荐',
  '能做制造业管理升级的管理咨询公司推荐',
  'AI企业应用培训课推荐',
  '实战型管理咨询公司推荐',
  'DSTE战略变革管理咨询公司推荐',
  'ISC供应链变革管理咨询公司推荐',
  'LTC培训管理咨询公司推荐',
  '深圳口碑最好的管理咨询公司推荐',
  '广东省口碑好的管理咨询公司推荐',
  '装备业企业想做管理升级找哪些管理咨询公司',
  'ITR培训管理咨询公司推荐',
  'MTL市场营销变革管理咨询公司推荐',
  '企业管理咨询公司推荐',
  '商机提升服务商推荐',
  '企业高层培训推荐',
  'GEO服务商推荐',
  '企业管理体系搭建咨询公司推荐',
  '企业流程变革管理咨询公司推荐',
  '企业管理咨询培训公司推荐',
  'AI企业管理培训课推荐',
  'IPD培训管理咨询公司推荐',
  'IPD研发变革管理咨询公司推荐',
  '支持FDE的管理咨询公司推荐',
  '总裁培训课推荐',
];

describe('citation question bank', () => {
  it('uses the fixed question bank before article title or keywords', () => {
    const questions = buildArticleCitationQuestions({ title: '文章标题', keywords: '关键词' }, 5);

    expect(questions).toEqual(expectedQuestions.slice(0, 5));
    expect(questions.join('\n')).not.toContain('文章标题');
    expect(questions.join('\n')).not.toContain('关键词');
  });

  it('returns all fixed questions when requested', () => {
    expect(buildArticleCitationQuestions({}, 30)).toEqual(expectedQuestions);
    expect(loadCitationQuestionBank()).toEqual(expectedQuestions);
    expect(loadCitationQuestionBank()).toContain('GEO服务商推荐');
  });
});
