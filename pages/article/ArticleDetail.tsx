import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Form, Button, Typography, Spin, Tag, Popconfirm, Collapse, App } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useAppContext } from '../context/AppContext';
import { useArticleDetail } from './hooks/useArticleDetail';
import { useArticlePermissions } from './hooks/useArticlePermissions';
import { usePlatformSelector } from './hooks/usePlatformSelector';
import { useKnowledgeBase } from './hooks/useKnowledgeBase';
import { useArticleActions } from './hooks/useArticleActions';
import { useDocumentImport } from './hooks/useDocumentImport';
import { STATUS_CONFIG, type WriteMode, type ArticleFormValues } from './types';
import ArticleSettingsForm from './components/ArticleSettingsForm';
import ArticleContentEditor from './components/ArticleContentEditor';

const ArticleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { projectId: projectIdRaw } = useAppContext();
  const projectId = projectIdRaw ?? undefined;
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = id === 'new';
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [writeMode, setWriteMode] = useState<WriteMode>('ai');
  const [imageList, setImageList] = useState<string[]>([]);
  const [contentMode, setContentMode] = useState<'preview' | 'edit'>(isNew ? 'edit' : 'preview');

  const detail = useArticleDetail(id, projectId, isNew, form);
  const permissions = useArticlePermissions(detail.article);
  const platformSelector = usePlatformSelector(form);
  const kb = useKnowledgeBase(projectId, isNew, form);
  const actions = useArticleActions(detail.article, projectId, id, detail.fetchArticle);
  const docImport = useDocumentImport(form, detail.setContent);

  const isSettingsEditable = isNew || permissions.canEditSettings;
  const isContentEditable = isNew || permissions.canEditContent;
  const statusCfg = detail.article ? (STATUS_CONFIG[detail.article.status] || { label: detail.article.status, color: 'default' }) : null;

  // Auto-save every 5 minutes
  useEffect(() => {
    const timer = setInterval(() => { detail.autoSave(imageList); }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [isNew, id, projectId, imageList, detail.autoSave]);

  // Reset contentMode when transitioning from /article/new to /article/:id
  useEffect(() => {
    if (!isNew && !location.state?.openContentEdit) setContentMode('preview');
  }, [isNew, location.state]);

  // Handle navigation state for manual write mode
  useEffect(() => {
    if (location.state?.openContentEdit && !isNew) {
      setContentMode('edit');
      setTimeout(() => {
        document.getElementById('article-content-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      window.history.replaceState({}, '');
    }
  }, [location.state, isNew]);

  const handleSave = async (values: ArticleFormValues) => {
    try {
      const result = await detail.saveSettings(values, imageList, {
        submitForGeneration: writeMode === 'ai',
        manualWrite: writeMode === 'manual',
        writeMode,
      });
      if (result?.action === 'created') {
        const articleId = result.data.id;
        if (writeMode === 'ai') {
          message.success('已提交，AI生成中');
          navigate(`/article/${articleId}`, { replace: true });
        } else if (writeMode === 'manual') {
          message.success('已创建，请编写正文');
          navigate(`/article/${articleId}`, { replace: true, state: { openContentEdit: true } });
        } else {
          message.success('草稿已保存');
          navigate(`/article/${articleId}`, { replace: true });
        }
      } else {
        if (writeMode === 'ai') {
          message.success('已提交，AI生成中');
        } else if (writeMode === 'manual') {
          message.success('请编写正文');
          setContentMode('edit');
          setTimeout(() => {
            document.getElementById('article-content-section')?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        } else {
          message.success('保存成功');
        }
        detail.fetchArticle();
      }
    } catch {
      // Error already set in hook
    }
  };

  const handleDelete = async () => {
    const ok = await detail.deleteArticle();
    if (ok) navigate('/article');
  };

  if (detail.loading) {
    return <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}><Spin size="large" tip="正在加载文章..." /></div>;
  }

  if (!isNew && !detail.article) {
    return <div className="page-container"><Typography.Text>文章不存在</Typography.Text></div>;
  }

  const settingsTab = (
    <ArticleSettingsForm
      form={form}
      isNew={isNew}
      editable={isSettingsEditable}
      saving={detail.saving}
      error={detail.error}
      writeMode={writeMode}
      writeModeChange={setWriteMode}
      imageList={imageList}
      imageListChange={setImageList}
      onErrorClear={() => detail.setError('')}
      onSave={handleSave}
      onImportDocument={docImport.importDocument}
      platformSelector={platformSelector}
      kbKeywords={kb.kbKeywords}
      kbPortraits={kb.kbPortraits}
      kbImages={kb.kbImages}
      kbLoading={kb.kbLoading}
      skillsOptions={kb.skillsOptions}
      llmModelsOptions={kb.llmModelsOptions}
    />
  );

  const contentTab = (
    <ArticleContentEditor
      article={detail.article}
      content={detail.content}
      contentMode={contentMode}
      contentSaving={detail.contentSaving}
      isContentEditable={isContentEditable}
      onContentChange={detail.setContent}
      onContentModeChange={setContentMode}
      onSaveContent={detail.saveContent}
      onReview={actions.review}
      onRegenerate={actions.regenerate}
      onSubmitForReview={actions.submitForReview}
    />
  );

  const collapseItems = [{ key: 'settings', label: '文章设置', children: settingsTab }];
  if ((isNew && writeMode === 'manual') || (!isNew && detail.article)) {
    collapseItems.push({ key: 'content', label: '文章正文', children: contentTab });
  }

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/article')} />
        <Typography.Title level={2} style={{ margin: 0 }}>
          {isNew ? '新建文章' : detail.article?.title || '文章详情'}
        </Typography.Title>
        {detail.article && statusCfg && (
          <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
        )}
      </div>
      <Collapse
        defaultActiveKey={isNew ? ['settings', 'content'] : ['content']}
        items={collapseItems}
        style={{ marginBottom: 16 }}
      />
      {isSettingsEditable && (
        <div className="form-actions">
          {!isNew && detail.article?.status === 'draft' && permissions.canDelete && (
            <Popconfirm title="确认删除此文章？" description="删除后不可恢复" onConfirm={handleDelete} okText="确认" cancelText="取消">
              <Button danger loading={detail.deleting}>删除文章</Button>
            </Popconfirm>
          )}
          {(isNew || detail.article?.status === 'draft') && (
          <Button loading={detail.saving} onClick={() => {
            form.validateFields().then((values) => handleSave(values)).catch((info) => { if (info.errorFields?.length) message.error(info.errorFields[0].errors[0]); });
          }}>存草稿</Button>
          )}
          {(isNew || detail.article?.status === 'draft') && writeMode !== 'manual' && (
            <Button type="primary" loading={detail.saving} onClick={() => {
              form.validateFields().then((values) => handleSave(values)).catch((info) => { if (info.errorFields?.length) message.error(info.errorFields[0].errors[0]); });
            }}>提交给AI</Button>
          )}
          {(isNew || detail.article?.status === 'draft') && writeMode === 'manual' && (
            <Button type="primary" loading={detail.saving} onClick={() => {
              form.validateFields().then((values) => handleSave(values)).catch((info) => { if (info.errorFields?.length) message.error(info.errorFields[0].errors[0]); });
            }}>提交</Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ArticleDetail;
