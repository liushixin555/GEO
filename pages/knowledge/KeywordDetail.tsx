import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Alert, Typography, Spin, message, Breadcrumb, Table, Pagination, Checkbox } from 'antd';
import { ArrowLeftOutlined, ThunderboltOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useAppContext } from '../context/AppContext';

const EXPAND_PAGE_SIZE = 10;

const KeywordDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { projectId } = useAppContext();
  const navigate = useNavigate();
  const isNew = id === 'add';
  const [searchParams] = useSearchParams();
  const isEditMode = isNew || searchParams.get('mode') === 'edit';
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [data, setData] = useState<{ keyword: string; created_by: number | null } | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form] = Form.useForm();
  const keywordValue = Form.useWatch('keyword', form);

  // Expansion state
  const [expandedKeywords, setExpandedKeywords] = useState<string[]>([]);
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());
  const [expanding, setExpanding] = useState(false);
  const [expandPage, setExpandPage] = useState(1);

  const fetchData = useCallback(async () => {
    if (isNew || !projectId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/projects/${projectId}/knowledge/keywords/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data.data);
      form.setFieldValue('keyword', res.data.data.keyword);
    } catch (err: any) {
      message.error(err.response?.data?.message || '加载失败');
    } finally { setLoading(false); }
  }, [id, projectId, isNew]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const canEdit = isEditMode && (user.role === 'sysadmin' || isNew || data?.created_by === user.id);

  // Edit mode: save single keyword
  const handleUpdateSave = async (values: { keyword: string }) => {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/projects/${projectId}/knowledge/keywords/${id}`, values, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success('更新成功');
      navigate('/knowledge');
    } catch (err: any) {
      setError(err.response?.data?.message || '保存失败');
    } finally { setSaving(false); }
  };

  const handleExpand = async () => {
    const keyword = form.getFieldValue('keyword');
    if (!keyword?.trim()) {
      message.warning('请先输入关键词');
      return;
    }
    if (!projectId) return;
    setExpanding(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`/api/projects/${projectId}/knowledge/keywords/expand`,
        { keyword: keyword.trim() },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const keywords: string[] = res.data.data || [];
      // Prepend original keyword if not in results
      const all = [keyword.trim(), ...keywords.filter(k => k !== keyword.trim())];
      setExpandedKeywords(all);
      setSelectedSet(new Set()); // default: none selected
      setExpandPage(1);
    } catch (err: any) {
      message.error(err.response?.data?.message || '智能扩词失败');
    } finally { setExpanding(false); }
  };

  const toggleSelect = (kw: string) => {
    setSelectedSet(prev => {
      const next = new Set(prev);
      if (next.has(kw)) { next.delete(kw); } else { next.add(kw); }
      return next;
    });
  };

  // Add mode: batch save selected keywords
  const handleBatchSave = async () => {
    const selected = Array.from(selectedSet);
    if (selected.length === 0) {
      message.warning('请至少勾选一个关键词');
      return;
    }
    if (!projectId) return;
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/projects/${projectId}/knowledge/keywords/batch`,
        { keywords: selected },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      message.success(`成功添加${selected.length}个关键词`);
      navigate('/knowledge');
    } catch (err: any) {
      setError(err.response?.data?.message || '保存失败');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="page-container"><Spin /></div>;

  const pagedKeywords = expandedKeywords.slice((expandPage - 1) * EXPAND_PAGE_SIZE, expandPage * EXPAND_PAGE_SIZE);

  const expandColumns = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      key: 'keyword',
    },
    {
      title: '选择',
      key: 'select',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, record: { keyword: string }) => (
        <Checkbox checked={selectedSet.has(record.keyword)} onChange={() => toggleSelect(record.keyword)} />
      ),
    },
  ];

  const expandData = pagedKeywords.map(kw => ({ key: kw, keyword: kw }));

  // Edit mode layout
  if (!isNew) {
    return (
      <div className="page-container">
        <div className="page-breadcrumb">
          <Breadcrumb items={[{ title: <a onClick={() => navigate('/knowledge')}>AI知识库</a> }, { title: '关键词详情' }]} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/knowledge')} />
          <Typography.Title level={2} style={{ margin: 0 }}>关键词详情</Typography.Title>
        </div>
        <Form form={form} onFinish={handleUpdateSave} layout="vertical" style={{ maxWidth: 600 }}>
          {error && <Alert type="error" message={error} className="form-alert" showIcon closable onClose={() => setError('')} />}
          <Form.Item name="keyword" label="关键词" rules={[{ required: true, message: '关键词不能为空' }]}>
            <Input placeholder="输入关键词" disabled={!canEdit} />
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
  }

  // Add mode layout: keyword + expand button in one row, table below, save/cancel below table
  return (
    <div className="page-container">
      <div className="page-breadcrumb">
        <Breadcrumb items={[{ title: <a onClick={() => navigate('/knowledge')}>AI知识库</a> }, { title: '添加关键词' }]} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/knowledge')} />
        <Typography.Title level={2} style={{ margin: 0 }}>添加关键词</Typography.Title>
      </div>
      {error && <Alert type="error" message={error} className="form-alert" showIcon closable onClose={() => setError('')} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
        <Form.Item name="keyword" label="关键词" rules={[{ required: true, message: '关键词不能为空' }]}>
          <Input placeholder="输入关键词" style={{ width: 280 }} />
        </Form.Item>
        <Form.Item>
          <Button icon={<ThunderboltOutlined />} onClick={handleExpand} loading={expanding} disabled={!keywordValue?.trim()}>
            智能扩词
          </Button>
        </Form.Item>
      </Form>

      {expandedKeywords.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Table
            columns={expandColumns}
            dataSource={expandData}
            pagination={false}
            size="small"
            bordered
          />
          {expandedKeywords.length > EXPAND_PAGE_SIZE && (
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <Pagination
                current={expandPage}
                pageSize={EXPAND_PAGE_SIZE}
                total={expandedKeywords.length}
                showSizeChanger={false}
                onChange={(p) => setExpandPage(p)}
              />
            </div>
          )}
          <div className="form-actions" style={{ marginTop: 16 }}>
            <Button onClick={() => navigate('/knowledge')}>取消</Button>
            <Button type="primary" onClick={handleBatchSave} loading={saving} disabled={selectedSet.size === 0}>
              保存
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeywordDetail;
