import React, { useEffect, useMemo, useState } from 'react';
import {
  Form, Input, Select, Button, Alert, Segmented, Upload, App, Card, List, Tag, Typography,
} from 'antd';
import { ImportOutlined } from '@ant-design/icons';
import { useAppContext } from '../../context/AppContext';
import type { ArticleFormValues, WriteMode, KbKeyword, KbPortrait, KbImage, SkillOption, LlmModelOption, EvidenceCard } from '../types';
import { ARTICLE_TYPE_OPTIONS, EVIDENCE_TYPE_OPTIONS, SOURCE_TYPE_OPTIONS } from '../types';
import { splitKeywords, useEvidenceCards } from '../../knowledge/hooks/useEvidenceCards';
import ArticleImageManager from './ArticleImageManager';

type FormInstance = ReturnType<typeof Form.useForm<ArticleFormValues>>[0];

export interface KnowledgeBaseData {
  keywords: KbKeyword[];
  portraits: KbPortrait[];
  images: KbImage[];
  loading: boolean;
  skillsOptions: SkillOption[];
  llmModelsOptions: LlmModelOption[];
}

export interface FormCallbacks {
  onSave: (values: ArticleFormValues) => void;
  onImportDocument: (file: File) => void;
  onErrorClear: () => void;
}

export interface ImageManagerProps {
  list: string[];
  onChange: (list: string[]) => void;
}

export interface FormConfig {
  isNew: boolean;
  editable: boolean;
  saving: boolean;
}

interface ArticleSettingsFormProps {
  form: FormInstance;
  config: FormConfig;
  kb: KnowledgeBaseData;
  images: ImageManagerProps;
  callbacks: FormCallbacks;
  error: string;
}

const ALLOWED_EXTENSIONS = /\.(md|doc|docx)$/i;
const MAX_IMPORT_SIZE = 10 * 1024 * 1024;
const evidenceTypeLabel = Object.fromEntries(EVIDENCE_TYPE_OPTIONS.map(item => [item.value, item.label]));
const sourceTypeLabel = Object.fromEntries(SOURCE_TYPE_OPTIONS.map(item => [item.value, item.label]));

