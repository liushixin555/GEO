import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Alert, Typography, Spin, message, Breadcrumb, Table, Pagination, Checkbox } from 'antd';
import { ArrowLeftOutlined, ThunderboltOutlined, DeleteOutlined } from '@ant-design/icons';
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
  const autoExpanded = useRef(false);

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

  // Auto-expand for view/edit mode after data loads
  useEffect(() => {
    if (isNew || autoExpanded.current || !data?.keyword || !projectId) return;
    autoExpanded.current = true;
    const doExpand = async () => {
      setExpanding(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.post(`/api/projects/${projectId}/knowledge/keywords/expand`,
          { keyword: data.keyword },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const keywords: string[] = res.data.data || [];
        const all = [data.keyword, ...keywords.filter(k => k !== data.keyword)];
        setExpandedKeywords(all);
        setSelectedSet(new Set([data.keyword])); // pre-check the current keyword
        setExpandPage(1);
      } catch {
        // silent fail for auto-expand
      } finally { setExpanding(false); }
    };
    doExpand();
  }, [data, isNew, projectId]);

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
      const newKeywords: string[] = res.data.data || [];
      // Append new words that don't already exist in the list
      setExpandedKeywords(prev => {
        const existing = new Set(prev);
        const appended = newKeywords.filter(k => !existing.has(k));
        return [...prev, ...appended];
      });
      // New words default unchecked
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

  const handleDeleteKeyword = (kw: string) => {
    setExpandedKeywords(prev => prev.filter(k => k !== kw));
    setSelectedSet(prev => { const n = new Set(prev); n.delete(kw); return n; });
  };

  // Save: batch create all selected keywords
  const handleSave = async () => {
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
      if (isNew) {
        await axios.post(`/api/projects/${projectId}/knowledge/keywords/batch`,
          { keywords: selected },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        message.success(`成功添加${selected.length}个关键词`);
      } else {
        // Edit mode: batch create new keywords (the existing one is updated in place by being in the list)
        await axios.post(`/api/projects/${projectId}/knowledge/keywords/batch`,
          { keywords: selected },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        message.success('保存成功');
      }
      navigate('/knowledge');
    } catch (err: any) {
      setError(err.response?.data?.message || '保存失败');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="page-container"><Spin /></div>;

  const pagedKeywords = expandedKeywords.slice((expandPage - 1) * EXPAND_PAGE_SIZE, expandPage * EXPAND_PAGE_SIZE);

  const columns = [
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
        <Checkbox
          checked={selectedSet.has(record.keyword)}
          onChange={() => toggleSelect(record.keyword)}
          disabled={!canEdit}
        />
      ),
    },
    ...(canEdit ? [{
      title: '操作',
      key: 'action',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, record: { keyword: string }) => (
        <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => handleDeleteKeyword(record.keyword)} />
      ),
    }] : []),
  ];

  const tableData = pagedKeywords.map(kw => ({ key: kw, keyword: kw }));

  const pageTitle = isNew ? '添加关键词' : (isEditMode ? '编辑关键词' : '关键词详情');

  return (
    <div className="page-container">
      <div className="page-breadcrumb">
        <Breadcrumb items={[{ title: <a onClick={() => navigate('/knowledge')}>AI知识库</a> }, { title: pageTitle }]} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/knowledge')} />
        <Typography.Title level={2} style={{ margin: 0 }}>{pageTitle}</Typography.Title>
      </div>
      {error && <Alert type="error" message={error} className="form-alert" showIcon closable onClose={() => setError('')} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
        <Form.Item name="keyword" label="关键词" rules={[{ required: true, message: '关键词不能为空' }]}>
          <Input placeholder="输入关键词" style={{ width: 280 }} disabled={!canEdit} />
        </Form.Item>
        <Form.Item>
          <Button icon={<ThunderboltOutlined />} onClick={handleExpand} loading={expanding} disabled={!keywordValue?.trim() || !canEdit}>
            智能扩词
          </Button>
        </Form.Item>
      </Form>

      {expandedKeywords.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Table
            columns={columns}
            dataSource={tableData}
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
          {canEdit && (
            <div className="form-actions" style={{ marginTop: 16 }}>
              <Button onClick={() => navigate('/knowledge')}>取消</Button>
              <Button type="primary" onClick={handleSave} loading={saving} disabled={selectedSet.size === 0}>
                保存
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KeywordDetail;
