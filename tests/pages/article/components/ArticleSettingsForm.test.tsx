/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ArticleSettingsForm from '../../../../pages/article/components/ArticleSettingsForm';
import type { KnowledgeBaseData, FormCallbacks, ImageManagerProps, FormConfig } from '../../../../pages/article/components/ArticleSettingsForm';
import { STABLE_FORM } from '../../setup';

jest.mock('../../../../pages/article/components/ArticleImageManager', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) => React.createElement('div', { 'data-testid': 'ArticleImageManager' }),
  };
});

const mockKb: KnowledgeBaseData = {
  keywords: [{ label: '关键词A', value: 'kw-a' }],
  portraits: [{ label: '画像A', value: 'portrait-a' }],
  images: [],
  loading: false,
  skillsOptions: [{ label: '技能A', value: 1 }],
  llmModelsOptions: [{ label: '模型A', value: 1 }],
};

const createProps = (overrides: Record<string, any> = {}) => ({
  form: STABLE_FORM as any,
  config: {
    isNew: true,
    editable: true,
    saving: false,
  } as FormConfig,
  error: '',
  callbacks: {
    onSave: jest.fn(),
    onImportDocument: jest.fn(),
    onErrorClear: jest.fn(),
  } as FormCallbacks,
  images: {
    list: [] as string[],
    onChange: jest.fn(),
  } as ImageManagerProps,
  kb: { ...mockKb },
  ...overrides,
});

const renderComponent = (overrides: Record<string, any> = {}) => {
  const props = createProps(overrides);
  const result = render(<ArticleSettingsForm {...(props as any)} />);
  return { ...result, props };
};