const ArticleSettingsForm: React.FC<ArticleSettingsFormProps> = ({
  form, config, kb, images, callbacks, error,
}) => {
  const { isNew, editable, saving } = config;
  const { onSave, onImportDocument, onErrorClear } = callbacks;
  const { message } = App.useApp();
  const { companyId, projectId } = useAppContext();
  const { listEvidenceCards } = useEvidenceCards();
  const [previewEvidence, setPreviewEvidence] = useState<EvidenceCard[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const writeMode = (Form.useWatch('write_mode', form) ?? 'ai') as WriteMode;
  const title = Form.useWatch('title', form);
  const keywords = Form.useWatch('keywords', form);
  const keywordList = useMemo(() => splitKeywords(keywords), [keywords]);

  useEffect(() => {
    if (writeMode !== 'ai') {
      setPreviewEvidence([]);
      return;
    }
    const searchText = [title, ...keywordList].filter(Boolean).join(' ');
    if (!searchText.trim()) {
      setPreviewEvidence([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setPreviewLoading(true);
      listEvidenceCards({
        page: 1,
        pageSize: 5,
        search: searchText,
        companyId: companyId ?? undefined,
        projectId: projectId ?? undefined,
        status: 'verified',
      })
        .then(result => setPreviewEvidence(result.list))
        .catch(() => setPreviewEvidence([]))
        .finally(() => setPreviewLoading(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [companyId, keywordList, listEvidenceCards, projectId, title, writeMode]);

  const handleFinish = (values: ArticleFormValues) => {
    if (saving || !editable) return;
    onSave(values);
  };

  const handleFormValuesChange = (changed: Partial<ArticleFormValues>) => {
    if ('write_mode' in changed) {
      const mode = changed.write_mode as WriteMode;
      if (mode === 'manual') {
        form.setFieldsValue({ portrait: undefined, skills: undefined, llm_model_id: undefined });
      } else {
        form.setFieldsValue({ title: undefined });
      }
    }
  };

  const handleImportBeforeUpload = (file: File) => {
    if (!ALLOWED_EXTENSIONS.test(file.name)) {
      message.error('仅支持 .md、.doc、.docx 格式文件');
      return false;
    }
    if (file.size > MAX_IMPORT_SIZE) {
      message.error('文件大小不能超过 10MB');
      return false;
    }
    onImportDocument(file);
    return false;
  };

  return (
    <>
      <Form
        form={form}
        onFinish={handleFinish}
        onValuesChange={handleFormValuesChange}
        layout="vertical"
        requiredMark
        initialValues={{ write_mode: 'ai' as WriteMode }}
      >
        {error && (
          <Alert type="error" message={error} className="form-alert" showIcon closable onClose={onErrorClear} />
        )}
        <Form.Item name="write_mode" label="编写方式" rules={[{ required: true, message: '请选择编写方式' }]}>
          <Segmented
            disabled={!editable}
            aria-label="编写方式"
            options={[
              { label: '手工编写', value: 'manual' },
              { label: 'AI生成', value: 'ai' },
            ]}
          />
        </Form.Item>
        {writeMode === 'manual' && (
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '标题不能为空' }]}
            extra={
              editable ? (
                <Upload accept=".md,.doc,.docx" showUploadList={false} beforeUpload={handleImportBeforeUpload}>
                  <Button type="link" size="small" icon={<ImportOutlined />} style={{ padding: 0, height: 'auto' }}>
                    导入文档
                  </Button>
                </Upload>
              ) : null
            }
          >
            <Input placeholder="请输入文章标题" disabled={!editable} maxLength={200} showCount />
          </Form.Item>
        )}
        <Form.Item name="article_type" label="文章类型" rules={[{ required: true, message: '请选择文章类型' }]}>
          <Select placeholder="请选择文章类型" disabled={!editable} options={ARTICLE_TYPE_OPTIONS} />
        </Form.Item>
          <Form.Item name="keywords" label="关键词" rules={[{ required: true, message: '关键词不能为空' }]}>
            <Select
              mode="multiple"
            allowClear
            showSearch
            placeholder="请选择关键词"
            options={kb.keywords}
            disabled={!editable}
            loading={kb.loading}
            optionFilterProp="label"
            maxTagCount="responsive"
              notFoundContent={kb.loading ? '加载中...' : '暂无关键词'}
            />
          </Form.Item>
          {writeMode === 'ai' && (
            <Card
              size="small"
              title="预计注入证据"
              loading={previewLoading}
              style={{ marginBottom: 16 }}
            >
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message="此处仅为基于标题和关键词的轻量预览，最终以后端生成时实时检索和注入结果为准。"
              />
              <List
                size="small"
                dataSource={previewEvidence}
                locale={{ emptyText: '暂无匹配证据' }}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={(
                        <Typography.Text ellipsis>{item.title}</Typography.Text>
                      )}
                      description={(
                        <>
                          <Tag color="blue">{evidenceTypeLabel[item.evidenceType] ?? item.evidenceType}</Tag>
                          <Tag>{sourceTypeLabel[item.sourceType] ?? item.sourceType}</Tag>
                          <Typography.Text type="secondary">{item.keywords?.slice(0, 3).join('、') || '未标注关键词'}</Typography.Text>
                        </>
                      )}
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}
        {writeMode === 'ai' && (<>
          <Form.Item name="portrait" label="画像">
            <Select
              mode="multiple"
              allowClear
              showSearch
              placeholder="请选择画像"
              options={kb.portraits}
              disabled={!editable}
              loading={kb.loading}
              notFoundContent={kb.loading ? '加载中...' : '知识库暂无画像'}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item label="插图">
            <ArticleImageManager
              imageList={images.list}
              imageListChange={images.onChange}
              editable={editable}
              kbImages={kb.images}
              kbLoading={kb.loading}
            />
          </Form.Item>
          <Form.Item name="skills" label="选择技能">
            <Select
              placeholder="请选择技能"
              options={kb.skillsOptions}
              disabled={!editable}
              allowClear
              mode="multiple"
            />
          </Form.Item>
          <Form.Item name="llm_model_id" label="选择大模型" rules={[{ required: true, message: '请选择大模型' }]}>
            <Select
              placeholder="请选择大模型"
              options={kb.llmModelsOptions}
              disabled={!editable}
              allowClear
            />
          </Form.Item>
        </>)}
      </Form>
    </>
  );
};

ArticleSettingsForm.displayName = 'ArticleSettingsForm';

export default React.memo(ArticleSettingsForm);
