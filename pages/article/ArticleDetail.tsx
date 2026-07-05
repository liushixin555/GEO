import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Form, Button, Typography, Spin, Tag, Popconfirm, Collapse, App, Alert, List, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useAppContext } from '../context/AppContext';
import apiClient from '../lib/apiClient';
import { useArticleDetail } from './hooks/useArticleDetail';
import { useArticlePermissions } from './hooks/useArticlePermissions';
import { useKnowledgeBase } from './hooks/useKnowledgeBase';
import { useArticleActions } from './hooks/useArticleActions';
import { useDocumentImport } from './hooks/useDocumentImport';
import { EVIDENCE_TYPE_OPTIONS, SOURCE_TYPE_OPTIONS, STATUS_CONFIG, type ArticleEvidenceCard, type WriteMode, type ArticleFormValues } from './types';
import ArticleSettingsForm from './components/ArticleSettingsForm';
import ArticleContentEditor from './components/ArticleContentEditor';
import ArticleReviewActions from './components/ArticleReviewActions';

const ArticleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { projectId: projectIdRaw } = useAppContext();
  const projectId = projectIdRaw ?? undefined;
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = id === 'new';
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const writeMode = (Form.useWatch('write_mode', form) ?? 'ai') as WriteMode;
  const [imageList, setImageList] = useState<string[]>([]);
  const [contentMode, setContentMode] = useState<'preview' | 'edit'>(isNew ? 'edit' : 'preview');
  const [actualEvidence, setActualEvidence] = useState<ArticleEvidenceCard[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');
  const [generationDebug, setGenerationDebug] = useState<any | null>(null);

  const detail = useArticleDetail(id, projectId, isNew, form);
  const permissions = useArticlePermissions(detail.article);
  const kb = useKnowledgeBase(projectId, isNew, form);
  const actions = useArticleActions(detail.article, projectId, id, detail.fetchArticle);
  const docImport = useDocumentImport(form, detail.setContent);

  const isSettingsEditable = isNew || permissions.canEditSettings;
  const isContentEditable = isNew || permissions.canEditContent;
  const statusCfg = detail.article ? (STATUS_CONFIG[detail.article.status] || { label: detail.article.status, color: 'default' }) : null;
  const originalContentRef = useRef('');
  const evidenceTypeLabel = Object.fromEntries(EVIDENCE_TYPE_OPTIONS.map(item => [item.value, item.label]));
  const sourceTypeLabel = Object.fromEntries(SOURCE_TYPE_OPTIONS.map(item => [item.value, item.label]));

  useEffect(() => {
    if (!detail.article) return;
    if (detail.article.images?.length) {
      setImageList(detail.article.images);
    }
  }, [detail.article]);

  useEffect(() => {
    if (detail.article?.content) originalContentRef.current = detail.article.content;
  }, [detail.article?.content]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const contentChanged = detail.content !== (originalContentRef.current || '');
      const formChanged = form.isFieldsTouched();
      if (contentChanged || formChanged) e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [detail.content, form]);

  useEffect(() => {
    const timer = setInterval(async () => {
      const result = await detail.autoSave(imageList);
      if (result?.navigateTo) {
        navigate(result.navigateTo, { replace: true });
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [isNew, id, projectId, imageList, detail.autoSave, navigate]);

  useEffect(() => {
    if (!isNew && !location.state?.openContentEdit) setContentMode('preview');
  }, [isNew, location.state]);

  useEffect(() => {
    if (isNew || !id || !projectId || !detail.article) return;
    if (detail.article.evidenceCards?.length) {
      setActualEvidence(detail.article.evidenceCards);
      setEvidenceError('');
      return;
    }
    setEvidenceLoading(true);
    setEvidenceError('');
    apiClient.get(`/projects/${projectId}/articles/${id}/evidence-cards`)
      .then((res) => {
        const payload = res.data?.data;
        const list = Array.isArray(payload?.list) ? payload.list : Array.isArray(payload) ? payload : [];
        setActualEvidence(list);
      })
      .catch((error) => {
        setActualEvidence([]);
        const status = error?.response?.status;
        setEvidenceError(status === 404
          ? '文章证据查询接口暂不可用，请重新构建并启动后端。'
          : '文章证据读取失败，请确认登录状态、项目权限和后端服务状态。');
      })
      .finally(() => setEvidenceLoading(false));
  }, [detail.article, id, isNew, projectId]);

  useEffect(() => {
    if (isNew || !id || !projectId || !detail.article) return;
    apiClient.get(`/projects/${projectId}/articles/${id}/generation-debug`)
      .then((res) => setGenerationDebug(res.data?.data ?? null))
      .catch(() => setGenerationDebug(null));
  }, [detail.article, id, isNew, projectId]);

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

  const submitForm = (onValid: (values: ArticleFormValues) => void) => {
    form.validateFields()
      .then(onValid)
      .catch((info) => { if (info.errorFields?.length) message.error(info.errorFields[0].errors[0]); });
  };

  if (detail.loading) {
    return <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}><Spin size="large" description="正在加载文章..." /></div>;
  }

  if (!isNew && !detail.article) {
    return <div className="page-container"><Typography.Text>文章不存在</Typography.Text></div>;
  }

  const settingsTab = (
    <ArticleSettingsForm
      form={form}
      config={{
        isNew,
        editable: isSettingsEditable,
        saving: detail.saving,
      }}
      error={detail.error}
      callbacks={{
        onSave: handleSave,
        onImportDocument: docImport.importDocument,
        onErrorClear: () => detail.setError(''),
      }}
      images={{
        list: imageList,
        onChange: setImageList,
      }}
      kb={{
        keywords: kb.kbKeywords,
        portraits: kb.kbPortraits,
        images: kb.kbImages,
        loading: kb.kbLoading,
        skillsOptions: kb.skillsOptions,
        llmModelsOptions: kb.llmModelsOptions,
      }}
    />
  );

  const contentTab = (
    <>
      <ArticleReviewActions
        visible={permissions.canReview}
        onReview={actions.review}
      />
      <ArticleContentEditor
        article={detail.article}
        content={detail.content}
        contentMode={contentMode}
        contentSaving={detail.contentSaving}
        isContentEditable={isContentEditable}
        onContentChange={detail.setContent}
        onContentModeChange={setContentMode}
        onSaveContent={detail.saveContent}
        onRegenerate={actions.regenerate}
        onSubmitForReview={actions.submitForReview}
      />
    </>
  );

  const evidenceTab = (
    <>
      <Alert
        type={evidenceError ? 'warning' : actualEvidence.length > 0 ? 'success' : 'info'}
        showIcon
        style={{ marginBottom: 12 }}
        message={evidenceError || (actualEvidence.length > 0
          ? `本文生成时实际注入了 ${actualEvidence.length} 条证据，可用于回看当时进入 prompt 的证据快照。`
          : '暂无实际注入证据。请先创建并审核 verified 证据卡片，再重新生成文章，后端会实时检索并写入 ArticleEvidenceCard。')}
      />
      {generationDebug?.evidenceStats && (
        <Space size={8} wrap style={{ marginBottom: 12 }}>
          <Tag>retrievedCount: {generationDebug.evidenceStats.retrievedCount ?? 0}</Tag>
          <Tag color="green">injectedCount: {generationDebug.evidenceStats.injectedCount ?? 0}</Tag>
          <Tag color="blue">promptLength: {generationDebug.evidenceStats.evidencePromptLength ?? 0}</Tag>
          {Array.isArray(generationDebug.evidenceWarnings) && generationDebug.evidenceWarnings.map((warning: string) => (
            <Tag color="orange" key={warning}>{warning}</Tag>
          ))}
        </Space>
      )}
      {generationDebug?.evidencePromptPreview && (
        <Collapse
          size="small"
          style={{ marginBottom: 12 }}
          items={[{
            key: 'evidencePromptPreview',
            label: 'Evidence Prompt Preview',
            children: (
              <Typography.Paragraph
                ellipsis={{ rows: 12, expandable: true, symbol: '展开' }}
                style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}
              >
                {generationDebug.evidencePromptPreview}
              </Typography.Paragraph>
            ),
          }]}
        />
      )}
      <Spin spinning={evidenceLoading}>
        <List
          size="small"
          dataSource={actualEvidence}
          locale={{ emptyText: evidenceError ? '证据读取失败' : '暂无实际注入证据' }}
          renderItem={(item) => {
            const card = item.evidenceCard;
            const snapshot = item.evidenceSnapshot;
            const title = snapshot?.title || card?.title || `证据卡片 #${item.evidenceCardId ?? '-'}`;
            const content = snapshot?.content || card?.content || '需要后端返回 evidenceSnapshot 或关联详情';
            return (
              <List.Item>
                <List.Item.Meta
                  title={title}
                  description={(
                    <>
                      {item.usageType && <Tag color={item.usageType === 'injected' ? 'green' : 'default'}>{item.usageType}</Tag>}
                      {(snapshot?.evidenceType || card?.evidenceType) && <Tag color="blue">{evidenceTypeLabel[(snapshot?.evidenceType || card?.evidenceType) as keyof typeof evidenceTypeLabel] ?? snapshot?.evidenceType ?? card?.evidenceType}</Tag>}
                      {(snapshot?.sourceType || card?.sourceType) && <Tag>{sourceTypeLabel[(snapshot?.sourceType || card?.sourceType) as keyof typeof sourceTypeLabel] ?? snapshot?.sourceType ?? card?.sourceType}</Tag>}
                      {snapshot?.sourceQuality && <Tag color="cyan">{snapshot.sourceQuality}</Tag>}
                      <Typography.Text type="secondary">{content}</Typography.Text>
                    </>
                  )}
                />
              </List.Item>
            );
          }}
        />
      </Spin>
    </>
  );

  const collapseItems = [{ key: 'settings', label: '文章设置', children: settingsTab }];
  if ((isNew && writeMode === 'manual') || (!isNew && detail.article)) {
    collapseItems.push({ key: 'content', label: '文章正文', children: contentTab });
  }
  if (!isNew && detail.article) {
    collapseItems.push({ key: 'evidence', label: '实际注入证据', children: evidenceTab });
  }

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/article')} />
        <Typography.Title level={4} style={{ margin: 0, flex: 1, minWidth: 0, fontWeight: 400, fontSize: 24, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
          {(isNew || detail.article?.status === 'draft') && writeMode !== 'manual' && (
            <Button type="primary" loading={detail.saving} onClick={() => submitForm(handleSave)}>提交给AI</Button>
          )}
          {(isNew || detail.article?.status === 'draft') && writeMode === 'manual' && (
            <Button type="primary" loading={detail.saving} onClick={() => submitForm(handleSave)}>提交</Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ArticleDetail;
