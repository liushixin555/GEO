import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Alert, Typography, App, Breadcrumb, Table, Tooltip, Empty, Skeleton } from 'antd';
import { ArrowLeftOutlined, ThunderboltOutlined } from '@ant-design/icons';
import apiClient from '../lib/apiClient';
import { getSafeUser } from '../utils/auth';
import { getApiErrorMessage } from '../utils/error';

const EXPAND_PAGE_SIZE = 10;
const MAX_BATCH_SIZE = 500;

interface ExpandedWordItem {
  word: string;
  selected: boolean;
}

const KeywordDetail: React.FC = () => {
  const { baseId: baseIdStr, id } = useParams<{ baseId: string; id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const baseId = parseInt(baseIdStr || '', 10);
  const isNew = id === 'add';
  const [searchParams] = useSearchParams();
  const isEditMode = isNew || searchParams.get('mode') === 'edit';
  const user = getSafeUser();

  const [data, setData] = useState<{ keyword: string; created_by: number | null; expanded_words?: { id: number; word: string; selected: boolean }[] } | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form] = Form.useForm();
  const keywordValue = Form.useWatch('keyword', form);

  const [baseName, setBaseName] = useState('');
  const [expandedWords, setExpandedWords] = useState<ExpandedWordItem[]>([]);
  const [expanding, setExpanding] = useState(false);

  const selectedCount = useMemo(() => expandedWords.filter(w => w.selected).length, [expandedWords]);

  const fetchData = useCallback(async () => {
    if (isNew || !baseId || isNaN(baseId)) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/knowledge-bases/${baseId}/keywords/${id}`);
      const kwData = res.data.data;
      setData(kwData);
      form.setFieldValue('keyword', kwData.keyword);
      if (kwData.expanded_words && kwData.expanded_words.length > 0) {
        setExpandedWords(kwData.expanded_words.map((w: { word: string; selected: boolean }) => ({ word: w.word, selected: w.selected })));
      }
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '加载失败'));
    } finally { setLoading(false); }
  }, [id, baseId, isNew, form, message]);

  useEffect(() => {
    const fetchBaseName = async () => {
      try {
        const res = await apiClient.get(`/knowledge-bases/${baseId}`);
        setBaseName(res.data.data.name);
      } catch (err) {
        console.warn('[KeywordDetail] fetchBaseName failed:', err);
      }
    };
    if (baseId) fetchBaseName();
  }, [baseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!baseId || isNaN(baseId) || baseId <= 0) {
    return (
      <div className="page-container">
        <Alert type="error" message="无效的知识库ID" showIcon
          action={<Button onClick={() => navigate('/knowledge')}>返回列表</Button>} />
      </div>
    );
  }

  const canEdit = isEditMode && (user.role === 'sysadmin' || isNew || data?.created_by === user.id);

  const handleExpand = async () => {
    if (!baseId) return;
    let keyword: string;
    try {
      const values = await form.validateFields(['keyword']);
      keyword = values.keyword?.trim();
    } catch {
      return;
    }
    if (!keyword) {
      message.warning('请先输入种子词');
      return;
    }
    setExpanding(true);
    try {
      const res = await apiClient.post(`/knowledge-bases/${baseId}/keywords/expand`,
        { keyword },
      );
      const newKeywords: string[] = res.data.data || [];
      setExpandedWords(prev => {
        const existing = new Set(prev.map(w => w.word));
        const appended = newKeywords.filter(k => !existing.has(k)).map(k => ({ word: k, selected: false }));
        return [...prev, ...appended];
      });
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '智能扩词失败'));
    } finally { setExpanding(false); }
  };

  const selectAll = () => {
    setExpandedWords(prev => prev.map(w => ({ ...w, selected: true })));
  };

  const deselectAll = () => {
    setExpandedWords(prev => prev.map(w => ({ ...w, selected: false })));
  };

  const handleSave = async () => {
    if (!baseId) return;

    let keyword: string;
    try {
      const values = await form.validateFields();
      keyword = values.keyword?.trim();
    } catch {
      return;
    }

    if (isNew) {
      const selectedWords = expandedWords.filter(w => w.selected).map(w => w.word);
      if (selectedWords.length === 0) {
        message.warning('请至少选择一个关键词');
        return;
      }
      if (selectedWords.length > MAX_BATCH_SIZE) {
        message.warning(`单次最多创建 ${MAX_BATCH_SIZE} 个关键词，请减少选择`);
        return;
      }
      setSaving(true);
      setError('');
      try {
        const res = await apiClient.post(`/knowledge-bases/${baseId}/keywords/batch`,
          { keywords: selectedWords, seed_word: keyword },
        );
        message.success(res.data.message || `成功创建 ${selectedWords.length} 个关键词`);
        navigate(`/knowledge/${baseId}`);
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, '保存失败'));
      } finally { setSaving(false); }
    } else {
      setSaving(true);
      setError('');
      try {
        const payload = {
          keyword,
          expanded_words: expandedWords.map(w => ({ word: w.word, selected: w.selected })),
        };
        await apiClient.put(`/knowledge-bases/${baseId}/keywords/${id}`, payload);
        message.success('更新成功');
        navigate(`/knowledge/${baseId}`);
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, '保存失败'));
      } finally { setSaving(false); }
    }
  };

  if (loading) return (
    <div className="page-container">
      <Skeleton.Input active style={{ width: 200, marginBottom: 16 }} />
      <Skeleton.Input active style={{ width: 280, marginBottom: 16 }} />
      <Skeleton paragraph={{ rows: 5 }} active />
    </div>
  );

  const pageTitle = isNew ? '添加关键词' : (isEditMode ? '编辑关键词' : '关键词详情');

  const columns = [
    { title: '关键词', dataIndex: 'word', key: 'word' },
  ];

  const tableData = expandedWords.map(w => ({ key: w.word, ...w }));

  const rowSelection = {
    selectedRowKeys: expandedWords.filter(w => w.selected).map(w => w.word),
    onChange: (keys: React.Key[]) => {
      const keySet = new Set(keys);
      setExpandedWords(prev => prev.map(w => ({ ...w, selected: keySet.has(w.word) })));
    },
    getCheckboxProps: () => ({ disabled: !canEdit }),
  };

  return (
    <div className="page-container">
      <div className="page-breadcrumb">
        <Breadcrumb items={[
          { title: <a onClick={() => navigate('/knowledge')}>AI知识库</a> },
          { title: <a onClick={() => navigate(`/knowledge/${baseId}`)}>{baseName || '...'}</a> },
          { title: pageTitle },
        ]} />
      </div>
      <div className="keyword-detail-header">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/knowledge/${baseId}`)} />
        <Typography.Title level={2} style={{ margin: 0 }}>{pageTitle}</Typography.Title>
      </div>
      {error && <Alert type="error" message={error} className="form-alert" showIcon closable onClose={() => setError('')} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="inline" className="keyword-detail-form">
        <Form.Item name="keyword" label="种子词" rules={[{ required: true, message: '种子词不能为空' }]}>
          <Input placeholder="输入种子词" className="keyword-detail-input" disabled={!canEdit} />
        </Form.Item>
        <Form.Item>
          <Tooltip title={!keywordValue?.trim() ? '请先输入种子词' : !canEdit ? '无编辑权限' : ''}>
            <Button icon={<ThunderboltOutlined />} onClick={handleExpand} loading={expanding} disabled={!keywordValue?.trim() || !canEdit}>
              智能扩词
            </Button>
          </Tooltip>
        </Form.Item>
      </Form>

      {expandedWords.length > 0 ? (
        <div className="keyword-detail-table-section">
          <div className="keyword-detail-table-toolbar">
            {canEdit && (
              <>
                <Button size="small" onClick={selectAll}>全选</Button>
                <Button size="small" onClick={deselectAll}>取消全选</Button>
              </>
            )}
            <span className="keyword-detail-selected-count">已选 {selectedCount}/{expandedWords.length}</span>
          </div>
          <Table
            columns={columns}
            dataSource={tableData}
            rowSelection={rowSelection}
            pagination={{ pageSize: EXPAND_PAGE_SIZE, showSizeChanger: false, showTotal: (total, range) => `${range[0]}-${range[1]} / 共 ${total} 条` }}
            size="small"
            bordered
          />
          {canEdit && (
            <div className="form-actions" style={{ marginTop: 16 }}>
              <Button onClick={() => navigate(`/knowledge/${baseId}`)}>取消</Button>
              <Tooltip title={isNew && selectedCount === 0 ? '请至少选择一个关键词' : ''}>
                <Button
                  type="primary"
                  onClick={handleSave}
                  loading={saving}
                  disabled={isNew && selectedCount === 0}
                >
                  保存{isNew && selectedCount > 0 ? `（${selectedCount}个）` : ''}
                </Button>
              </Tooltip>
            </div>
          )}
        </div>
      ) : isNew && !expanding ? (
        <Empty description={'输入种子词并点击“智能扩词”生成关键词'} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : !isNew && expandedWords.length === 0 && canEdit ? (
        <div className="form-actions">
          <Button onClick={() => navigate(`/knowledge/${baseId}`)}>取消</Button>
          <Button type="primary" onClick={handleSave} loading={saving}>
            保存
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default KeywordDetail;
