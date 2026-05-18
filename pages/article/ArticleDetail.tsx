import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Select, Button, Alert, Segmented, Upload, Image, Tabs, Typography, Spin, Tag, message, Popconfirm } from 'antd';
import { ArrowLeftOutlined, InboxOutlined, LinkOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useAppContext } from '../context/AppContext';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  generating: { label: '生成中', color: 'processing' },
  generate_failed: { label: '生成失败', color: 'error' },
  pending_review: { label: '待审核', color: 'warning' },
  publishing: { label: '发布中', color: 'processing' },
  publish_failed: { label: '发布失败', color: 'error' },
  published: { label: '已发布', color: 'success' },
};

const EDITABLE_STATUSES = ['draft', 'generate_failed', 'publish_failed'];

interface ArticleData {
  id: number;
  title: string;
  keywords: string[] | null;
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
  const isNew = id === 'new';
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Settings form state
  const [form] = Form.useForm();
  const [portraitMode, setPortraitMode] = useState<'input' | 'select'>('select');
  const [imageList, setImageList] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imageMode, setImageMode] = useState<'upload' | 'url' | 'kb'>('kb');

  // Skills & LLM Model options
  const [skillsOptions, setSkillsOptions] = useState<{ label: string; value: number }[]>([]);
  const [llmModelsOptions, setLlmModelsOptions] = useState<{ label: string; value: number }[]>([]);
  const [platformOptions, setPlatformOptions] = useState<{ label: string; value: string }[]>([]);

  // Knowledge base options
  const [kbKeywords, setKbKeywords] = useState<{ label: string; value: string }[]>([]);
  const [kbPortraits, setKbPortraits] = useState<{ label: string; value: string }[]>([]);
  const [kbImages, setKbImages] = useState<{ id: number; title: string; image_url: string }[]>([]);
  const [kbLoading, setKbLoading] = useState(false);

  // Content state
  const [content, setContent] = useState('');
  const [contentSaving, setContentSaving] = useState(false);

  // Tab
  const hasContent = article !== null && article.content !== null && article.content !== '';

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
      form.setFieldsValue({
        title: data.title,
        keywords: data.keywords || [],
        portrait: data.portrait || '',
        platforms: data.platforms || [],
        skills: data.skills ?? undefined,
        llm_model_id: data.llm_model_id ?? undefined,
      });
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

  // Load skills and LLM model options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const token = localStorage.getItem('token');
        const [skillsRes, llmRes, platformRes] = await Promise.all([
          axios.get('/api/skills?status=true&pageSize=999', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/llm-models/enabled', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/publishing-platforms', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
        ]);
        setSkillsOptions((skillsRes.data.data?.list || skillsRes.data.data || []).map((s: any) => ({ label: s.name, value: s.id })));
        const models = llmRes.data.data || [];
        setLlmModelsOptions(models.map((m: any) => ({ label: `${m.provider} - ${m.model_name}`, value: m.id })));
        setPlatformOptions((platformRes.data.data || []).map((p: any) => ({ label: p.name, value: p.name })));
        // Default select first LLM model for new articles
        if (isNew && models.length > 0 && !form.getFieldValue('llm_model_id')) {
          form.setFieldValue('llm_model_id', models[0].id);
        }
      } catch {
        // Silently fail — options are optional
      }
    };
    fetchOptions();
  }, []);

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
    if (!EDITABLE_STATUSES.includes(article.status)) return false;
    return user.role === 'sysadmin' || article.created_by === user.id;
  };

  const canEditContent = () => {
    if (!article) return false;
    const allowed = [...EDITABLE_STATUSES, 'pending_review'];
    if (!allowed.includes(article.status)) return false;
    return user.role === 'sysadmin' || article.created_by === user.id;
  };

  const handleSaveSettings = async (values: any, submitForGeneration = false) => {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const payload: any = {
        title: values.title?.trim(),
        keywords: values.keywords?.length ? values.keywords : undefined,
        portrait: values.portrait?.trim() || undefined,
        images: imageList.length ? imageList : undefined,
        platforms: values.platforms?.length ? values.platforms : undefined,
        skills: values.skills || undefined,
        llm_model_id: values.llm_model_id || undefined,
      };

      if (isNew) {
        if (submitForGeneration) {
          payload.status = 'generating';
        }
        const res = await axios.post(`/api/projects/${projectId}/articles`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success(submitForGeneration ? '已提交，AI生成中' : '草稿已保存');
        navigate(`/article/${res.data.data.id}`, { replace: true });
      } else {
        if (submitForGeneration) {
          payload.status = 'generating';
        }
        await axios.put(`/api/projects/${projectId}/articles/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success(submitForGeneration ? '已提交，AI生成中' : '保存成功');
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
    <Form form={form} onFinish={(values) => handleSaveSettings(values, false)} layout="vertical">
      {error && <Alert type="error" message={error} className="form-alert" showIcon closable onClose={() => setError('')} />}
      <Form.Item name="title" label="标题" rules={[{ required: true, message: '标题不能为空' }]}>
        <Input placeholder="输入文章标题" disabled={!isSettingsEditable} />
      </Form.Item>
      <Form.Item name="keywords" label="关键词" rules={[{ required: true, message: '关键词不能为空' }]}>
        <Select mode="tags" placeholder="从知识库选择或输入关键词" options={kbKeywords} disabled={!isSettingsEditable} loading={kbLoading} notFoundContent={kbLoading ? '加载中...' : '暂无知识库关键词，可直接输入'} />
      </Form.Item>
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Segmented
            size="small"
            disabled={!isSettingsEditable}
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
                        position: 'relative', width: 80, height: 80, border: `2px solid ${selected ? 'var(--interactive)' : 'var(--border-subtle)'}`,
                        borderRadius: 2, overflow: 'hidden', cursor: isSettingsEditable ? 'pointer' : 'default',
                        opacity: selected ? 1 : 0.7, transition: 'all 0.2s',
                      }}
                      title={img.title}
                    >
                      <Image src={img.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preview={false} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {isSettingsEditable && imageMode === 'upload' && (
          <div style={{ display: 'block', width: '100%' }}>
          <Upload accept="image/*" showUploadList={false} beforeUpload={(file) => { handleUpload(file); return false; }} disabled={uploading}>
            <div style={{ border: '1px dashed var(--border-subtle)', borderRadius: 2, padding: '16px 0', textAlign: 'center', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <InboxOutlined style={{ fontSize: 24 }} />
              <span style={{ marginTop: 8 }}>{uploading ? '上传中...' : '点击上传图片'}</span>
            </div>
          </Upload>
          </div>
        )}
        {isSettingsEditable && imageMode === 'url' && (
          <Input.Search placeholder="输入图片URL" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onSearch={handleAddUrl} enterButton={<LinkOutlined />} />
        )}
        {imageList.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {imageList.map((url) => (
              <div key={url} style={{ position: 'relative', width: 80, height: 80, border: '1px solid var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                <Image src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preview={false} />
                {isSettingsEditable && (
                  <Button type="text" size="small" danger icon={<DeleteOutlined />}
                    style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(255,255,255,0.8)', padding: '0 4px', minWidth: 'auto' }}
                    onClick={() => setImageList(imageList.filter((u) => u !== url))}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </Form.Item>
      <Form.Item name="skills" label="选择技能">
        <Select placeholder="选择关联技能" options={skillsOptions} disabled={!isSettingsEditable} allowClear />
      </Form.Item>
      <Form.Item name="llm_model_id" label="选择大模型" rules={[{ required: true, message: '请选择大模型' }]}>
        <Select placeholder="选择大模型" options={llmModelsOptions} disabled={!isSettingsEditable} allowClear />
      </Form.Item>
      <Form.Item name="platforms" label="发布平台" rules={[{ required: true, message: '发布平台不能为空' }]}>
        <Select mode="multiple" placeholder="选择发布平台" options={platformOptions} disabled={!isSettingsEditable} allowClear showSearch optionFilterProp="label" />
      </Form.Item>
      {isSettingsEditable && (
        <div className="form-actions">
          <Button onClick={() => navigate('/article')}>取消</Button>
          <Button htmlType="submit" loading={saving}>存草稿</Button>
          <Button type="primary" loading={saving} onClick={() => {
            form.validateFields().then((values) => handleSaveSettings(values, true));
          }}>提交</Button>
        </div>
      )}
    </Form>
  );

  const contentTab = (
    <div>
      {article && (
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>版本 {(article.version ?? 1.0).toFixed(1)}</span>
          {isContentEditable && (
            <Button type="primary" onClick={handleSaveContent} loading={contentSaving}>保存正文</Button>
          )}
        </div>
      )}
      <Input.TextArea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={!isContentEditable}
        autoSize={{ minRows: 20 }}
        placeholder="文章正文（可在此编辑正文内容）"
        style={{ fontSize: 15 }}
      />
    </div>
  );

  const tabItems = [
    { key: 'settings', label: '文章设置', children: settingsTab, forceRender: true },
  ];

  if (!isNew && article && hasContent) {
    tabItems.push({ key: 'content', label: `正文 (v${(article.version ?? 1.0).toFixed(1)})`, children: contentTab });
  }

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
      <Tabs items={tabItems} />
    </div>
  );
};

export default ArticleDetail;
