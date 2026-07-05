import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Alert, Typography, Spin, App, Breadcrumb } from 'antd';
import { ArrowLeftOutlined, AuditOutlined } from '@ant-design/icons';
import apiClient from '../lib/apiClient';
import { getSafeUser } from '../utils/auth';
import { getApiErrorMessage } from '../utils/error';
import { useEvidenceCards } from './hooks/useEvidenceCards';

const PortraitDetail: React.FC = () => {
  const { baseId: baseIdStr, id } = useParams<{ baseId: string; id: string }>();
  const navigate = useNavigate();
  const baseId = parseInt(baseIdStr || '', 10);
  const isNew = id === 'add';
  const [searchParams] = useSearchParams();
  const isEditMode = isNew || searchParams.get('mode') === 'edit';
  const { message } = App.useApp();
  const { extractEvidenceCardsResult } = useEvidenceCards();
  const user = getSafeUser();

  const [data, setData] = useState<{ title: string; content: string | null; created_by: number | null } | null>(null);
  const [baseName, setBaseName] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    if (isNew || !baseId || isNaN(baseId)) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/knowledge-bases/${baseId}/portraits/${id}`);
      setData(res.data.data);
      form.setFieldsValue({ title: res.data.data.title, content: res.data.data.content || '' });
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
  const canExtractEvidence = !isNew && (user.role === 'sysadmin' || user.role === 'admin');

  const handleSave = async (values: { title: string; content?: string }) => {
    setSaving(true);
    setError('');
    try {
      if (isNew) {
        await apiClient.post(`/knowledge-bases/${baseId}/portraits`, values);
        message.success('创建成功');
      } else {
        await apiClient.put(`/knowledge-bases/${baseId}/portraits/${id}`, values);
        message.success('更新成功');
      }
      navigate(`/knowledge/${baseId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || '保存失败');
    } finally { setSaving(false); }
  };

  const handleExtractEvidence = async () => {
    const sourceId = parseInt(id || '', 10);
    if (!sourceId || Number.isNaN(sourceId)) return;
    if (!data?.content?.trim()) {
      message.warning('当前画像/图片描述不足，无法抽取');
      return;
    }
    setExtracting(true);
    try {
      const result = await extractEvidenceCardsResult({ sourceType: 'portrait', sourceId, save: true });
      if (result.saved.length === 0) {
        message.info('当前画像/图片描述不足，无法抽取');
        return;
      }
      message.success('已生成 draft 证据，请审核后再用于文章生成');
      navigate('/knowledge/evidence-cards?status=draft');
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '抽取证据失败'));
    } finally {
      setExtracting(false);
    }
  };

  if (loading) return <div className="page-container"><Spin /></div>;

  return (
    <div className="page-container">
      <div className="page-breadcrumb">
        <Breadcrumb items={[
          { title: <a onClick={() => navigate('/knowledge')}>AI知识库</a> },
          { title: <a onClick={() => navigate(`/knowledge/${baseId}`)}>{baseName || '...'}</a> },
          { title: isNew ? '添加画像' : '画像详情' },
        ]} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/knowledge/${baseId}`)} />
        <Typography.Title level={2} style={{ margin: 0 }}>{isNew ? '添加画像' : '画像详情'}</Typography.Title>
        {canExtractEvidence && (
          <Button
            icon={<AuditOutlined />}
            loading={extracting}
            onClick={handleExtractEvidence}
            style={{ marginLeft: 'auto' }}
          >
            抽取证据
          </Button>
        )}
      </div>
      <Form form={form} onFinish={handleSave} layout="vertical" style={{ maxWidth: 800 }}>
        {error && <Alert type="error" title={error} className="form-alert" showIcon closable onClose={() => setError('')} />}
        <Form.Item name="title" label="画像标题" rules={[{ required: true, message: '标题不能为空' }]}>
          <Input placeholder="输入画像标题" disabled={!canEdit} />
        </Form.Item>
        <Form.Item name="content" label="画像内容" rules={[{ required: true, message: '画像内容不能为空' }]}>
          <Input.TextArea placeholder="输入画像内容" autoSize={{ minRows: 20 }} disabled={!canEdit} />
        </Form.Item>
        {canEdit && (
          <div className="form-actions">
            <Button onClick={() => navigate(`/knowledge/${baseId}`)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={saving}>保存</Button>
          </div>
        )}
      </Form>
    </div>
  );
};

export default PortraitDetail;
