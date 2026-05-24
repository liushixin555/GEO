import React, { useState } from 'react';
import {
  Form, Input, Select, Button, Alert, Segmented, Upload, Tag, Radio, Space, App,
} from 'antd';
import { ImportOutlined } from '@ant-design/icons';
import type { ArticleFormValues, WriteMode, KbKeyword, KbPortrait, KbImage, SkillOption, LlmModelOption } from '../types';
import { ARTICLE_TYPE_OPTIONS } from '../types';
import ArticleImageManager from './ArticleImageManager';
import PlatformSelectModal from './PlatformSelectModal';

type FormInstance = ReturnType<typeof Form.useForm<ArticleFormValues>>[0];

interface ArticleSettingsFormProps {
  form: FormInstance;
  isNew: boolean;
  editable: boolean;
  saving: boolean;
  error: string;
  writeMode: WriteMode;
  writeModeChange: (mode: WriteMode) => void;
  imageList: string[];
  imageListChange: (list: string[]) => void;
  onErrorClear: () => void;
  onSave: (values: ArticleFormValues) => void;
  onImportDocument: (file: File) => void;
  platformSelector: {
    modalOpen: boolean;
    platformList: any[];
    platformTotal: number;
    platformPage: number;
    platformSearch: string;
    platformLoading: boolean;
    selectedPlatformKeys: string[];
    platformSortBy: string;
    platformSortOrder: 'asc' | 'desc';
    fetchList: (page?: number, search?: string, sortBy?: string, sortOrder?: 'asc' | 'desc') => void;
    openModal: () => void;
    confirmSelection: (onUpdate: (keys: string[]) => void) => void;
    closeModal: () => void;
    setSearch: (search: string) => void;
    setSelectedKeys: (keys: string[]) => void;
    setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  };
  kbKeywords: KbKeyword[];
  kbPortraits: KbPortrait[];
  kbImages: KbImage[];
  kbLoading: boolean;
  skillsOptions: SkillOption[];
  llmModelsOptions: LlmModelOption[];
}

