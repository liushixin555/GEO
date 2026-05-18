import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Alert, Typography, Spin, message, Breadcrumb, Table, Pagination } from 'antd';
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
  const [batchSaving, setBatchSaving] = useState(false);
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

  const handleSave = async (values: { keyword: string }) => {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (isNew) {
        await axios.post(`/api/projects/${projectId}/knowledge/keywords`, values, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success('创建成功');
      } else {
        await axios.put(`/api/projects/${projectId}/knowledge/keywords/${id}`, values, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success('更新成功');
      }
      navigate('/knowledge');
    } catch (err: any) {
      setError(err.response?.data?.message || '保存失败');
    } finally { setSaving(false); }
  };

  const handleExpand = async () => {
    const keyword = form.getFieldValue('keyword');
    if (!keyword || !keyword.trim()) {
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
      setExpandedKeywords(keywords);
      setSelectedSet(new Set(keywords));
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

  const handleBatchSave = async () => {
    const selected = Array.from(selectedSet);
    if (selected.length === 0) {
      message.warning('请至少选择一个关键词');
      return;
    }
    if (!projectId) return;
    setBatchSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/projects/${projectId}/knowledge/keywords/batch`,
        { keywords: selected },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      message.success(`成功添加${selected.length}个关键词`);
      navigate('/knowledge');
    } catch (err: any) {
      message.error(err.response?.data?.message || '批量添加失败');
    } finally { setBatchSaving(false); }
  };

  if (loading) return <div className="page-container"><Spin /></div>;

  const pagedKeywords = expandedKeywords.slice((expandPage - 1) * EXPAND_PAGE_SIZE, expandPage * EXPAND_PAGE_SIZE);

  const expandColumns = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      key: 'keyword',
      render: (text: string) => <Typography.Text>{text}</Typography.Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: { keyword: string }) => (
        <Button
          size="small"
          type={selectedSet.has(record.keyword) ? 'primary' : 'default'}
          onClick={() => toggleSelect(record.keyword)}
        >
          {selectedSet.has(record.keyword) ? '已选择' : '选择'}
        </Button>
      ),
    },
  ];

  const expandData = pagedKeywords.map(kw => ({ key: kw, keyword: kw }));

  return (
    <div className="page-container">
      <div className="page-breadcrumb">
        <Breadcrumb items={[{ title: <a onClick={() => navigate('/knowledge')}>AI知识库</a> }, { title: isNew ? '添加关键词' : '关键词详情' }]} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/knowledge')} />
        <Typography.Title level={2} style={{ margin: 0 }}>{isNew ? '添加关键词' : '关键词详情'}</Typography.Title>
      </div>
      <Form form={form} onFinish={handleSave} layout="vertical" style={{ maxWidth: 600 }}>
        {error && <Alert type="error" message={error} className="form-alert" showIcon closable onClose={() => setError('')} />}
        <Form.Item name="keyword" label="关键词" rules={[{ required: true, message: '关键词不能为空' }]}>
          <Input placeholder="输入关键词" disabled={!canEdit} />
        </Form.Item>
        {isNew && canEdit && (
          <Form.Item>
            <Button icon={<ThunderboltOutlined />} onClick={handleExpand} loading={expanding} disabled={!keywordValue?.trim()}>
              智能扩词
            </Button>
          </Form.Item>
        )}
        {canEdit && (
          <div className="form-actions">
            <Button onClick={() => navigate('/knowledge')}>取消</Button>
            <Button type="primary" htmlType="submit" loading={saving}>保存</Button>
          </div>
        )}
      </Form>

      {isNew && expandedKeywords.length > 0 && (
        <div style={{ marginTop: 24, maxWidth: 600 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              扩词结果（已选 {selectedSet.size}/{expandedKeywords.length}）
            </Typography.Title>
            <Button type="primary" onClick={handleBatchSave} loading={batchSaving} disabled={selectedSet.size === 0}>
              添加选中关键词
            </Button>
          </div>
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
        </div>
      )}
    </div>
  );
};

export default KeywordDetail;
