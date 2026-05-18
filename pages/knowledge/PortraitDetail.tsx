import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Alert, Typography, Spin, App, Breadcrumb } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useAppContext } from '../context/AppContext';

const PortraitDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { projectId } = useAppContext();
  const navigate = useNavigate();
  const isNew = id === 'add';
  const [searchParams] = useSearchParams();
  const isEditMode = isNew || searchParams.get('mode') === 'edit';
  const { message } = App.useApp();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [data, setData] = useState<{ title: string; content: string | null; created_by: number | null } | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    if (isNew || !projectId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/projects/${projectId}/knowledge/portraits/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data.data);
      form.setFieldsValue({ title: res.data.data.title, content: res.data.data.content || '' });
    } catch (err: any) {
      message.error(err.response?.data?.message || '加载失败');
    } finally { setLoading(false); }
  }, [id, projectId, isNew]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const canEdit = isEditMode && (user.role === 'sysadmin' || isNew || data?.created_by === user.id);

  const handleSave = async (values: { title: string; content?: string }) => {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (isNew) {
        await axios.post(`/api/projects/${projectId}/knowledge/portraits`, values, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success('创建成功');
      } else {
        await axios.put(`/api/projects/${projectId}/knowledge/portraits/${id}`, values, {
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
        <Breadcrumb items={[{ title: <a onClick={() => navigate('/knowledge')}>AI知识库</a> }, { title: isNew ? '添加画像' : '画像详情' }]} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/knowledge')} />
        <Typography.Title level={2} style={{ margin: 0 }}>{isNew ? '添加画像' : '画像详情'}</Typography.Title>
      </div>
      <Form form={form} onFinish={handleSave} layout="vertical" style={{ maxWidth: 800 }}>
        {error && <Alert type="error" message={error} className="form-alert" showIcon closable onClose={() => setError('')} />}
        <Form.Item name="title" label="画像标题" rules={[{ required: true, message: '标题不能为空' }]}>
          <Input placeholder="输入画像标题" disabled={!canEdit} />
        </Form.Item>
        <Form.Item name="content" label="画像内容" rules={[{ required: true, message: '画像内容不能为空' }]}>
          <Input.TextArea placeholder="输入画像内容" autoSize={{ minRows: 20 }} disabled={!canEdit} />
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

export default PortraitDetail;
