import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Alert, Typography, Spin, App, Breadcrumb, Table, Pagination, Checkbox } from 'antd';
import { ArrowLeftOutlined, ThunderboltOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useAppContext } from '../context/AppContext';

const EXPAND_PAGE_SIZE = 10;

interface ExpandedWordItem {
  word: string;
  selected: boolean;
}

const KeywordDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { projectId } = useAppContext();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const isNew = id === 'add';
  const [searchParams] = useSearchParams();
  const isEditMode = isNew || searchParams.get('mode') === 'edit';
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [data, setData] = useState<{ keyword: string; created_by: number | null; expanded_words?: { id: number; word: string; selected: boolean }[] } | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form] = Form.useForm();
  const keywordValue = Form.useWatch('keyword', form);

  // Expanded words state: list of { word, selected }
  const [expandedWords, setExpandedWords] = useState<ExpandedWordItem[]>([]);
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
      const kwData = res.data.data;
      setData(kwData);
      form.setFieldValue('keyword', kwData.keyword);
      // Load expanded words from database
      if (kwData.expanded_words && kwData.expanded_words.length > 0) {
        setExpandedWords(kwData.expanded_words.map((w: any) => ({ word: w.word, selected: w.selected })));
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || '加载失败');
    } finally { setLoading(false); }
  }, [id, projectId, isNew]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const canEdit = isEditMode && (user.role === 'sysadmin' || isNew || data?.created_by === user.id);

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
      // Append new words not already in the list, default selected=false
      setExpandedWords(prev => {
        const existing = new Set(prev.map(w => w.word));
        const appended = newKeywords.filter(k => !existing.has(k)).map(k => ({ word: k, selected: false }));
        return [...prev, ...appended];
      });
    } catch (err: any) {
      message.error(err.response?.data?.message || '智能扩词失败');
    } finally { setExpanding(false); }
  };

  const toggleSelect = (word: string) => {
    setExpandedWords(prev => prev.map(w => w.word === word ? { ...w, selected: !w.selected } : w));
  };

  const handleDeleteWord = (word: string) => {
    setExpandedWords(prev => prev.filter(w => w.word !== word));
  };

  // Save: keyword → knowledge_keywords, expanded words → keyword_expanded_words
  const handleSave = async () => {
    const keyword = form.getFieldValue('keyword');
    if (!keyword?.trim()) {
      message.warning('请输入关键词');
      return;
    }
    if (!projectId) return;
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const payload = {
        keyword: keyword.trim(),
        expanded_words: expandedWords.map(w => ({ word: w.word, selected: w.selected })),
      };
      if (isNew) {
        await axios.post(`/api/projects/${projectId}/knowledge/keywords`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success('创建成功');
      } else {
        await axios.put(`/api/projects/${projectId}/knowledge/keywords/${id}`, payload, {
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

  const pagedWords = expandedWords.slice((expandPage - 1) * EXPAND_PAGE_SIZE, expandPage * EXPAND_PAGE_SIZE);

  const columns = [
    {
      title: '关联词',
      dataIndex: 'word',
      key: 'word',
    },
    {
      title: '选择',
      key: 'select',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, record: ExpandedWordItem) => (
        <Checkbox
          checked={record.selected}
          onChange={() => toggleSelect(record.word)}
          disabled={!canEdit}
        />
      ),
    },
    ...(canEdit ? [{
      title: '操作',
      key: 'action',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, record: ExpandedWordItem) => (
        <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => handleDeleteWord(record.word)} />
      ),
    }] : []),
  ];

  const tableData = pagedWords.map(w => ({ key: w.word, ...w }));
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

      {expandedWords.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Table
            columns={columns}
            dataSource={tableData}
            pagination={false}
            size="small"
            bordered
          />
          {expandedWords.length > EXPAND_PAGE_SIZE && (
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <Pagination
                current={expandPage}
                pageSize={EXPAND_PAGE_SIZE}
                total={expandedWords.length}
                showSizeChanger={false}
                onChange={(p) => setExpandPage(p)}
              />
            </div>
          )}
          {canEdit && (
            <div className="form-actions" style={{ marginTop: 16 }}>
              <Button onClick={() => navigate('/knowledge')}>取消</Button>
              <Button type="primary" onClick={handleSave} loading={saving}>
                保存
              </Button>
            </div>
          )}
        </div>
      )}

      {expandedWords.length === 0 && canEdit && (
        <div className="form-actions">
          <Button onClick={() => navigate('/knowledge')}>取消</Button>
          <Button type="primary" onClick={handleSave} loading={saving}>
            保存
          </Button>
        </div>
      )}
    </div>
  );
};

export default KeywordDetail;
