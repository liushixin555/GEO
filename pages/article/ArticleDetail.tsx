import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Form, Input, Select, Button, Alert, Segmented, Upload, Image, Collapse, Typography, Spin, Tag, App, Popconfirm, Table, Modal, Radio } from 'antd';
import { ArrowLeftOutlined, InboxOutlined, LinkOutlined, DeleteOutlined, CheckOutlined, EyeOutlined, EditOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import MDEditor from '@uiw/react-md-editor';
import axios from 'axios';
import { useAppContext } from '../context/AppContext';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  manual_writing: { label: '手工编写中', color: 'processing' },
  generating: { label: '生成中', color: 'processing' },
  generate_failed: { label: '生成失败', color: 'error' },
  pending_review: { label: '待审核', color: 'warning' },
  publishing: { label: '发布中', color: 'processing' },
  publish_failed: { label: '发布失败', color: 'error' },
  published: { label: '已发布', color: 'success' },
};

const EDITABLE_STATUSES = ['draft', 'manual_writing', 'generate_failed', 'publish_failed'];

interface ArticleData {
  id: number;
  title: string;
  article_type: string | null;
  write_mode: string | null;
  keywords: string | null;
  portrait: string | null;
  images: string[] | null;
  platforms: string[] | null;
  skills: number[] | null;
  llm_model_id: number | null;
  content: string | null;
  version: number;
  status: string;
  created_by: number | null;
}

const ArticleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { projectId } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = id === 'new';
  const { message } = App.useApp();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Settings form state
  const [form] = Form.useForm();
  const [writeMode, setWriteMode] = useState<'manual' | 'ai'>('ai');
  const [portraitMode, setPortraitMode] = useState<'input' | 'select'>('select');
  const [imageList, setImageList] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imageMode, setImageMode] = useState<'upload' | 'url' | 'kb'>('kb');

  // Skills & LLM Model options
  const [skillsOptions, setSkillsOptions] = useState<{ label: string; value: number }[]>([]);
  const [llmModelsOptions, setLlmModelsOptions] = useState<{ label: string; value: number }[]>([]);
  const [platformOptions, setPlatformOptions] = useState<{ label: string; value: string }[]>([]);
  const [platformModalOpen, setPlatformModalOpen] = useState(false);
  const [platformList, setPlatformList] = useState<any[]>([]);
  const [platformTotal, setPlatformTotal] = useState(0);
  const [platformPage, setPlatformPage] = useState(1);
  const [platformSearch, setPlatformSearch] = useState('');
  const [platformLoading, setPlatformLoading] = useState(false);
  const [selectedPlatformKeys, setSelectedPlatformKeys] = useState<string[]>([]);
  const [platformSortBy, setPlatformSortBy] = useState<string>('');
  const [platformSortOrder, setPlatformSortOrder] = useState<'asc' | 'desc'>('asc');

  // Knowledge base options
  const [kbKeywords, setKbKeywords] = useState<{ label: string; value: string }[]>([]);
  const [kbPortraits, setKbPortraits] = useState<{ label: string; value: string }[]>([]);
  const [kbImages, setKbImages] = useState<{ id: number; title: string; image_url: string }[]>([]);
  const [kbLoading, setKbLoading] = useState(false);

  // Content state
  const [content, setContent] = useState('');
  const [contentSaving, setContentSaving] = useState(false);
  const [contentMode, setContentMode] = useState<'preview' | 'edit'>(isNew ? 'edit' : 'preview');
  const contentRef = useRef(content);
  contentRef.current = content;
  const articleRef = useRef(article);
  articleRef.current = article;

  // Auto-save content every 5 minutes
  useEffect(() => {
    const TIMER = 5 * 60 * 1000;
    const timer = setInterval(async () => {
      const currentContent = contentRef.current.trim();
      if (!currentContent) return;
      // Only auto-save in edit mode
      try {
        const token = localStorage.getItem('token');
        if (isNew) {
          // New article: auto-create draft if form has required fields
          const formValues = form.getFieldsValue();
          if (!formValues.keywords || !formValues.llm_model_id || !formValues.platforms?.length) return;
          const payload: any = {
            article_type: formValues.article_type || undefined,
            write_mode: formValues.write_mode || undefined,
            keywords: formValues.keywords,
            portrait: formValues.portrait?.trim() || undefined,
            images: imageList.length ? imageList : undefined,
            platforms: formValues.platforms,
            skills: formValues.skills || undefined,
            llm_model_id: formValues.llm_model_id,
            content: currentContent,
          };
          const res = await axios.post(`/api/projects/${projectId}/articles`, payload, {
            headers: { Authorization: `Bearer ${token}` },
          });
          message.success('自动保存成功');
          navigate(`/article/${res.data.data.id}`, { replace: true });
        } else if (articleRef.current) {
          // Existing article: only update content
          await axios.put(`/api/projects/${projectId}/articles/${id}/content`, { content: currentContent }, {
            headers: { Authorization: `Bearer ${token}` },
          });
          message.success('正文已自动保存');
        }
      } catch {
        // Silent fail for auto-save
      }
    }, TIMER);
    return () => clearInterval(timer);
  }, [isNew, id, projectId]);

  // Tab
  const fetchArticle = useCallback(async () => {
    if (isNew || !projectId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/projects/${projectId}/articles/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data.data;
      setArticle(data);
      // Defer setFieldsValue to ensure Form is mounted
      setTimeout(() => {
        form.setFieldsValue({
          title: data.title || '',
          article_type: data.article_type || undefined,
          write_mode: data.write_mode || undefined,
          keywords: data.keywords || '',
          portrait: data.portrait || '',
          platforms: data.platforms || [],
          skills: data.skills ?? undefined,
          llm_model_id: data.llm_model_id ?? undefined,
        });
        // Sync writeMode state from server data
        if (data.write_mode) setWriteMode(data.write_mode as 'manual' | 'ai');
      }, 0);
      setImageList(data.images || []);
      setContent(data.content || '');
    } catch (err: any) {
      message.error(err.response?.data?.message || '加载文章失败');
    } finally {
      setLoading(false);
    }
  }, [id, projectId, isNew]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  // Reset contentMode when transitioning from /article/new to /article/:id
  useEffect(() => {
    if (!isNew && !location.state?.openContentEdit) {
      setContentMode('preview');
    }
  }, [isNew]);

  // Handle navigation state for manual write mode
  useEffect(() => {
    if (location.state?.openContentEdit && !isNew) {
      setContentMode('edit');
      // Scroll to content section
      setTimeout(() => {
        document.getElementById('article-content-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      window.history.replaceState({}, '');
    }
  }, [location.state, isNew]);

  // Load skills and LLM model options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const token = localStorage.getItem('token');
        const [skillsRes, llmRes] = await Promise.all([
          axios.get('/api/skills?status=true&pageSize=999', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/llm-models/enabled', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setSkillsOptions((skillsRes.data.data?.list || skillsRes.data.data || []).map((s: any) => ({ label: s.name, value: s.id })));
        const models = llmRes.data.data || [];
        setLlmModelsOptions(models.map((m: any) => ({ label: `${m.provider} - ${m.model_name}`, value: m.id })));
        // Default select first LLM model for new articles
        if (isNew && models.length > 0 && !form.getFieldValue('llm_model_id')) {
          form.setFieldValue('llm_model_id', models[0].id);
        }
        if (isNew && !form.getFieldValue('write_mode')) {
          form.setFieldValue('write_mode', 'ai');
        }
      } catch {
        // Silently fail — options are optional
      }
    };
    fetchOptions();
  }, []);

  // Fetch paginated platform list for modal
  const fetchPlatformList = useCallback(async (page = 1, search = '', sortBy = '', sortOrder: 'asc' | 'desc' = 'asc') => {
    setPlatformLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params: any = { page, pageSize: 10 };
      if (search) params.search = search;
      if (sortBy) { params.sortBy = sortBy; params.sortOrder = sortOrder; }
      const res = await axios.get('/api/publishing-platforms', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      const data = res.data.data;
      // Support both paginated and non-paginated response
      if (data?.list) {
        setPlatformList(data.list);
        setPlatformTotal(data.total);
      } else if (Array.isArray(data)) {
        setPlatformList(data);
        setPlatformTotal(data.length);
      }
      setPlatformPage(page);
    } catch {
      setPlatformList([]);
      setPlatformTotal(0);
    } finally {
      setPlatformLoading(false);
    }
  }, []);

  // Open platform selection modal
  const openPlatformModal = useCallback(() => {
    const currentPlatforms: string[] = form.getFieldValue('platforms') || [];
    setSelectedPlatformKeys(currentPlatforms);
    setPlatformSearch('');
    setPlatformSortBy('');
    setPlatformSortOrder('asc');
    fetchPlatformList(1, '', '', 'asc');
    setPlatformModalOpen(true);
  }, [form, fetchPlatformList]);

  // Confirm platform selection
  const confirmPlatformSelection = useCallback(() => {
    form.setFieldValue('platforms', selectedPlatformKeys);
    setPlatformOptions(selectedPlatformKeys.map((name) => ({ label: name, value: name })));
    setPlatformModalOpen(false);
  }, [form, selectedPlatformKeys]);

  // Load knowledge base options
  useEffect(() => {
    if (!projectId) return;
    const fetchKnowledge = async () => {
      setKbLoading(true);
      try {
        const token = localStorage.getItem('token');
        const [kwRes, ptRes, imgRes] = await Promise.all([
          axios.get(`/api/projects/${projectId}/knowledge/keywords`, {
            headers: { Authorization: `Bearer ${token}` }, params: { pageSize: 999 },
          }),
          axios.get(`/api/projects/${projectId}/knowledge/portraits`, {
            headers: { Authorization: `Bearer ${token}` }, params: { pageSize: 999 },
          }),
          axios.get(`/api/projects/${projectId}/knowledge/images`, {
            headers: { Authorization: `Bearer ${token}` }, params: { pageSize: 999 },
          }),
        ]);
        setKbKeywords((kwRes.data.data?.list || []).map((k: any) => ({ label: k.keyword, value: k.keyword })));
        setKbPortraits((ptRes.data.data?.list || []).map((p: any) => ({ label: p.title, value: p.content || p.title })));
        setKbImages((imgRes.data.data?.list || []).map((i: any) => ({ id: i.id, title: i.title, image_url: i.image_url })));
      } catch {
        // Silently fail — knowledge base options are optional
      } finally {
        setKbLoading(false);
      }
    };
    fetchKnowledge();
  }, [projectId]);

  const canEditSettings = () => {
    if (!article) return false;
    if (!['draft', 'manual_writing'].includes(article.status)) return false;
    return user.role === 'sysadmin' || article.created_by === user.id;
  };

  const canEditContent = () => {
    if (!article) return false;
    if (!EDITABLE_STATUSES.includes(article.status)) return false;
    return user.role === 'sysadmin' || article.created_by === user.id;
  };

  const handleSaveSettings = async (values: any, submitForGeneration = false, manualWrite = false) => {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const payload: any = {
        title: values.title?.trim() || undefined,
        article_type: values.article_type || undefined,
        write_mode: values.write_mode || undefined,
        keywords: values.keywords?.trim() ? values.keywords.trim() : undefined,
        portrait: values.portrait?.trim() || undefined,
        images: imageList.length ? imageList : undefined,
        platforms: values.platforms?.length ? values.platforms : undefined,
        skills: values.skills || undefined,
        llm_model_id: values.llm_model_id || undefined,
      };

      if (submitForGeneration) {
        payload.status = 'generating';
      } else if (manualWrite) {
        payload.status = 'manual_writing';
      }

      if (isNew) {
        if (content.trim()) payload.content = content;
        const res = await axios.post(`/api/projects/${projectId}/articles`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (submitForGeneration) {
          message.success('已提交，AI生成中');
          navigate(`/article/${res.data.data.id}`, { replace: true });
        } else if (manualWrite) {
          message.success('已创建，请编写正文');
          navigate(`/article/${res.data.data.id}`, { replace: true, state: { openContentEdit: true } });
        } else {
          message.success('草稿已保存');
          navigate(`/article/${res.data.data.id}`, { replace: true });
        }
      } else {
        await axios.put(`/api/projects/${projectId}/articles/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (submitForGeneration) {
          message.success('已提交，AI生成中');
        } else if (manualWrite) {
          message.success('请编写正文');
          setContentMode('edit');
          setTimeout(() => {
            document.getElementById('article-content-section')?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        } else {
          message.success('保存成功');
        }
        fetchArticle();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContent = async () => {
    if (!article) return;
    setContentSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/projects/${projectId}/articles/${id}/content`, { content }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success('正文已保存');
      fetchArticle();
    } catch (err: any) {
      message.error(err.response?.data?.message || '保存正文失败');
    } finally {
      setContentSaving(false);
    }
  };

  const handleReview = async (approved: boolean) => {
    if (!article || !projectId) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/projects/${projectId}/articles/${id}/review`, { approved }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success(approved ? '审核通过，自动发布中' : '审核不通过，已退回草稿');
      fetchArticle();
    } catch (err: any) {
      message.error(err.response?.data?.message || '审核操作失败');
    }
  };

  const handleRegenerate = async () => {
    if (!article || !projectId) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/projects/${projectId}/articles/${id}/regenerate`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success('已重新提交AI生成');
      fetchArticle();
    } catch (err: any) {
      message.error(err.response?.data?.message || '重新生成失败');
    }
  };

  const handleSubmitForReview = async () => {
    if (!article || !projectId) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/projects/${projectId}/articles/${id}/submit-review`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success('已提交审核');
      fetchArticle();
    } catch (err: any) {
      message.error(err.response?.data?.message || '提交审核失败');
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post('/api/upload', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setImageList([...imageList, res.data.data.url]);
    } catch (err: any) {
      message.error(err.response?.data?.message || '上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleAddUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (imageList.includes(url)) { message.warning('该URL已存在'); return; }
    setImageList([...imageList, url]);
    setUrlInput('');
  };

  // Read-only display for non-editable states
  const isSettingsEditable = isNew || canEditSettings();
  const isContentEditable = isNew || canEditContent();

  const statusCfg = article ? (STATUS_CONFIG[article.status] || { label: article.status, color: 'default' }) : null;

  if (loading) {
    return <div className="page-container"><Spin /></div>;
  }

  if (!isNew && !article) {
    return <div className="page-container"><Typography.Text>文章不存在</Typography.Text></div>;
  }

  const settingsTab = (
    <Form form={form} onFinish={(values) => handleSaveSettings(values, writeMode === 'ai')} layout="vertical">
      {error && <Alert type="error" title={error} className="form-alert" showIcon closable onClose={() => setError('')} />}
      <Form.Item name="write_mode" label="编写方式" rules={[{ required: true, message: '请选择编写方式' }]}>
        <Radio.Group
          onChange={(e) => setWriteMode(e.target.value)}
          disabled={!isSettingsEditable}
          optionType="button"
          buttonStyle="solid"
          options={[{ label: '手工编写', value: 'manual' }, { label: 'AI生成', value: 'ai' }]}
        />
      </Form.Item>
      {writeMode === 'manual' && (
      <Form.Item name="title" label="标题" rules={[{ required: true, message: '标题不能为空' }]}>
        <Input placeholder="请输入文章标题" disabled={!isSettingsEditable} />
      </Form.Item>
      )}
      <Form.Item name="article_type" label="文章类型" rules={[{ required: true, message: '请选择文章类型' }]}>
        <Select placeholder="请选择文章类型" disabled={!isSettingsEditable} options={[
          { label: '榜单排名', value: '榜单排名' },
          { label: '方法论讲解', value: '方法论讲解' },
          { label: '案例分析', value: '案例分析' },
          { label: '行业洞察', value: '行业洞察' },
          { label: '对比测评', value: '对比测评' },
          { label: '客户证言', value: '客户证言' },
          { label: 'FAQ问答', value: 'FAQ问答' },
          { label: '实操指南', value: '实操指南' },
        ]} />
      </Form.Item>
      <Form.Item name="keywords" label="关键词" rules={[{ required: true, message: '关键词不能为空' }]}>
        <Select showSearch placeholder="从知识库选择关键词" options={kbKeywords} disabled={!isSettingsEditable} loading={kbLoading} notFoundContent={kbLoading ? '加载中...' : '暂无知识库关键词'} />
      </Form.Item>
      {writeMode === 'ai' && (<>
      <Form.Item label="画像">
        <Segmented
          size="small"
          style={{ marginBottom: 8 }}
          disabled={!isSettingsEditable}
          options={[{ label: '从知识库选择', value: 'select' }, { label: '手动输入', value: 'input' }]}
          value={portraitMode}
          onChange={(val) => { setPortraitMode(val as 'input' | 'select'); form.setFieldValue('portrait', undefined); }}
        />
        {portraitMode === 'select' ? (
          <Form.Item name="portrait" noStyle>
            <Select allowClear showSearch placeholder="从AI知识库选择画像" options={kbPortraits} disabled={!isSettingsEditable} loading={kbLoading} notFoundContent={kbLoading ? '加载中...' : '知识库暂无画像，请先在知识库中添加'} optionFilterProp="label" />
          </Form.Item>
        ) : (
          <Form.Item name="portrait" noStyle>
            <Input.TextArea placeholder="输入画像描述" autoSize={{ minRows: 2, maxRows: 6 }} disabled={!isSettingsEditable} />
          </Form.Item>
        )}
      </Form.Item>
      <Form.Item label="插图">
        {!isSettingsEditable ? (
          // 非编辑模式：只显示已选中的图片
          imageList.length === 0 ? (
            <span style={{ color: 'var(--text-secondary)' }}>暂无插图</span>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {imageList.map((url, idx) => (
                <div key={idx} style={{ width: 80, height: 80, borderRadius: 2, overflow: 'hidden' }}>
                  <Image src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preview={true} />
                </div>
              ))}
            </div>
          )
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <Segmented
                size="small"
                options={[{ label: '从知识库选择', value: 'kb' }, { label: '上传图片', value: 'upload' }, { label: '输入URL', value: 'url' }]}
                value={imageMode}
                onChange={(val) => setImageMode(val as 'upload' | 'url' | 'kb')}
              />
            </div>
            {imageMode === 'kb' && (
              <div style={{ marginTop: 8 }}>
                {kbImages.length === 0 ? (
                  <Spin spinning={kbLoading}>
                    <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {kbLoading ? '加载中...' : '知识库暂无图片，请先在知识库中添加'}
                    </div>
                  </Spin>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {kbImages.map((img) => {
                      const selected = imageList.includes(img.image_url);
                      return (
                        <div key={img.id}
                          onClick={() => {
                            if (!isSettingsEditable) return;
                            if (selected) {
                              setImageList(imageList.filter((u) => u !== img.image_url));
                            } else {
                              setImageList([...imageList, img.image_url]);
                            }
                          }}
                          style={{
                            position: 'relative', width: 80, height: 80,
                            border: `2px solid ${selected ? 'var(--interactive)' : 'var(--border-subtle)'}`,
                            borderRadius: 2, overflow: 'hidden',
                            cursor: isSettingsEditable ? 'pointer' : 'default',
                          }}
                          title={img.title}
                        >
                          <Image src={img.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preview={false} />
                          {selected && (
                            <div style={{
                              position: 'absolute', inset: 0,
                              background: 'rgba(0,0,0,0.25)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              pointerEvents: 'none',
                            }}>
                              <CheckOutlined style={{ color: '#fff', fontSize: 22 }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {imageMode === 'upload' && (
              <div style={{ display: 'block', width: '100%' }}>
              <Upload accept="image/*" showUploadList={false} beforeUpload={(file) => { handleUpload(file); return false; }} disabled={uploading}>
                <div style={{ border: '1px dashed var(--border-subtle)', borderRadius: 2, padding: '16px 0', textAlign: 'center', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <InboxOutlined style={{ fontSize: 24 }} />
                  <span style={{ marginTop: 8 }}>{uploading ? '上传中...' : '点击上传图片'}</span>
                </div>
              </Upload>
              </div>
            )}
            {imageMode === 'url' && (
              <Input.Search placeholder="输入图片URL" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onSearch={handleAddUrl} enterButton={<LinkOutlined />} />
            )}
            {imageList.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {imageList.map((url, idx) => (
                  <div key={idx} style={{ position: 'relative', width: 80, height: 80, borderRadius: 2, overflow: 'hidden', border: '2px solid var(--interactive)' }}>
                    <Image src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preview={true} />
                    <div
                      onClick={() => setImageList(imageList.filter((_, i) => i !== idx))}
                      style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <DeleteOutlined style={{ color: '#fff', fontSize: 10 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Form.Item>
      <Form.Item name="skills" label="选择技能">
        <Select placeholder="选择关联技能" options={skillsOptions} disabled={!isSettingsEditable} allowClear />
      </Form.Item>
      <Form.Item name="llm_model_id" label="选择大模型" rules={[{ required: true, message: '请选择大模型' }]}>
        <Select placeholder="选择大模型" options={llmModelsOptions} disabled={!isSettingsEditable} allowClear />
      </Form.Item>
      </>)}
      <Form.Item name="platforms" label="发布平台" rules={[{ required: true, message: '发布平台不能为空' }]}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, minHeight: 32, padding: '4px 11px', border: '1px solid var(--border-subtle)', borderRadius: 2, cursor: isSettingsEditable ? 'pointer' : 'default' }} onClick={() => { if (isSettingsEditable) openPlatformModal(); }}>
          {(() => {
            const platforms: string[] = form.getFieldValue('platforms') || [];
            if (platforms.length === 0) {
              return <span style={{ color: 'var(--text-secondary)' }}>点击选择发布平台</span>;
            }
            return platforms.map((name) => (
              <Tag key={name} closable={isSettingsEditable} onClose={(e) => {
                e.stopPropagation();
                const current: string[] = form.getFieldValue('platforms') || [];
                form.setFieldValue('platforms', current.filter((p) => p !== name));
                setPlatformOptions(current.filter((p) => p !== name).map((p) => ({ label: p, value: p })));
              }}>{name}</Tag>
            ));
          })()}
        </div>
      </Form.Item>
      {platformModalOpen && (
        <Modal
          title="选择发布平台"
          open={platformModalOpen}
          onOk={confirmPlatformSelection}
          onCancel={() => setPlatformModalOpen(false)}
          width={700}
          okText="确认选择"
          cancelText="取消"
        >
          <div style={{ marginBottom: 12 }}>
            <Input.Search
              placeholder="搜索平台名称或分类"
              value={platformSearch}
              onChange={(e) => setPlatformSearch(e.target.value)}
              onSearch={(val) => fetchPlatformList(1, val, platformSortBy, platformSortOrder)}
              allowClear
              style={{ width: '100%' }}
            />
          </div>
          <Table
            rowKey="name"
            dataSource={platformList}
            loading={platformLoading}
            rowSelection={{
              selectedRowKeys: selectedPlatformKeys,
              onChange: (keys) => setSelectedPlatformKeys(keys as string[]),
            }}
            columns={[
              { title: '平台名称', dataIndex: 'name', width: 200, sorter: true, sortOrder: platformSortBy === 'name' ? (platformSortOrder === 'desc' ? 'descend' : 'ascend') : null },
              { title: '分类', dataIndex: 'taxonomy', width: 120, sorter: true, sortOrder: platformSortBy === 'taxonomy' ? (platformSortOrder === 'desc' ? 'descend' : 'ascend') : null },
              { title: '价格', dataIndex: 'price', width: 80, sorter: true, sortOrder: platformSortBy === 'price' ? (platformSortOrder === 'desc' ? 'descend' : 'ascend') : null, render: (v: number) => v != null ? `¥${v}` : '-' },
              { title: '收录率', dataIndex: 'include_rate', width: 80, sorter: true, sortOrder: platformSortBy === 'include_rate' ? (platformSortOrder === 'desc' ? 'descend' : 'ascend') : null, render: (v: number) => v != null ? `${v}%` : '-' },
              { title: '发布率', dataIndex: 'publish_rate', width: 80, sorter: true, sortOrder: platformSortBy === 'publish_rate' ? (platformSortOrder === 'desc' ? 'descend' : 'ascend') : null, render: (v: number) => v != null ? `${v}%` : '-' },
            ]}
            onChange={(_pagination, _filters, sorter) => {
              const s = (Array.isArray(sorter) ? sorter[0] : sorter) as { field?: string; order?: string | null };
              const sortBy = s.order ? (s.field || '') : '';
              const sortOrder = s.order === 'descend' ? 'desc' : 'asc';
              setPlatformSortBy(sortBy);
              setPlatformSortOrder(sortOrder);
              fetchPlatformList(1, platformSearch, sortBy, sortOrder);
            }}
            pagination={{
              current: platformPage,
              pageSize: 10,
              total: platformTotal,
              showSizeChanger: false,
              showTotal: (total) => `共 ${total} 个平台`,
            }}
            size="small"
            scroll={{ y: 400 }}
          />
          <div style={{ marginTop: 8, color: 'var(--text-secondary)' }}>
            已选择 {selectedPlatformKeys.length} 个平台
          </div>
        </Modal>
      )}
    </Form>
  );

  const contentTab = (
    <div id="article-content-section" data-color-mode="light">
      {article && (
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--color-ink-muted)', fontSize: 13 }}>版本 {(article.version ?? 1.0).toFixed(1)}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isContentEditable && (
              <Segmented
                size="small"
                value={contentMode}
                onChange={(val) => setContentMode(val as 'preview' | 'edit')}
                options={[
                  { icon: <EyeOutlined />, value: 'preview', label: '浏览' },
                  { icon: <EditOutlined />, value: 'edit', label: '编辑' },
                ]}
              />
            )}
            {isContentEditable && contentMode === 'edit' && (
              <Button size="small" onClick={handleSaveContent} loading={contentSaving}>保存正文</Button>
            )}
            {article.status === 'manual_writing' && (
              <Popconfirm title="确认提交审核？" description="提交后将进入审核流程" onConfirm={handleSubmitForReview} okText="确认" cancelText="取消">
                <Button size="small" type="primary">提交审核</Button>
              </Popconfirm>
            )}
          </div>
        </div>
      )}
      {article && article.status === 'pending_review' && (
        <Alert
          type="warning"
          title="该文章待审核"
          showIcon
          style={{ marginBottom: 12 }}
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <Popconfirm title="确认审核通过？" description="通过后将自动进入发布流程" onConfirm={() => handleReview(true)} okText="确认" cancelText="取消">
                <Button size="small" type="primary" icon={<CheckCircleOutlined />}>审核通过</Button>
              </Popconfirm>
              <Popconfirm title="确认审核不通过？" description="不通过后将退回为草稿" onConfirm={() => handleReview(false)} okText="确认" cancelText="取消">
                <Button size="small" danger icon={<CloseCircleOutlined />}>审核不通过</Button>
              </Popconfirm>
            </div>
          }
        />
      )}
      {contentMode === 'edit' ? (
        <MDEditor
          value={content}
          onChange={(val) => setContent(val || '')}
          height={600}
          preview="live"
        />
      ) : (
        <div className="article-content-preview" style={{ minHeight: 300 }}>
          {content ? (
            <MDEditor.Markdown source={content} />
          ) : (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-ink-subtle)' }}>
              暂无正文内容
            </div>
          )}
        </div>
      )}
    </div>
  );

  const collapseItems = [
    { key: 'settings', label: '文章设置', children: settingsTab, forceRender: true },
  ];

  if (isNew && writeMode === 'manual') {
    collapseItems.push({ key: 'content', label: '文章正文', children: contentTab, forceRender: true });
  }

  if (!isNew && article) {
    collapseItems.push({ key: 'content', label: '文章正文', children: contentTab, forceRender: true });
  }

  const defaultActiveKeys = isNew ? ['settings', 'content'] : ['content'];

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/article')} />
        <Typography.Title level={2} style={{ margin: 0 }}>
          {isNew ? '新建文章' : article?.title || '文章详情'}
        </Typography.Title>
        {article && statusCfg && (
          <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
        )}
      </div>
      <Collapse
        defaultActiveKey={defaultActiveKeys}
        items={collapseItems}
        style={{ marginBottom: 16 }}
      />
      {isSettingsEditable && (
        <div className="form-actions">
          {(isNew || article?.status === 'draft') && (
          <Button loading={saving} onClick={() => {
            form.validateFields().then((values) => handleSaveSettings(values, false, writeMode === 'manual')).catch((info) => { if (info.errorFields?.length) message.error(info.errorFields[0].errors[0]); });
          }}>存草稿</Button>
          )}
          {(isNew || article?.status === 'draft') && writeMode !== 'manual' && (
            <Button type="primary" loading={saving} onClick={() => {
              form.validateFields().then((values) => handleSaveSettings(values, true)).catch((info) => { if (info.errorFields?.length) message.error(info.errorFields[0].errors[0]); });
            }}>提交给AI</Button>
          )}
          {(isNew || article?.status === 'draft') && writeMode === 'manual' && (
            <Button type="primary" loading={saving} onClick={() => {
              form.validateFields().then((values) => handleSaveSettings(values, false, true)).catch((info) => { if (info.errorFields?.length) message.error(info.errorFields[0].errors[0]); });
            }}>提交</Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ArticleDetail;
