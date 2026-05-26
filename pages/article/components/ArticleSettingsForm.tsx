import React, { useState, useEffect } from 'react';
import {
  Form, Input, Select, Button, Alert, Segmented, Upload, App,
} from 'antd';
import { ImportOutlined } from '@ant-design/icons';
import type { ArticleFormValues, WriteMode, KbKeyword, KbPortrait, KbImage, SkillOption, LlmModelOption } from '../types';
import { ARTICLE_TYPE_OPTIONS } from '../types';
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

interface ArticleSettingsFormProps {
  form: FormInstance;
  isNew: boolean;
  editable: boolean;
  saving: boolean;
  error: string;
  onErrorClear: () => void;
  onSave: (values: ArticleFormValues) => void;
  onImportDocument: (file: File) => void;
  imageList: string[];
  imageListChange: (list: string[]) => void;
  kb: KnowledgeBaseData;
}

const ALLOWED_EXTENSIONS = /\.(md|doc|docx)$/i;
const MAX_IMPORT_SIZE = 10 * 1024 * 1024;

const ArticleSettingsForm: React.FC<ArticleSettingsFormProps> = ({
  form, isNew, editable, saving, error, onErrorClear, onSave, onImportDocument,
  imageList, imageListChange, kb,
}) => {
  const { message } = App.useApp();
  const writeMode = (Form.useWatch('write_mode', form) ?? 'ai') as WriteMode;
  const portraitValue = Form.useWatch('portrait', form);

  const [portraitMode, setPortraitMode] = useState<'input' | 'select'>('select');

  // 编辑已有文章时，根据 portrait 值智能推断 portraitMode
  useEffect(() => {
    if (portraitValue && kb.portraits.length > 0) {
      const isInKb = kb.portraits.some(p => p.value === portraitValue);
      setPortraitMode(isInKb ? 'select' : 'input');
    }
  }, [portraitValue, kb.portraits]);

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
            showSearch
            placeholder="请选择关键词"
            options={kb.keywords}
            disabled={!editable}
            loading={kb.loading}
            notFoundContent={kb.loading ? '加载中...' : '暂无关键词'}
          />
        </Form.Item>
        {writeMode === 'ai' && (<>
          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 8 }}><label>画像</label></div>
            <Segmented
              size="small"
              style={{ marginBottom: 8 }}
              disabled={!editable}
              aria-label="画像输入方式"
              options={[
                { label: '从知识库选择', value: 'select' },
                { label: '手动输入', value: 'input' },
              ]}
              value={portraitMode}
              onChange={(val) => {
                setPortraitMode(val as 'input' | 'select');
                form.resetFields(['portrait']);
              }}
            />
            <Form.Item name="portrait" noStyle>
              {portraitMode === 'select' ? (
                <Select
                  allowClear showSearch
                  placeholder="请选择画像"
                  options={kb.portraits}
                  disabled={!editable}
                  loading={kb.loading}
                  notFoundContent={kb.loading ? '加载中...' : '知识库暂无画像'}
                  optionFilterProp="label"
                />
              ) : (
                <Input.TextArea
                  placeholder="请输入画像描述"
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  disabled={!editable}
                  maxLength={2000}
                  showCount
                />
              )}
            </Form.Item>
          </div>
          <Form.Item label="插图">
            <ArticleImageManager
              imageList={imageList}
              imageListChange={imageListChange}
              editable={editable}
              kbImages={kb.images}
              kbLoading={kb.loading}
            />
          </Form.Item>
          <Form.Item name="skills" label="选择技能">
            <Select
              placeholder="请选择关联技能"
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
