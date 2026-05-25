import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Card, Typography, Spin, Popconfirm, App, Breadcrumb, Button, Table, Radio, Tag, Space, Empty } from 'antd';
import { ArrowLeftOutlined, SearchOutlined, DeleteOutlined, SwapOutlined, CheckSquareOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '../lib/apiClient';
import { getApiErrorMessage } from '../utils/error';

interface MinedKeywordItem {
  id: number;
  keyword: string;
  selected: boolean;
  created_at: string;
}

const KeywordMine: React.FC = () => {
  const { baseId: baseIdStr } = useParams<{ baseId: string }>();
  const baseId = parseInt(baseIdStr || '0', 10);
  const navigate = useNavigate();
  const { message, modal } = App.useApp();

  const [baseName, setBaseName] = useState('');
  const [minedKeywords, setMinedKeywords] = useState<MinedKeywordItem[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [mining, setMining] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sourceType, setSourceType] = useState<string>('all');

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const res = await apiClient.get(`/knowledge-bases/${baseId}`);
        setBaseName(res.data.data.name);
      } catch { /* ignore */ }
    };
    if (baseId) fetchBase();
  }, [baseId]);

  const fetchMinedKeywords = useCallback(async () => {
    if (!baseId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/knowledge-bases/${baseId}/mined-keywords`);
      const list: MinedKeywordItem[] = res.data.data || [];
      setMinedKeywords(list);
      setSelectedRowKeys(list.filter(k => k.selected).map(k => k.id));
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [baseId]);

  useEffect(() => { fetchMinedKeywords(); }, [fetchMinedKeywords]);

  const handleMine = async () => {
    setMining(true);
    try {
      const res = await apiClient.post(`/knowledge-bases/${baseId}/keywords/mine`,
        { source_type: sourceType },
      );
      const data = res.data.data;
      message.success(`新挖掘出 ${data.mined} 个关键词${data.duplicates > 0 ? `，${data.duplicates} 个已存在` : ''}`);
      setMinedKeywords(data.list);
      setSelectedRowKeys(data.list.filter((k: MinedKeywordItem) => k.selected).map((k: MinedKeywordItem) => k.id));
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '挖掘失败'));
    } finally { setMining(false); }
  };

  const handleSave = async () => {
    const selected = minedKeywords
      .filter(k => selectedRowKeys.includes(k.id))
      .map(k => k.keyword);
    if (selected.length === 0) { message.warning('请选择至少一个关键词'); return; }

    setSaving(true);
    try {
      const res = await apiClient.post(`/knowledge-bases/${baseId}/mined-keywords/save`,
        { keywords: selected },
      );
      message.success(res.data.message || `成功保存 ${selected.length} 个关键词`);
      navigate(`/knowledge/${baseId}`);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '保存失败'));
    } finally { setSaving(false); }
  };

  const handleSelectAll = async () => {
    const allIds = minedKeywords.map(k => k.id);
    setSelectedRowKeys(allIds);
    try {
      await apiClient.put(`/knowledge-bases/${baseId}/mined-keywords/batch-toggle`,
        { ids: allIds, selected: true },
      );
    } catch { /* ignore */ }
  };

  const handleInvertSelection = () => {
    const allIds = new Set(minedKeywords.map(k => k.id));
    const currentSet = new Set(selectedRowKeys);
    setSelectedRowKeys(minedKeywords.filter(k => !currentSet.has(k.id)).map(k => k.id));
  };

  const handleClear = async () => {
    try {
      await apiClient.delete(`/knowledge-bases/${baseId}/mined-keywords`);
      message.success('已清空');
      setMinedKeywords([]);
      setSelectedRowKeys([]);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '清空失败'));
    }
  };

  const handleDeleteSingle = async (id: number) => {
    try {
      await apiClient.delete(`/knowledge-bases/${baseId}/mined-keywords`, {
        data: { ids: [id] },
      });
      setMinedKeywords(prev => prev.filter(k => k.id !== id));
      setSelectedRowKeys(prev => prev.filter(kid => kid !== id));
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '删除失败'));
    }
  };

  const columns: ColumnsType<MinedKeywordItem> = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      key: 'keyword',
      render: (text: string) => <Typography.Text strong>{text}</Typography.Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 60,
      render: (_: unknown, record: MinedKeywordItem) => (
        <Popconfirm title="移除此关键词？" onConfirm={() => handleDeleteSingle(record.id)} okText="移除" cancelText="取消">
          <Button type="text" size="small" icon={<DeleteOutlined />} danger />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-breadcrumb">
        <Breadcrumb items={[
          { title: <a onClick={() => navigate('/knowledge')}>AI知识库</a> },
          { title: <a onClick={() => navigate(`/knowledge/${baseId}`)}>{baseName || '...'}</a> },
          { title: '关键词挖掘' },
        ]} />
      </div>

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <ArrowLeftOutlined onClick={() => navigate(`/knowledge/${baseId}`)} style={{ cursor: 'pointer', fontSize: 16 }} />
        <Typography.Title level={4} style={{ margin: 0 }}>关键词挖掘</Typography.Title>
      </div>

      {/* 控制栏 */}
      <Row gutter={[16, 12]} className="toolbar" style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <Space>
            <span style={{ color: 'var(--color-ink-subtle)', fontSize: 14 }}>挖掘来源：</span>
            <Radio.Group value={sourceType} onChange={(e) => setSourceType(e.target.value)} size="small">
              <Radio.Button value="all">全部</Radio.Button>
              <Radio.Button value="document">文档</Radio.Button>
              <Radio.Button value="portrait">画像</Radio.Button>
              <Radio.Button value="image">图片</Radio.Button>
            </Radio.Group>
          </Space>
        </Col>
        <Col xs={24} sm={12} style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button type="primary" icon={<SearchOutlined />} loading={mining} onClick={handleMine}>
            开始挖掘
          </Button>
          <Popconfirm title="确定清空所有候选关键词？" onConfirm={handleClear} okText="清空" cancelText="取消">
            <Button icon={<DeleteOutlined />}>清空候选</Button>
          </Popconfirm>
        </Col>
      </Row>

      {/* 统计 */}
      {minedKeywords.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Space size={16}>
            <Tag color="blue">已挖掘 {minedKeywords.length} 个关键词</Tag>
            <Tag color="green">已选中 {selectedRowKeys.length} 个</Tag>
          </Space>
        </div>
      )}

      {/* 关键词列表 */}
      <Spin spinning={loading || mining}>
        {minedKeywords.length === 0 && !loading && !mining ? (
          <Card>
            <Empty description='暂无挖掘关键词，点击"开始挖掘"从文档/画像/图片中提取关键词' />
          </Card>
        ) : (
          <Table
            columns={columns}
            dataSource={minedKeywords}
            rowKey="id"
            size="middle"
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys as number[]),
            }}
            pagination={{ pageSize: 20, showSizeChanger: false }}
          />
        )}
      </Spin>

      {/* 底部操作栏 */}
      {minedKeywords.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--color-hairline, #e0e0e0)' }}>
          <Space>
            <Button size="small" icon={<CheckSquareOutlined />} onClick={handleSelectAll}>全选</Button>
            <Button size="small" icon={<SwapOutlined />} onClick={handleInvertSelection}>反选</Button>
          </Space>
          <Button type="primary" size="large" loading={saving} onClick={handleSave}>
            保存选中关键词到知识库 ({selectedRowKeys.length}个)
          </Button>
        </div>
      )}
    </div>
  );
};

export default KeywordMine;
