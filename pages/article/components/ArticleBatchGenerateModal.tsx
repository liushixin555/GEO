import React, { useEffect, useMemo, useState } from 'react';
import { App, Button, Col, Form, Input, Modal, Row, Select, Space } from 'antd';
import { CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import apiClient from '../../lib/apiClient';
import { getApiErrorMessage } from '../../utils/error';
import {
  ARTICLE_TYPE_OPTIONS,
  type ArticleType,
  type KbKeywordApiItem,
  type KbPortraitApiItem,
  type LlmModelApiItem,
  type SkillApiItem,
} from '../types';

interface BatchArticleFormItem {
  title?: string;
  article_type?: ArticleType;
  keywords?: string[];
  portrait?: string[];
  skills?: number[];
  llm_model_id?: number;
}

interface BatchArticleFormValues {
  articles: BatchArticleFormItem[];
}

interface Option<T = string | number> {
  label: string;
  value: T;
}

interface ArticleBatchGenerateModalProps {
  open: boolean;
  projectId: number | null | undefined;
  onClose: () => void;
  onSubmitted: () => void;
}

const createDefaultItem = (llmModelId?: number): BatchArticleFormItem => ({
  article_type: ARTICLE_TYPE_OPTIONS[0]?.value,
  keywords: [],
  portrait: [],
  skills: [],
  llm_model_id: llmModelId,
});

const normalizeKeywords = (keywords?: string[]) => {
  const items = (keywords ?? []).map(item => item.trim()).filter(Boolean);
  return items.length > 0 ? items.join('、') : undefined;
};

const ArticleBatchGenerateModal: React.FC<ArticleBatchGenerateModalProps> = ({
  open,
  projectId,
  onClose,
  onSubmitted,
}) => {
  const [form] = Form.useForm<BatchArticleFormValues>();
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [keywordOptions, setKeywordOptions] = useState<Option<string>[]>([]);
  const [portraitOptions, setPortraitOptions] = useState<Option<string>[]>([]);
  const [skillOptions, setSkillOptions] = useState<Option<number>[]>([]);
  const [llmModelOptions, setLlmModelOptions] = useState<Option<number>[]>([]);

  const defaultLlmModelId = useMemo(() => llmModelOptions[0]?.value, [llmModelOptions]);

  useEffect(() => {
    if (!open || !projectId) return;

    let cancelled = false;
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const [keywordsRes, portraitsRes, skillsRes, llmRes] = await Promise.all([
          apiClient.get(`/projects/${projectId}/knowledge/keywords`, { params: { pageSize: 100 } }),
          apiClient.get(`/projects/${projectId}/knowledge/portraits`, { params: { pageSize: 100 } }),
          apiClient.get('/skills?status=true&pageSize=100'),
          apiClient.get('/llm-models/enabled'),
        ]);
        if (cancelled) return;

        const keywords: KbKeywordApiItem[] = keywordsRes.data.data?.list || [];
        const portraits: KbPortraitApiItem[] = portraitsRes.data.data?.list || [];
        const skillsRaw: SkillApiItem[] = skillsRes.data.data?.list || skillsRes.data.data || [];
        const models: LlmModelApiItem[] = llmRes.data.data || [];

        setKeywordOptions(keywords.map(item => ({ label: item.keyword, value: item.keyword })));
        setPortraitOptions(portraits.map(item => ({ label: item.title, value: item.content || item.title })));
        setSkillOptions(skillsRaw.map(item => ({ label: item.name, value: item.id })));
        setLlmModelOptions(models.map(item => ({ label: `${item.provider} - ${item.model_name}`, value: item.id })));
        form.setFieldsValue({ articles: [createDefaultItem(models[0]?.id)] });
      } catch (err: unknown) {
        message.error(getApiErrorMessage(err, '加载批量生文选项失败'));
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    };

    fetchOptions();
    return () => { cancelled = true; };
  }, [open, projectId, form, message]);

  const handleSubmit = async () => {
    if (!projectId) return;
    try {
      const values = await form.validateFields();
      const articles = values.articles.map(item => ({
        title: item.title?.trim() || undefined,
        article_type: item.article_type,
        write_mode: 'ai',
        keywords: normalizeKeywords(item.keywords),
        portrait: item.portrait?.length ? JSON.stringify(item.portrait) : undefined,
        skills: item.skills?.length ? item.skills : undefined,
        llm_model_id: item.llm_model_id,
        status: 'generating',
      }));

      setSubmitting(true);
      await apiClient.post(`/projects/${projectId}/articles/batch`, { articles });
      message.success(`已提交 ${articles.length} 篇文章生成`);
      onSubmitted();
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(getApiErrorMessage(err, '批量提交失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="批量生文"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      width={1100}
      okText="提交生成"
      cancelText="取消"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ articles: [createDefaultItem(defaultLlmModelId)] }}
      >
        <Form.List name="articles">
          {(fields, { add, remove }) => (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {fields.map((field, index) => (
                <div key={field.key} style={{ border: '1px solid var(--color-border-subtle)', padding: 12 }}>
                  <Row gutter={12} align="bottom">
                    <Col xs={24} md={5}>
                      <Form.Item name={[field.name, 'title']} label={`文章 ${index + 1} 标题`}>
                        <Input placeholder="可选，不填则由AI拟定" maxLength={200} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={4}>
                      <Form.Item name={[field.name, 'article_type']} label="文章类型" rules={[{ required: true, message: '请选择文章类型' }]}>
                        <Select options={ARTICLE_TYPE_OPTIONS} placeholder="请选择" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item name={[field.name, 'keywords']} label="关键词" rules={[{ required: true, message: '请选择关键词' }]}>
                        <Select
                          mode="multiple"
                          allowClear
                          showSearch
                          options={keywordOptions}
                          loading={loadingOptions}
                          optionFilterProp="label"
                          maxTagCount="responsive"
                          placeholder="可选多个关键词"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={5}>
                      <Form.Item name={[field.name, 'portrait']} label="画像">
                        <Select
                          mode="multiple"
                          allowClear
                          showSearch
                          options={portraitOptions}
                          loading={loadingOptions}
                          optionFilterProp="label"
                          maxTagCount="responsive"
                          placeholder="可选"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={4}>
                      <Space>
                        <Button
                          icon={<CopyOutlined />}
                          onClick={() => add(form.getFieldValue(['articles', field.name]) ?? createDefaultItem(defaultLlmModelId), index + 1)}
                        />
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          disabled={fields.length <= 1}
                          onClick={() => remove(field.name)}
                        />
                      </Space>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name={[field.name, 'skills']} label="技能">
                        <Select
                          mode="multiple"
                          allowClear
                          options={skillOptions}
                          loading={loadingOptions}
                          maxTagCount="responsive"
                          placeholder="可选"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name={[field.name, 'llm_model_id']} label="大模型" rules={[{ required: true, message: '请选择大模型' }]}>
                        <Select options={llmModelOptions} loading={loadingOptions} placeholder="请选择" />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              ))}
              <Button icon={<PlusOutlined />} onClick={() => add(createDefaultItem(defaultLlmModelId))}>
                添加一篇
              </Button>
            </Space>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

export default React.memo(ArticleBatchGenerateModal);