const ArticleSettingsForm: React.FC<ArticleSettingsFormProps> = ({
  form, isNew, editable, saving, error, writeMode, writeModeChange,
  imageList, imageListChange, onErrorClear, onSave, onImportDocument,
  platformSelector, kbKeywords, kbPortraits, kbImages, kbLoading,
  skillsOptions, llmModelsOptions,
}) => {
  const [portraitMode, setPortraitMode] = useState<'input' | 'select'>('select');
  const [platformDisplayOptions, setPlatformDisplayOptions] = useState<{ label: string; value: string }[]>([]);

  return (
    <>
      <Form form={form} onFinish={onSave} layout="vertical">
        {error && <Alert type="error" message={error} className="form-alert" showIcon closable onClose={onErrorClear} />}
        <Form.Item name="write_mode" label="编写方式" rules={[{ required: true, message: '请选择编写方式' }]}>
          <Radio.Group
            onChange={(e) => writeModeChange(e.target.value)}
            disabled={!editable}
            optionType="button"
            buttonStyle="solid"
            options={[{ label: '手工编写', value: 'manual' }, { label: 'AI生成', value: 'ai' }]}
          />
        </Form.Item>
        {writeMode === 'manual' && (
        <Form.Item
          name="title"
          label={<Space size={8}><span>标题</span><Upload accept=".md,.doc,.docx" showUploadList={false} beforeUpload={(file) => { onImportDocument(file); return false; }}><Button type="link" size="small" icon={<ImportOutlined />} style={{ padding: 0, height: 'auto', fontSize: 12, verticalAlign: 'middle' }}>导入</Button></Upload></Space>}
          rules={[{ required: true, message: '标题不能为空' }]}
        >
          <Input placeholder="请输入文章标题，或点击「导入」从文档自动填充" disabled={!editable} />
        </Form.Item>
        )}
        <Form.Item name="article_type" label="文章类型" rules={[{ required: true, message: '请选择文章类型' }]}>
          <Select placeholder="请选择文章类型" disabled={!editable} options={ARTICLE_TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item name="keywords" label="关键词" rules={[{ required: true, message: '关键词不能为空' }]}>
          <Select showSearch placeholder="从知识库选择关键词" options={kbKeywords} disabled={!editable} loading={kbLoading} notFoundContent={kbLoading ? '加载中...' : '暂无知识库关键词'} />
        </Form.Item>
        {writeMode === 'ai' && (<>
        <Form.Item label="画像">
          <Segmented
            size="small"
            style={{ marginBottom: 8 }}
            disabled={!editable}
            options={[{ label: '从知识库选择', value: 'select' }, { label: '手动输入', value: 'input' }]}
            value={portraitMode}
            onChange={(val) => { setPortraitMode(val as 'input' | 'select'); form.setFieldValue('portrait', undefined); }}
          />
          {portraitMode === 'select' ? (
            <Form.Item name="portrait" noStyle>
              <Select allowClear showSearch placeholder="从AI知识库选择画像" options={kbPortraits} disabled={!editable} loading={kbLoading} notFoundContent={kbLoading ? '加载中...' : '知识库暂无画像，请先在知识库中添加'} optionFilterProp="label" />
            </Form.Item>
          ) : (
            <Form.Item name="portrait" noStyle>
              <Input.TextArea placeholder="输入画像描述" autoSize={{ minRows: 2, maxRows: 6 }} disabled={!editable} />
            </Form.Item>
          )}
        </Form.Item>
        <Form.Item label="插图">
          <ArticleImageManager
            imageList={imageList}
            imageListChange={imageListChange}
            editable={editable}
            kbImages={kbImages}
            kbLoading={kbLoading}
          />
        </Form.Item>
        <Form.Item name="skills" label="选择技能">
          <Select placeholder="选择关联技能" options={skillsOptions} disabled={!editable} allowClear />
        </Form.Item>
        <Form.Item name="llm_model_id" label="选择大模型" rules={[{ required: true, message: '请选择大模型' }]}>
          <Select placeholder="选择大模型" options={llmModelsOptions} disabled={!editable} allowClear />
        </Form.Item>
        </>)}
        <Form.Item name="platforms" label="发布平台" rules={[{ required: true, message: '发布平台不能为空' }]}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, minHeight: 32, padding: '4px 11px', border: '1px solid var(--color-hairline)', borderRadius: 2, cursor: editable ? 'pointer' : 'default' }} onClick={() => { if (editable) platformSelector.openModal(); }}>
            {(() => {
              const platforms: string[] = form.getFieldValue('platforms') || [];
              if (platforms.length === 0) {
                return <span style={{ color: 'var(--color-ink-subtle)' }}>点击选择发布平台</span>;
              }
              return platforms.map((name) => (
                <Tag key={name} closable={editable} onClose={(e) => {
                  e.stopPropagation();
                  const current: string[] = form.getFieldValue('platforms') || [];
                  const updated = current.filter((p) => p !== name);
                  form.setFieldValue('platforms', updated);
                  setPlatformDisplayOptions(updated.map((p) => ({ label: p, value: p })));
                }}>{name}</Tag>
              ));
            })()}
          </div>
        </Form.Item>
      </Form>
      <PlatformSelectModal
        open={platformSelector.modalOpen}
        platformList={platformSelector.platformList}
        platformTotal={platformSelector.platformTotal}
        platformPage={platformSelector.platformPage}
        platformSearch={platformSelector.platformSearch}
        platformLoading={platformSelector.platformLoading}
        selectedPlatformKeys={platformSelector.selectedPlatformKeys}
        platformSortBy={platformSelector.platformSortBy}
        platformSortOrder={platformSelector.platformSortOrder}
        onSearch={(val) => platformSelector.fetchList(1, val, platformSelector.platformSortBy, platformSelector.platformSortOrder)}
        onSearchChange={platformSelector.setSearch}
        onSelectChange={platformSelector.setSelectedKeys}
        onSortChange={platformSelector.setSort}
        onFetch={platformSelector.fetchList}
        onConfirm={() => platformSelector.confirmSelection((keys) => setPlatformDisplayOptions(keys.map((k) => ({ label: k, value: k }))))}
        onCancel={platformSelector.closeModal}
      />
    </>
  );
};

export default React.memo(ArticleSettingsForm);
