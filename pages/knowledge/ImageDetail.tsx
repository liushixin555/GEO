import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Alert, Typography, Spin, Upload, Image, App, Breadcrumb } from 'antd';
import { ArrowLeftOutlined, InboxOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useAppContext } from '../context/AppContext';

const ImageDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { projectId } = useAppContext();
  const navigate = useNavigate();
  const isNew = id === 'add';
  const [searchParams] = useSearchParams();
  const isEditMode = isNew || searchParams.get('mode') === 'edit';
  const { message } = App.useApp();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [data, setData] = useState<{ title: string; description: string | null; image_url: string; created_by: number | null } | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    if (isNew || !projectId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/projects/${projectId}/knowledge/images/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data.data);
      setImageUrl(res.data.data.image_url);
      form.setFieldsValue({ title: res.data.data.title, description: res.data.data.description || '' });
    } catch (err: any) {
      message.error(err.response?.data?.message || '加载失败');
    } finally { setLoading(false); }
  }, [id, projectId, isNew]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const canEdit = isEditMode && (user.role === 'sysadmin' || isNew || data?.created_by === user.id);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post('/api/upload', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setImageUrl(res.data.data.url);
    } catch (err: any) {
      message.error(err.response?.data?.message || '上传失败');
    } finally { setUploading(false); }
    return false;
  };

  const handleSave = async (values: { title: string; description?: string }) => {
    if (!imageUrl) { setError('请上传图片'); return; }
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const payload = { ...values, image_url: imageUrl };
      if (isNew) {
        await axios.post(`/api/projects/${projectId}/knowledge/images`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success('创建成功');
      } else {
        await axios.put(`/api/projects/${projectId}/knowledge/images/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success('更新成功');
      }
      navigate('/knowledge');
    } catch (err: any) {
      setError(err.response?.data?.message || '保存失败');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="page-container"><Spin /></div>;

  return (
    <div className="page-container">
      <div className="page-breadcrumb">
        <Breadcrumb items={[{ title: <a onClick={() => navigate('/knowledge')}>AI知识库</a> }, { title: isNew ? '添加图片' : '图片详情' }]} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/knowledge')} />
        <Typography.Title level={2} style={{ margin: 0 }}>{isNew ? '添加图片' : '图片详情'}</Typography.Title>
      </div>
      <Form form={form} onFinish={handleSave} layout="vertical" style={{ maxWidth: 600 }}>
        {error && <Alert type="error" message={error} className="form-alert" showIcon closable onClose={() => setError('')} />}
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
                <span style={{ marginTop: 8 }}>{uploading ? '上传中...' : '点击上传图片'}</span>
              </div>
            </Upload>
          )}
          {imageUrl && (
            <div style={{ marginTop: 8 }}>
              <Image src={imageUrl} style={{ maxWidth: 300, maxHeight: 200, objectFit: 'contain' }} />
            </div>
          )}
        </Form.Item>
        {canEdit && (
          <div className="form-actions">
            <Button onClick={() => navigate('/knowledge')}>取消</Button>
            <Button type="primary" htmlType="submit" loading={saving}>保存</Button>
          </div>
        )}
      </Form>
    </div>
  );
};

export default ImageDetail;
