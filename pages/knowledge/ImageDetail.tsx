import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Alert, Typography, Spin, Upload, Image, App, Breadcrumb } from 'antd';
import { ArrowLeftOutlined, InboxOutlined } from '@ant-design/icons';
import apiClient from '../lib/apiClient';
import { getSafeUser } from '../utils/auth';
import { getApiErrorMessage } from '../utils/error';

const ImageDetail: React.FC = () => {
  const { baseId: baseIdStr, id } = useParams<{ baseId: string; id: string }>();
  const navigate = useNavigate();
  const baseId = parseInt(baseIdStr || '', 10);
  const isNew = id === 'add';
  const [searchParams] = useSearchParams();
  const isEditMode = isNew || searchParams.get('mode') === 'edit';
  const { message } = App.useApp();
  const user = getSafeUser();

  const [data, setData] = useState<{ title: string; description: string | null; image_url: string; created_by: number | null } | null>(null);
  const [baseName, setBaseName] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    if (isNew || !baseId || isNaN(baseId)) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/knowledge-bases/${baseId}/images/${id}`);
      setData(res.data.data);
      setImageUrl(res.data.data.image_url);
      form.setFieldsValue({ title: res.data.data.title, description: res.data.data.description || '' });
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '加载失败'));
    } finally { setLoading(false); }
  }, [id, baseId, isNew]);

  useEffect(() => {
    const fetchBaseName = async () => {
      try {
        const res = await apiClient.get(`/knowledge-bases/${baseId}`);
        setBaseName(res.data.data.name);
      } catch { /* ignore */ }
    };
    if (baseId) fetchBaseName();
  }, [baseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Invalid baseId guard
  if (!baseId || isNaN(baseId) || baseId <= 0) {
    return (
      <div className="page-container">
        <Alert type="error" title="无效的知识库ID" showIcon
          action={<Button onClick={() => navigate('/knowledge')}>返回列表</Button>} />
      </div>
    );
  }

  const canEdit = isEditMode && (user.role === 'sysadmin' || isNew || data?.created_by === user.id);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImageUrl(res.data.data.url);
      // 自动填充标题为文件名（去掉扩展名）
      const fileName = file.name.replace(/\.[^.]+$/, '');
      form.setFieldValue('title', form.getFieldValue('title') || fileName);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '上传失败'));
    } finally { setUploading(false); }
    return false;
  };

  const handleSave = async (values: { title: string; description?: string }) => {
    if (!imageUrl) { setError('请上传图片'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = { ...values, image_url: imageUrl };
      if (isNew) {
        await apiClient.post(`/knowledge-bases/${baseId}/images`, payload);
        message.success('创建成功');
      } else {
        await apiClient.put(`/knowledge-bases/${baseId}/images/${id}`, payload);
        message.success('更新成功');
      }
      navigate(`/knowledge/${baseId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || '保存失败');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="page-container"><Spin /></div>;

  return (
    <div className="page-container">
      <div className="page-breadcrumb">
        <Breadcrumb items={[
          { title: <a onClick={() => navigate('/knowledge')}>AI知识库</a> },
          { title: <a onClick={() => navigate(`/knowledge/${baseId}`)}>{baseName || '...'}</a> },
          { title: isNew ? '添加图片' : '图片详情' },
        ]} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/knowledge/${baseId}`)} />
        <Typography.Title level={2} style={{ margin: 0 }}>{isNew ? '添加图片' : '图片详情'}</Typography.Title>
      </div>
      <Form form={form} onFinish={handleSave} layout="vertical" style={{ maxWidth: 600 }}>
        {error && <Alert type="error" title={error} className="form-alert" showIcon closable onClose={() => setError('')} />}
        {/* 新增模式：未上传图片时只显示上传按钮 */}
        {isNew && !imageUrl && (
          <Form.Item label="图片">
            <Upload accept="image/*" showUploadList={false} beforeUpload={(file) => { handleUpload(file); return false; }} disabled={uploading}>
              <div style={{ border: '1px dashed var(--border-subtle)', borderRadius: 2, padding: '16px 0', textAlign: 'center', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <InboxOutlined style={{ fontSize: 24 }} />
                <span style={{ marginTop: 8 }}>{uploading ? '上传中...' : '点击上传图片'}</span>
              </div>
            </Upload>
          </Form.Item>
        )}
        {/* 新增模式：上传成功后显示标题、描述和图片预览；编辑/查看模式：显示所有字段 */}
        {(imageUrl || !isNew) && (
          <>
            <Form.Item name="title" label="图片标题" rules={[{ required: true, message: '标题不能为空' }]}>
              <Input placeholder="输入图片标题" disabled={!canEdit} />
            </Form.Item>
            <Form.Item name="description" label="图片描述">
              <Input.TextArea placeholder="输入图片描述" autoSize={{ minRows: 2 }} disabled={!canEdit} />
            </Form.Item>
            <Form.Item label="图片">
              {canEdit && isNew && (
                <Upload accept="image/*" showUploadList={false} beforeUpload={(file) => { handleUpload(file); return false; }} disabled={uploading}>
                  <div style={{ border: '1px dashed var(--border-subtle)', borderRadius: 2, padding: '16px 0', textAlign: 'center', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <InboxOutlined style={{ fontSize: 24 }} />
                    <span style={{ marginTop: 8 }}>{uploading ? '上传中...' : '重新上传'}</span>
                  </div>
                </Upload>
              )}
              {imageUrl && (
                <div style={{ marginTop: 8 }}>
                  <Image src={imageUrl} style={{ maxWidth: 300, maxHeight: 200, objectFit: 'contain' }} />
                </div>
              )}
            </Form.Item>
          </>
        )}
        {canEdit && imageUrl && (
          <div className="form-actions">
            <Button onClick={() => navigate(`/knowledge/${baseId}`)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={saving}>保存</Button>
          </div>
        )}
      </Form>
    </div>
  );
};

export default ImageDetail;