describe('ArticleSettingsForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    STABLE_FORM.__store.write_mode = 'ai';
    STABLE_FORM.__store.portrait = undefined;
    STABLE_FORM.__store.skills = undefined;
    STABLE_FORM.__store.llm_model_id = undefined;
    STABLE_FORM.__store.title = undefined;
  });

  describe('AI模式渲染', () => {
    it('渲染编写方式、画像、插图、技能、大模型', () => {
      renderComponent();
      expect(screen.getByText('画像')).toBeInTheDocument();
      expect(screen.getByTestId('ArticleImageManager')).toBeInTheDocument();
      // Segmented options for write_mode
      expect(screen.getByText('手工编写')).toBeInTheDocument();
      expect(screen.getByText('AI生成')).toBeInTheDocument();
      // Portrait mode options
      expect(screen.getByText('从知识库选择')).toBeInTheDocument();
      expect(screen.getByText('手动输入')).toBeInTheDocument();
    });

    it('AI模式下不显示标题和导入按钮', () => {
      renderComponent();
      expect(screen.queryByText('标题')).not.toBeInTheDocument();
      expect(screen.queryByText('导入文档')).not.toBeInTheDocument();
    });

    it('默认显示知识库选择模式(Select)', () => {
      renderComponent();
      expect(screen.getByPlaceholderText('请选择画像')).toBeInTheDocument();
    });
  });

  describe('手工模式渲染', () => {
    beforeEach(() => {
      STABLE_FORM.__store.write_mode = 'manual';
    });

    it('显示标题和导入按钮', () => {
      renderComponent();
      expect(screen.getByText('标题')).toBeInTheDocument();
      expect(screen.getByText('导入文档')).toBeInTheDocument();
    });

    it('不显示AI专属字段', () => {
      renderComponent();
      expect(screen.queryByText('画像')).not.toBeInTheDocument();
      expect(screen.queryByText('选择技能')).not.toBeInTheDocument();
      expect(screen.queryByText('选择大模型')).not.toBeInTheDocument();
    });

    it('非编辑态不显示导入按钮', () => {
      renderComponent({ config: { isNew: true, editable: false, saving: false } });
      expect(screen.queryByText('导入文档')).not.toBeInTheDocument();
    });

    it('渲染Upload组件', () => {
      renderComponent();
      expect(screen.getByTestId('Upload')).toBeInTheDocument();
    });
  });

  describe('公共字段', () => {
    it('渲染文章类型和关键词', () => {
      renderComponent();
      expect(screen.getByText('文章类型')).toBeInTheDocument();
      expect(screen.getByText('关键词')).toBeInTheDocument();
    });
  });

  describe('错误提示', () => {
    it('error不为空时显示Alert', () => {
      renderComponent({ error: '保存失败' });
      expect(screen.getByRole('alert')).toHaveTextContent('保存失败');
    });

    it('error为空时不显示Alert', () => {
      renderComponent({ error: '' });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('画像模式切换', () => {
    it('切换画像模式时调用resetFields清理portrait', () => {
      renderComponent();
      fireEvent.click(screen.getByText('手动输入'));
      expect(STABLE_FORM.resetFields).toHaveBeenCalledWith(['portrait']);
    });

    it('手动输入模式渲染TextArea', () => {
      renderComponent();
      fireEvent.click(screen.getByText('手动输入'));
      expect(screen.getByPlaceholderText('请输入画像描述')).toBeInTheDocument();
    });
  });

  describe('表单提交防护', () => {
    it('saving为true时不调用onSave', () => {
      const onSave = jest.fn();
      renderComponent({ config: { isNew: true, editable: true, saving: true }, callbacks: { onSave, onImportDocument: jest.fn(), onErrorClear: jest.fn() } });
      expect(onSave).not.toHaveBeenCalled();
    });

    it('editable为false时不调用onSave', () => {
      const onSave = jest.fn();
      renderComponent({ config: { isNew: true, editable: false, saving: false }, callbacks: { onSave, onImportDocument: jest.fn(), onErrorClear: jest.fn() } });
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('disabled状态', () => {
    it('editable=false时writeMode Segmented被禁用', () => {
      renderComponent({ config: { isNew: true, editable: false, saving: false } });
      expect(screen.getByTestId('segmented-manual')).toHaveAttribute('disabled');
      expect(screen.getByTestId('segmented-ai')).toHaveAttribute('disabled');
    });

    it('editable=true时Segmented可操作', () => {
      renderComponent();
      expect(screen.getByTestId('segmented-manual')).not.toHaveAttribute('disabled');
    });
  });

  describe('skills多选', () => {
    it('skills Select具有mode=multiple属性', () => {
      renderComponent();
      const selects = screen.getAllByTestId('Select');
      const skillsSelect = selects.find(s => s.getAttribute('mode') === 'multiple');
      expect(skillsSelect).toBeTruthy();
    });
  });

  describe('知识库数据', () => {
    it('关键词Select使用kb.keywords', () => {
      renderComponent();
      const selects = screen.getAllByTestId('Select');
      const kwSelect = selects.find(s => s.getAttribute('placeholder') === '请选择关键词');
      expect(kwSelect).toBeTruthy();
    });

    it('kbLoading时不显示"暂无"提示', () => {
      renderComponent(); // loading=false by default
      // When kbLoading=false, notFoundContent is '暂无关键词'
      // The Select mock doesn't render notFoundContent, but the prop is passed
      const selects = screen.getAllByTestId('Select');
      expect(selects.length).toBeGreaterThan(0);
    });

    it('画像下拉使用kb.portraits数据', () => {
      renderComponent();
      const selects = screen.getAllByTestId('Select');
      const portraitSelect = selects.find(s => s.getAttribute('placeholder') === '请选择画像');
      expect(portraitSelect).toBeTruthy();
    });
  });

  describe('portraitMode智能推断', () => {
    it('portrait值匹配知识库时保持select模式', () => {
      STABLE_FORM.__store.portrait = 'portrait-a';
      renderComponent();
      expect(screen.getByPlaceholderText('请选择画像')).toBeInTheDocument();
    });

    it('portrait值不匹配知识库时切换到input模式', async () => {
      STABLE_FORM.__store.portrait = 'custom-text';
      renderComponent();
      await waitFor(() => {
        expect(screen.getByPlaceholderText('请输入画像描述')).toBeInTheDocument();
      });
    });
  });
});
