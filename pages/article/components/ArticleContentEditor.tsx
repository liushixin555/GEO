import React, { useState, useEffect } from 'react';
import { Segmented, Button, Popconfirm, Grid, Alert } from 'antd';
import { EyeOutlined, EditOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import MarkdownEditor from '../../components/MarkdownEditor';
import MarkdownViewer from '../../components/MarkdownViewer';
import type { ArticleData } from '../types';
import { STATUS_CONFIG } from '../types';

interface ArticleContentEditorProps {
  article: ArticleData | null;
  content: string;
  contentMode: 'preview' | 'edit';
  contentSaving: boolean;
  isContentEditable: boolean;
  onContentChange: (content: string) => void;
  onContentModeChange: (mode: 'preview' | 'edit') => void;
  onSaveContent: () => void;
  onReview: (approved: boolean) => void;
  onRegenerate: () => void;
  onSubmitForReview: () => void;
}

const ArticleContentEditor: React.FC<ArticleContentEditorProps> = ({
  article, content, contentMode, contentSaving, isContentEditable,
  onContentChange, onContentModeChange, onSaveContent,
  onReview, onRegenerate, onSubmitForReview,
}) => {
  const screens = Grid.useBreakpoint();
  const editorHeight = screens.md ? 600 : 320;
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    if (contentSaving) {
      setSaveStatus('saving');
    } else if (saveStatus === 'saving') {
      setSaveStatus('saved');
      const timer = setTimeout(() => setSaveStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [contentSaving]);

  return (
  <div id="article-content-section" data-color-mode="light">
    {article && (
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--color-ink-subtle)', fontSize: 12 }}>版本 {article.version ?? 1}</span>
        {saveStatus === 'saving' && <span style={{ color: 'var(--color-primary)', fontSize: 12, marginLeft: 8 }}><SaveOutlined spin /> 保存中...</span>}
        {saveStatus === 'saved' && <span style={{ color: 'var(--color-success)', fontSize: 12, marginLeft: 8 }}><CheckCircleOutlined /> 已保存</span>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isContentEditable && (
            <Segmented
              size="small"
              value={contentMode}
              onChange={(val) => onContentModeChange(val as 'preview' | 'edit')}
              options={[
                { icon: <EyeOutlined />, value: 'preview', label: '浏览' },
                { icon: <EditOutlined />, value: 'edit', label: '编辑' },
              ]}
            />
          )}
          {isContentEditable && contentMode === 'edit' && (
            <Button size="small" onClick={onSaveContent} loading={contentSaving}>保存正文</Button>
          )}
          {article.status === 'manual_writing' && (
            <Popconfirm title="确认提交审核？" description="提交后将进入审核流程" onConfirm={onSubmitForReview} okText="确认" cancelText="取消">
              <Button size="small" type="primary">提交审核</Button>
            </Popconfirm>
          )}
          {['generate_failed', 'publish_failed'].includes(article.status) && isContentEditable && (
            <Popconfirm title="确认重新提交AI生成？" onConfirm={onRegenerate} okText="确认" cancelText="取消">
              <Button size="small" type="primary" icon={<ReloadOutlined />}>重新生成</Button>
            </Popconfirm>
          )}
        </div>
      </div>
    )}
    {article?.status === 'pending_review' && (
      <Alert
        type="warning"
        message="该文章待审核"
        showIcon
        style={{ marginBottom: 12 }}
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Popconfirm title="确认审核通过？" description="通过后将自动进入发布流程" onConfirm={() => onReview(true)} okText="确认" cancelText="取消">
              <Button type="primary" icon={<CheckCircleOutlined />}>审核通过</Button>
            </Popconfirm>
            <Popconfirm title="确认审核不通过？" description="不通过后将退回为草稿" onConfirm={() => onReview(false)} okText="确认" cancelText="取消">
              <Button danger icon={<CloseCircleOutlined />}>审核不通过</Button>
            </Popconfirm>
          </div>
        }
      />
    )}
    {contentMode === 'edit' ? (
      <MarkdownEditor
        value={content}
        onChange={onContentChange}
        height={editorHeight}
        preview="edit"
      />
    ) : (
      <div className="article-content-preview" style={{ minHeight: 300 }}>
        <MarkdownViewer
          content={content}
          emptyText={article?.write_mode === 'ai' ? 'AI 正在生成文章内容，请稍候...' : '暂无内容'}
        />
      </div>
    )}
  </div>
  );
};

export default React.memo(ArticleContentEditor);
